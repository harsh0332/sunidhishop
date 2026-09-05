# Google Sheets Product CMS Guide for Sunidhi.shop

Welcome to the **Sunidhi.shop** Content Management System (CMS). This system enables you to manage, publish, price, and merchandise all creator-curated products directly from a Google Sheet.

The website automatically normalizes, caches, and presents your picks to visitors without touching frontend code.

---

## 🚀 The 60-Second Minimal Product Setup (Fastest)

You can publish a live product to Sunidhi.shop by filling in **just 5 columns**:

| Column | Example | Note |
| :--- | :--- | :--- |
| **`title`** | `Elegant Floral Organza Saree` | Used to generate clean URL slug automatically |
| **`image`** | `https://images.unsplash.com/...` | Valid HTTPS image link |
| **`price`** | `2499` | Number only (no symbols) |
| **`currency`**| `INR` | Defaults to INR if omitted |
| **`affiliateUrl`** | `https://merchant.com/item?aff=123` | Where the user is sent when clicking "Shop Now" |
| **`status`** | `published` | Makes the product live on the site |

*Note:* `id` and `slug` will be **automatically created** from the title if left blank! You don't have to write code or generate IDs manually.

---

## 1. Complete Spreadsheet Setup

1. Create a new Google Spreadsheet (e.g., named **Sunidhi.shop Product Database**).
2. Name the active tab/sheet: `Products` (case-sensitive).
3. Copy the header row from [`sample-products.csv`](./sample-products.csv) or import it using **File → Import → Upload**.

---

## 2. Complete Column Reference

| Column Name | Type | Required? | Accepted Values / Examples | Description |
| :--- | :---: | :---: | :--- | :--- |
| `id` | String | **Yes** | `prod-01`, `zara-slip-dress` | Stable unique product identifier. Never duplicate an ID. |
| `slug` | String | Optional | `satin-bias-cut-slip-midi-dress` | Custom URL slug (`/product/[slug]`). If left blank, automatically generated from `title`. |
| `title` | String | **Yes** | `Satin Bias-Cut Midi Dress in Olive Gold` | Product display title. |
| `brand` | String | **Yes** | `Zara`, `Mango`, `Rhode Skin` | Brand name. |
| `store` | String | **Yes** | `Zara`, `Nykaa Luxe`, `Sephora India` | Retailer store name where the visitor will complete checkout. |
| `category` | String | **Yes** | `fashion`, `beauty`, `accessories`, `footwear`, `lifestyle` | Primary category classification. |
| `subcategory` | String | Optional | `Dresses`, `Skincare`, `Jewelry` | Secondary filter tag. |
| `image` | HTTPS URL | **Yes** | `https://images.unsplash.com/...` | High-res photo URL (recommended 4:5 portrait ratio). |
| `imageAlt` | String | Optional | `Model wearing Olive Satin Dress` | Image accessibility description. Defaults to `title`. |
| `price` | Number | **Yes** | `3590` | Current retailer price (numeric only, no currency symbols). |
| `originalPrice` | Number | Optional | `4990` | Original MRP before discount. Leave blank if not on sale. |
| `currency` | String | Optional | `INR`, `USD` | Defaults to `INR` if left blank. |
| `discount` | String | Optional | `28% OFF`, `SAVE ₹1,400` | Custom discount badge. Auto-calculated if `originalPrice` is provided. |
| `description` | Text | **Yes** | `Flowing midi dress cut on the bias...` | Product details and fabric notes. |
| `creatorNote` | Text | Optional | `Wore this to my cocktail dinner Reel!` | **"Sunidhi's Take"** personal styling recommendation. |
| `badge` | String | Optional | `Seen on Sunidhi`, `Trending`, `Curator Pick` | Highlight badge displayed on the product card. |
| `ctaText` | String | Optional | `Shop at Zara`, `View on Nykaa` | Button label. Defaults to `Shop at [store]`. |
| `affiliateUrl` | HTTPS URL | **Yes** | `https://www.zara.com/in?...&aff_id=...` | Original retailer affiliate link. Clicks will route here. |
| `canonicalUrl` | HTTPS URL | Optional | `https://sunidhi.shop/product/...` | Canonical SEO URL. |
| `source` | String | Optional | `google-sheet` | Data provenance tracking. |
| `status` | String | **Yes** | `published`, `draft`, `archived` | **Publishing workflow** (see details below). |
| `featured` | Boolean | Optional | `TRUE`, `FALSE` | Merchandised in homepage Featured / Latest Picks. |
| `trending` | Boolean | Optional | `TRUE`, `FALSE` | Merchandised under the "Trending Now" filter. |
| `new` | Boolean | Optional | `TRUE`, `FALSE` | Displays the "New" badge on cards. |
| `displayOrder` | Number | Optional | `1`, `2`, `10` | Display priority sorting (lowest numbers appear first). |
| `tags` | List | Optional | `Satin, Evening, Date Night` | Comma-separated search and style tags. |
| `instagramUrl` | HTTPS URL | Optional | `https://instagram.com/p/...` | Related Instagram post URL. |
| `reelUrl` | HTTPS URL | Optional | `https://instagram.com/reel/...` | Related Reel link; enables "Seen on Sunidhi" lookbook. |
| `videoUrl` | HTTPS URL | Optional | `https://...` | Optional short-form video URL. |
| `publishedAt` | Date/ISO | Optional | `2025-05-12T11:00:00Z` | Date published. |
| `updatedAt` | Date/ISO | Optional | `2025-05-12T11:00:00Z` | Date last updated. |

---

## 3. Publishing Workflow: Status Field

The `status` field controls storefront visibility:

* **`published`** (or `active`): Product is live on sunidhi.shop, discoverable via search, and accessible via public URLs.
* **`draft`**: Product is hidden from the website. Use this to stage picks, draft creator notes, or verify prices before launch.
* **`archived`**: Product is hidden from the website because it is out of stock or seasonal. Archived rows are preserved in the Sheet so you can re-publish them anytime.

---

## 4. Merchandising Flags (`featured`, `trending`, `new`)

* `featured = TRUE`: Merchandised on the homepage grid.
* `trending = TRUE`: Included when visitors click the **"Trending Now"** filter pill.
* `new = TRUE`: Highlights the item with a sleek black **"New"** badge.

---

## 5. Connecting Your Google Sheet to the Website

### Option A: Public Link Sharing (Easiest - Zero GCP Setup)
1. In your Google Sheet, click **Share → Anyone with the link → Viewer**.
2. Copy the Sheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`**`/edit`
3. Add to your `.env.local`:
   ```env
   DATA_SOURCE=google-sheets
   GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
   GOOGLE_SHEET_NAME=Products
   ```

### Option B: Google Cloud Service Account (For Private Sheets)
1. Create a Service Account in [Google Cloud Console](https://console.cloud.google.com) with the **Google Sheets API** enabled.
2. Generate and download a JSON key.
3. Share your private Google Sheet with the Service Account email (`Viewer` role).
4. Configure in `.env.local`:
   ```env
   DATA_SOURCE=google-sheets
   GOOGLE_SHEET_ID=your_sheet_id
   GOOGLE_SERVICE_ACCOUNT_EMAIL=sunidhi-cms@project-id.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

---

## 6. Real-Time Cache Invalidation (Instant Updates)

The website caches products server-side for fast loading (configurable via `CACHE_TTL_SECONDS=300`).

To force an instant update without waiting for cache expiry:
```bash
curl -X POST https://sunidhi.shop/api/admin/refresh-products \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```
Or in a browser/webhook:
```
https://sunidhi.shop/api/admin/refresh-products?secret=YOUR_ADMIN_SECRET
```
