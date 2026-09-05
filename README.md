# SUNIDHI.SHOP — Creator Storefront & Operations Architecture

**sunidhi.shop** is a mobile-first, editorial affiliate storefront built for fashion and lifestyle creator **Sunidhi**. It connects Instagram Reels, Looks, and curated edits directly to external merchant product pages via a high-converting affiliate redirect and tracking engine.

---

## 🏛️ Final Architecture & Design Principles

```
GOOGLE SHEET (Source of Truth)
        ↓ (Google Sheets API v4 / Service Account - Server-Side Only)
SERVER-SIDE CONNECTOR & NORMALIZER
        ↓ (Validates, Coerces Currencies, Deduplicates, Formula Shield)
IN-MEMORY CACHE (Concurrency-Locked & TTL Revalidated)
        ↓
┌─────────────────────────────────────────────────────────────┐
│                 SUNIDHI.SHOP FULL-STACK APP                 │
│                                                             │
│   • Homepage (Curated Picks, Trending, Featured)            │
│   • Product Detail Pages (/product/[slug])                  │
│   • Category Pages (/category/[category])                   │
│   • Instagram Reel / Content Pages (/content/[contentId])   │
│   • Campaign Edits (/campaign/[campaignId])                 │
│   • Search Engine & Contextual Merchandising                │
│   • Instant Outbound Redirect Engine (/go/[slug])           │
│   • Telemetry & Analytics Tracker (.analytics/)             │
│   • Protected Admin Portal (/admin/*)                       │
│     - /admin/analytics (Private Business Metrics)           │
│     - /admin/products/health (Catalog Diagnostic Audits)    │
│     - /admin/system (Subsystem Status & Manual Refresh)     │
│     - /admin/preview/product/[slug] (Draft Preview)         │
└─────────────────────────────────────────────────────────────┘
        ↓ [Shop Now Click]
307 TEMPORARY REDIRECT (/go/[slug])
        ↓ [Logs Attribution & Bot Tagging]
EXTERNAL MERCHANT DESTINATION (Zara, Nykaa, Sephora, Myntra, etc.)
```

### 1. Unified Single-Project Deployment
- **ONE Repository**: The entire application lives inside this repository.
- **ONE Full-Stack Framework**: Next.js App Router powers both public SSR/SSG pages and server-side API handlers.
- **ONE Hosting Project**: Deploys as a single application on Vercel, Railway, Node.js, or Docker. No separate backend, no separate frontend, and no auxiliary microservices.
- **ONE Domain**: Canonical URL: `https://sunidhi.shop`.

### 2. Google Sheets as Primary CMS
- The master Google Sheet (`Products` tab) is the operational database.
- Adding or editing a row in the spreadsheet automatically updates the live website upon cache TTL expiry or manual refresh.
- Operators never need to touch application code for day-to-day product catalog management.

### 3. Server-Side Security & Google Credentials
- Google API credentials (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`) execute strictly on the server.
- The browser never imports Google Cloud SDKs or private keys.
- Spreadsheet cell values are treated strictly as inert data; formula injection prefixes (`=`, `+`, `@`) and HTML tags are sanitized before rendering.

### 4. High-Performance Caching & Concurrency Protection
- **In-Memory Cache**: Serves public visitors with sub-5ms product read times without exhausting Google Sheets API rate limits.
- **In-Flight Concurrency Lock**: Multiple simultaneous requests during cold starts or cache revalidation share a single in-flight fetch promise, preventing duplicate Google API calls.
- **Safe Rollback & Empty Sheet Protection**: If Google Sheets temporarily returns 0 rows or encounters network errors, the storefront automatically retains and serves the `lastKnownGoodProducts` catalog with zero visitor downtime.

### 5. Affiliate Redirect & Click Engine (`/go/[slug]`)
- Raw merchant affiliate links are never exposed as direct `<a>` hrefs in public markup.
- Outbound clicks route through `/go/[slug]`, issuing an immediate `HTTP 307 Temporary Redirect` with `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`.
- Non-intrusive click tracking captures timestamp, referrer, device type, UTM attribution, and content context while honestly filtering automated bot crawlers.

### 6. Private Admin Suite (`/admin`)
- **Access Control**: Protected by cryptographic HMAC-SHA256 session tokens with 7-day expiration (`ADMIN_PASSWORD`). Excluded from search engines via `robots.txt` and `sitemap.xml`.
- **Analytics Dashboard (`/admin/analytics`)**: Private creator analytics tracking views, clicks, CTR, top products, merchant distribution, and Reel performance without fabricated revenue figures.
- **Catalog Health Diagnostics (`/admin/products/health`)**: Audits spreadsheet rows for missing required fields, duplicate IDs, colliding slugs, and malformed content references.
- **System Operations (`/admin/system`)**: Displays health status across 5 subsystems with a 1-click manual cache purge button.

---

## 🛠️ Quick Start & Local Development

### Prerequisites
- Node.js 18.17+ or Node.js 20+
- npm or pnpm

### Setup
```bash
# 1. Clone the repository
git clone https://github.com/your-username/sunidhi.shop.git
cd sunidhi.shop

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local

# 4. Start local development server
npm run dev
```

Visit `http://localhost:3000` to browse the storefront.

---

## 📋 Production Environment Variables

Configure these variables on your hosting provider (e.g., Vercel, Railway, Node):

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical domain | `https://sunidhi.shop` |
| `DATA_SOURCE` | Data mode | `google-sheets` |
| `GOOGLE_SHEET_ID` | Master spreadsheet ID | `1BxiMVs0XRA5...` |
| `GOOGLE_SHEET_NAME` | Tab name in spreadsheet | `Products` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account client email | `sunidhi-sheets-sync@...` |
| `GOOGLE_PRIVATE_KEY` | RSA private key from JSON key file | `"-----BEGIN PRIVATE KEY-----\n..."` |
| `CACHE_TTL_SECONDS` | In-memory cache duration (default: 300) | `300` |
| `ADMIN_PASSWORD` | Passphrase for /admin/login | Strong random passphrase |

For complete Google Cloud service account setup, read [`docs/GOOGLE_CLOUD_SETUP.md`](docs/GOOGLE_CLOUD_SETUP.md).
For the spreadsheet column dictionary and publishing rules, read [`docs/OPERATIONS_GUIDE.md`](docs/OPERATIONS_GUIDE.md).
