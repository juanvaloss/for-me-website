# for-me-website

Shopping website for the amazing Renatta: the online store of **forme**, an
activewear brand from Guadalajara (_Your form. Your way._).

- **Home** styled after the Drop 01 catalog (taupe backdrop, serif wordmark), with
  the brand story, the founders, the brand principles and scroll transitions.
- **Catalog** of the 18 Drop 01 styles: real photos per color, live stock per
  color and size, filters and a shopping bag. Colors without stock link to an
  Instagram DM, matching the catalog's "pedidos y disponibilidad por DM".
- **Profile** with secure sign-up / sign-in, shipping details and order history.
- **Checkout** that reserves stock atomically; payment and delivery are then
  arranged by Instagram DM, the way the brand already sells.
- **Django admin** (`/api/admin/`) for the founders to manage stock, prices and
  orders.

## Architecture

Two independently deployable services, tuned to cost as close to $0 as
possible:

```
                         ┌────────────── client stack (client/template.yaml) ─────────────┐
 browser ── HTTPS ──▶ CloudFront ── /*      ──▶ S3 bucket (private, React build)
                         │
                         └──────── /api/* ──▶ Lambda Function URL ──┐
                                   (+ X-Origin-Verify secret)       │
                         ┌────────────── server stack (server/template.yaml) ─────────────┐
                         │  Lambda: Django REST Framework (arm64) ─▶ Aurora Serverless v2   │
                         │  private subnets, no NAT, no internet      PostgreSQL, scales to 0│
                         └──────────────────────────────────────────────────────────────────┘
```

- **client/**: React 19 + TypeScript + Vite, `motion` for animations and `lenis`
  for smooth scrolling. Served from S3 through CloudFront.
- **server/**: Django 5.2 LTS + Django REST Framework, following the
  _fat models, thin views_ convention. Runs on AWS Lambda through `apig-wsgi`.
  - `accounts`: custom `User` (email login + shipping details).
  - `store`: catalog (category → product → color → size with stock) and orders.
    The business rules live here (`ProductVariant.reserve`, `Order.place`,
    `Order.cancel`).
  - `api`: endpoints only (serializers, viewsets, permissions, error format).
- CloudFront serves the site and the API from one domain, so the session and
  CSRF cookies are first-party and no CORS is needed.

### Security

- Django sessions in `HttpOnly`, `Secure`, `SameSite=Lax` cookies, and CSRF
  checks on every write, including anonymous login and registration.
- Argon2 password hashing and Django's password validators.
- Login and registration are rate limited per client IP. CloudFront supplies
  the IP, so it can't be spoofed.
- The Lambda URL rejects any request without CloudFront's secret header. The
  database sits in private subnets with no route to the internet, and its
  storage is encrypted.
- CloudFront's managed security headers (HSTS, `nosniff`, frame options…).

## Local development

Requirements: Python 3.12 and Node 22.

```bash
# API → http://127.0.0.1:8000
cd server
python -m venv .venv && source .venv/Scripts/activate   # Windows Git Bash
pip install -r dev-requirements.txt
python manage.py migrate
python manage.py createcachetable
python manage.py seed_catalog                 # stock count from 12-oct-2026
python manage.py create_staff_user --email you@example.com --password '...'
python manage.py runserver

# Storefront → http://localhost:5173 (proxies /api to the API)
cd client
npm install
npm run dev
```

Checks to run before committing:

```bash
cd server && black . && flake8 && python -m pytest
cd client && npm run lint && npm run build
```

## Deploying to AWS

Requirements: AWS CLI (configured), SAM CLI and Docker (SAM builds the Lambda
package inside the Lambda build image).

```bash
SEED_CATALOG=1 ./scripts/deploy.sh   # first deploy: also loads the catalog
./scripts/deploy.sh                  # later deploys
```

The script creates the secrets once (`.deploy-secrets`, gitignored), deploys
the API stack, runs the migrations, deploys the storefront stack and uploads the
build. Then create the admin user:

```bash
aws lambda invoke --function-name <ManageFunctionName output> \
  --cli-binary-format raw-in-base64-out \
  --payload '{"command": ["create_staff_user", "--email", "you@example.com", "--password", "..."]}' out.json
```

`seed_catalog` overwrites stock with the JSON values, so only run it on the
first deploy. After that, manage stock in the admin.

### Estimated monthly cost (us-east-1 list prices)

| Service | What it costs |
| --- | --- |
| CloudFront + CloudFront Functions | $0 within the always-free tier (1 TB, 10M requests, 2M function calls) |
| S3 | under $0.01 (the build, photos included, is ~3 MB) |
| Lambda | $0 within the always-free tier (1M requests, 400k GB-s) |
| Aurora Serverless v2 | $0 while paused; ~$0.06/h while awake (0.5 ACU) + $0.10/GB-month storage |
| CloudWatch Logs | cents (14-day retention) |

The design leaves out NAT gateways, API Gateway, load balancers and Secrets
Manager, which are usually the hidden monthly costs. A small store should land
around **$1–5 USD/month**, mostly the hours the database is awake.

Trade-off: after 5 idle minutes the database pauses, and its first request
waits about 15 s while it resumes. The storefront pings `/api/health/` on load
so this mostly happens while the visitor reads the home page. If that delay
matters more than cost, set `MinCapacity: 0.5` in `server/template.yaml`
(≈ $44/month, always awake).

## API

All responses are JSON. Errors share one shape, `{"detail", "code", "fields"?, "meta"?}`;
the storefront translates `code` into Spanish.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health/` | public | Health check, wakes the database |
| GET | `/api/v1/auth/session/` | public | Current user (or `null`) + CSRF cookie |
| POST | `/api/v1/auth/register/` | public, throttled | Create account and start a session |
| POST | `/api/v1/auth/login/` | public, throttled | Start a session |
| POST | `/api/v1/auth/logout/` | session | End the session |
| GET, PATCH | `/api/v1/me/` | session | Profile and shipping details |
| GET | `/api/v1/categories/` | public | Categories with product and stock counts |
| GET | `/api/v1/products/?category=<slug>` | public | Products with their colors and stock per size |
| GET | `/api/v1/products/<slug>/` | public | One product |
| GET, POST | `/api/v1/orders/` | session | Own orders / place an order (409 `out_of_stock`) |
| GET | `/api/v1/orders/<id>/` | session | One own order |
| POST | `/api/v1/orders/<id>/cancel/` | session | Cancel a pending or confirmed order and restock |

## Catalog data

- `server/store/data/catalog.json` holds Drop 01: styles, prices, sizes and
  features from the PDF catalog, plus the stock count of 12-oct-2026.
  `seed_catalog` loads it.
- Product photos live in `client/public/products/` and ship with the
  storefront. A color's `photo` is either that path (`/products/….webp`) or a
  full `https://` URL. A color without a photo shows a drawn silhouette in its
  color.
- After launch, the founders keep stock up to date in the admin: **Product
  variants** lists every product, color and size in one editable table.

## To confirm with the founders

- **Style names** are descriptive placeholders (Set Scoop, Leggings Sculpt,
  Top halter V…), because the PDF only names categories.
- **Stock mapping**, where the stock sheet and the PDF don't line up exactly:
  - "Black halter" (6) is on *Top halter* and "Negro halter (otro modelo)" (1)
    is on *Top halter V*.
  - Biker shorts Black/Espresso are on *Biker shorts con bolsillos*.
  - "Racerback pink" (4) has no photo in the PDF.
- **Copy**: the founders' quotes and principles come from the brand's posts.
  The remaining text is a draft for them to review.
