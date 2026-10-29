#!/usr/bin/env bash
# Deploys both services: the API stack (server/) and the storefront stack (client/).
# Requires the AWS CLI, the SAM CLI and Docker. Safe to re-run for updates.
#
#   ./scripts/deploy.sh                  # deploy / update everything
#   SEED_CATALOG=1 ./scripts/deploy.sh   # also load server/store/data/catalog.json
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
API_STACK="${API_STACK:-forme-api}"
WEB_STACK="${WEB_STACK:-forme-web}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_FILE="$ROOT/.deploy-secrets"

random_token() {
  python -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range($1)))"
}

if [ ! -f "$SECRETS_FILE" ]; then
  {
    echo "SECRET_KEY=$(random_token 64)"
    echo "DATABASE_PASSWORD=$(random_token 32)"
    echo "ORIGIN_VERIFY_SECRET=$(random_token 48)"
  } > "$SECRETS_FILE"
  echo "Generated $SECRETS_FILE (gitignored). Keep a safe copy of it."
fi
# shellcheck disable=SC1090
source "$SECRETS_FILE"

stack_output() {
  aws cloudformation describe-stacks --region "$REGION" --stack-name "$1" \
    --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" --output text 2>/dev/null || true
}

deploy_api() {
  (cd "$ROOT/server" && sam deploy \
    --region "$REGION" \
    --stack-name "$API_STACK" \
    --resolve-s3 \
    --capabilities CAPABILITY_IAM \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset \
    --parameter-overrides \
      SecretKey="$SECRET_KEY" \
      DatabasePassword="$DATABASE_PASSWORD" \
      OriginVerifySecret="$ORIGIN_VERIFY_SECRET" \
      SiteUrl="$1")
}

manage() {
  local result
  result="$(mktemp)"
  aws lambda invoke --region "$REGION" \
    --function-name "$(stack_output "$API_STACK" ManageFunctionName)" \
    --cli-binary-format raw-in-base64-out \
    --payload "{\"command\": $1}" "$result" > /dev/null
  cat "$result" && echo && rm -f "$result"
}

echo "==> Building the API"
(cd "$ROOT/server" && sam build --use-container)

site_url="$(stack_output "$WEB_STACK" SiteUrl)"
echo "==> Deploying the API stack"
deploy_api "${site_url:-http://localhost:5173}"

echo "==> Migrating the database"
manage '["migrate", "--noinput"]'
manage '["createcachetable"]'
if [ "${SEED_CATALOG:-0}" = "1" ]; then
  manage '["seed_catalog"]'
fi

echo "==> Deploying the storefront stack"
aws cloudformation deploy --region "$REGION" \
  --stack-name "$WEB_STACK" \
  --template-file "$ROOT/client/template.yaml" \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    ApiDomain="$(stack_output "$API_STACK" ApiDomain)" \
    OriginVerifySecret="$ORIGIN_VERIFY_SECRET"

new_site_url="$(stack_output "$WEB_STACK" SiteUrl)"
if [ "$new_site_url" != "$site_url" ]; then
  echo "==> Trusting $new_site_url for CSRF on the API"
  deploy_api "$new_site_url"
fi

echo "==> Uploading the storefront"
(cd "$ROOT/client" && npm ci && npm run build)
bucket="$(stack_output "$WEB_STACK" BucketName)"
aws s3 sync "$ROOT/client/dist/assets" "s3://$bucket/assets" --delete \
  --cache-control "public,max-age=31536000,immutable"
# Product photos keep their names between deploys, so they get a short cache
# and are invalidated below instead of being cached forever like hashed assets.
aws s3 sync "$ROOT/client/dist" "s3://$bucket" --delete \
  --exclude "assets/*" --exclude index.html --cache-control "public,max-age=86400"
aws s3 cp "$ROOT/client/dist/index.html" "s3://$bucket/index.html" \
  --cache-control "no-cache"
aws cloudfront create-invalidation \
  --distribution-id "$(stack_output "$WEB_STACK" DistributionId)" \
  --paths "/index.html" "/products/*" > /dev/null

echo "Done: $new_site_url"
