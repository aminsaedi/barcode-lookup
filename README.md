# Barcode Lookup PWA

A Progressive Web App that scans 1D grocery barcodes and looks up product descriptions in **English** and **Persian (فارسی / RTL)**.

Hosted entirely on **Cloudflare** — Pages for the frontend and Workers/Functions for the API, with KV as the product database.

## Live Demo

- **Production:** https://barcode-lookup.pages.dev
- **GitHub:** https://github.com/aminsaedi/barcode-lookup

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| PWA | vite-plugin-pwa + Workbox |
| Barcode scanning | @zxing/browser (ZXing library) |
| i18n | react-i18next (EN + FA/RTL) |
| Backend | Cloudflare Pages Functions |
| Database | Cloudflare KV |
| CI/CD | GitHub Actions |

## Architecture

```
User browser
    ↓  camera stream
ZXing barcode detection
    ↓  barcode string
GET /api/lookup?barcode=XXX  (Cloudflare Pages Function)
    ↓  KV lookup
{ found: true, product: { en: "...", fa: "..." } }
    ↓
Product card (EN or FA based on language preference)
```

## Local Development

```bash
npm install
npm run generate-icons   # generate PWA icons
npm run dev              # Vite dev server (no CF Pages Functions)
```

For local development with Pages Functions:
```bash
npm run build
npm run pages:dev        # wrangler pages dev
```

## Seeding the Product Database

```bash
# Set env vars
export CLOUDFLARE_API_TOKEN=<your-token>
export CLOUDFLARE_ACCOUNT_ID=f4ea4d079888a757ee8b902fd1f965f6
export KV_NAMESPACE_ID=d0c199b97016407490e62cb9bc40c495

node scripts/seed.mjs
```

The seed data is in `data/products.csv` with columns: `barcode`, `name_en`, `name_fa`.

## CI/CD Setup

### GitHub Secrets Required

Go to **GitHub → Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `CF_API_TOKEN` | Cloudflare API token with **Pages:Edit** + **Workers KV Storage:Edit** permissions |
| `CF_ACCOUNT_ID` | `f4ea4d079888a757ee8b902fd1f965f6` |
| `KV_NAMESPACE_ID` | `d0c199b97016407490e62cb9bc40c495` |

### Creating a Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **Create Token**
3. Use **"Edit Cloudflare Workers"** template
4. Add **Cloudflare Pages:Edit** permission
5. Set **Account Resources** to your account
6. Click **Continue to summary** → **Create Token**
7. Copy the token and set it as the `CF_API_TOKEN` GitHub secret

### Workflows

- **CI** (`ci.yml`): Runs on PRs and pushes to `main` — type-check, unit tests, build, E2E tests
- **Deploy** (`deploy.yml`): Runs on push to `main` — builds and deploys to Cloudflare Pages, seeds KV when `data/products.csv` changes

### Force Re-seed

Add `[seed]` to your commit message to force a KV re-seed on next deploy.

## Adding Products

Edit `data/products.csv`:
```csv
barcode,name_en,name_fa
1234567890123,My Product,محصول من
```

Then commit with `[seed]` in the message:
```bash
git commit -am "chore: add new products [seed]"
```

## Testing

```bash
npm run test:unit          # Vitest unit tests (22 tests)
npm run test:e2e           # Playwright E2E tests
npx playwright test --ui   # Playwright interactive mode
```

## Supported Barcode Formats

- EAN-13 (standard grocery)
- EAN-8
- UPC-A
- UPC-E
- Code 128
- Code 39
- And all formats supported by ZXing
