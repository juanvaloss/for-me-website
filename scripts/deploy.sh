#!/usr/bin/env bash
# Deploys both services: the API stack (server/) and the storefront stack (client/).
# GitHub Actions runs it on every push to main (.github/workflows/ci-cd.yml); it
# also runs locally with the AWS CLI, the SAM CLI and Docker. Safe to re-run.
#
#   ./scripts/deploy.sh                  # deploy / update everything
#   SEED_CATALOG=1 ./scripts/deploy.sh   # also load server/store/data/catalog.json
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
API_STACK="${API_STACK:-forme-api}"
WEB_STACK="${WEB_STACK:-forme-web}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

random_token() {
  python -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range($1)))"
}

# Secrets live in SSM Parameter Store as SecureStrings (free). The first deploy
# creates them, so every later deploy, local or from GitHub, reuses the same ones.
secret() {
  local name="/$API_STACK/$1" value
  value="$(aws ssm get-parameter --region "$REGION" --name "$name" --with-decryption \
    --query Parameter.Value --output text 2>/dev/null || true)"
  if [ -z "$value" ]; then
    value="$(random_token "$2")"
    # Fails if the parameter exists after all, so a secret is never replaced.
    aws ssm put-parameter --region "$REGION" --name "$name" --type SecureString \
      --value "$value" > /dev/null || return 1
  fi
  printf '%s' "$value"
}

SECRET_KEY="$(secret secret-key 64)"
DATABASE_PASSWORD="$(secret database-password 32)"
ORIGIN_VERIFY_SECRET="$(secret origin-verify-secret 48)"
if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  # Workflow logs of a public repository are public too.
  for value in "$SECRET_KEY" "$DATABASE_PASSWORD" "$ORIGIN_VERIFY_SECRET"; do
    echo "::add-mask::$value"
  done
fi

stack_output() {
  aws cloudformation describe-stacks --region "$REGION" --stack-name "$1" \
    --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" --output text 2>/dev/null || true
}

# A stack whose first creation failed sits in ROLLBACK_COMPLETE with no resources
# and can't be updated, so it is deleted to let the next deploy start clean.
clear_failed_stack() {
  local status
  status="$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$1" \
    --query "Stacks[0].StackStatus" --output text 2>/dev/null || true)"
  if [ "$status" = "ROLLBACK_COMPLETE" ]; then
    echo "==> Deleting $1: its first creation failed and left it empty"
    aws cloudformation delete-stack --region "$REGION" --stack-name "$1"
    aws cloudformation wait stack-delete-complete --region "$REGION" --stack-name "$1"
  fi
}

deploy_api() {
  clear_failed_stack "$API_STACK"
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

# Prints the function's response and fails the deploy if the function failed.
# The long read timeout keeps the CLI from retrying (and re-running a migration)
# while a paused database resumes.
invoke() {
  local result error
  result="$(mktemp)"
  error="$(aws lambda invoke --region "$REGION" --function-name "$1" \
    --cli-binary-format raw-in-base64-out --cli-read-timeout 310 \
    --payload "$2" --query FunctionError --output text "$result")"
  cat "$result" && echo && rm -f "$result"
  if [ -n "$error" ] && [ "$error" != "None" ]; then
    echo "$1 failed ($error)" >&2
    return 1
  fi
}

manage() {
  invoke "$(stack_output "$API_STACK" ManageFunctionName)" "{\"command\": $1}"
}

echo "==> Building the API"
if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  # The runner has make, and the Makefile fetches arm64 wheels, so no Docker needed.
  (cd "$ROOT/server" && sam build)
else
  (cd "$ROOT/server" && sam build --use-container)
fi

site_url="$(stack_output "$WEB_STACK" SiteUrl)"
echo "==> Deploying the API stack"
deploy_api "${site_url:-http://localhost:5173}"

echo "==> Migrating the database"
manage '["migrate", "--noinput"]'
if [ "${SEED_CATALOG:-0}" = "1" ]; then
  manage '["seed_catalog"]'
fi

echo "==> Deploying the storefront stack"
clear_failed_stack "$WEB_STACK"
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
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Deployed"
    echo "- Storefront: $new_site_url"
    echo "- Admin: $new_site_url/api/admin/"
  } >> "$GITHUB_STEP_SUMMARY"
fi
