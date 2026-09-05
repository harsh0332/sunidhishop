# SUNIDHI.SHOP — Operations & Merchandising Guide

This manual explains how to manage, publish, and maintain products on **sunidhi.shop** without touching any application code.

---

## 1. Daily Core Workflow

```
Find/Curate Product
        ↓
Add / Edit row in Google Sheets ("Products" tab)
        ↓
Set Status to "published" or "active"
        ↓
Storefront automatically updates on cache TTL (or manual refresh)
        ↓
Share link in Instagram Reel / Story / Bio (?content=reel_xxx)
        ↓
Shopper views item → clicks "Shop at [Merchant]"
        ↓
Instant 307 Outbound Redirect to Affiliate Destination
        ↓
Tracked in Internal Analytics (/admin/analytics)
```

---

## 2. Google Sheets Master Columns

Use the master sheet named **`Products`**. Column headers are case-insensitive.

| Column | Required? | Example | Description |
|---|---|---|---|
| `id` | Recommended | `prod-zara-slip-dress` | Unique stable ID. If blank, auto-generated from slug. |
| `slug` | Recommended | `satin-bias-cut-slip-midi-dress` | Public URL slug (`/product/[slug]`). Auto-generated from title if omitted. |
| `title` | **Mandatory** | `Satin Bias-Cut Midi Dress in Olive Gold` | Product display name. |
| `brand` | Recommended | `Zara` | Brand name. Hidden gracefully if blank. |
| `store` | Recommended | `Zara` | Destination merchant store. |
| `category` | **Mandatory** | `fashion` | One of: `fashion`, `beauty`, `accessories`, `footwear`, `lifestyle`. |
| `subcategory` | Optional | `Dresses` | Subcategory filter. |
| `image` | **Mandatory** | `https://images.unsplash.com/...` | High-resolution image URL (must start with `http://` or `https://`). |
| `imageAlt` | Optional | `Olive Gold Satin Dress` | Accessible image description. Defaults to title. |
| `price` | **Mandatory** | `3590` | Current price in INR (accepts `₹3,590`, `3,590`, or `3590`). |
| `originalPrice` | Optional | `4990` | Original MRP before discount (used for discount calculations). |
| `currency` | Optional | `INR` | Defaults to `INR`. |
| `discount` | Optional | `28% OFF` | Explicit discount badge. If blank and `originalPrice > price`, calculated automatically. |
| `description` | Optional | `Flowing midi dress cut on the bias...` | Editorial product description. |
| `creatorNote` | **Recommended** | `Wore this to my Mumbai brunch meet!` | Sunidhi's personal endorsement ("Sunidhi's Take"). Increases conversion trust. |
| `badge` | Optional | `Seen on Sunidhi` | Visual badge pill (e.g. `Seen on Sunidhi`, `Best Value`, `Trending`). |
| `ctaText` | Optional | `Shop at Zara` | Custom button text. Defaults to `Shop at [Store]`. |
| `affiliateUrl` | **Mandatory** | `https://zara.com/in?aff_id=...` | Outbound affiliate destination URL. |
| `status` | **Mandatory** | `published` | Product status: `published` / `active`, `draft`, or `archived`. |
| `featured` | Optional | `TRUE` | `TRUE` displays product in curated featured collections. |
| `trending` | Optional | `TRUE` | `TRUE` marks product with trending indicator. |
| `new` | Optional | `FALSE` | `TRUE` marks product with "New Drop" label. |
| `displayOrder` | Optional | `10` | Numeric rank for sorting (lower numbers appear first). |
| `contentId` | Optional | `reel_027` | Links product to specific Instagram Reel (e.g. `reel_027`). |
| `contentType` | Optional | `reel` | Content type: `reel`, `post`, `story`, `campaign`. Defaults to `reel`. |
| `campaignId` | Optional | `festive_2026` | Associates product with a curated campaign collection. |
| `publishAt` | Optional | `2026-10-01T00:00:00Z` | Scheduled future drop. Product stays hidden until this date/time. |
| `unpublishAt` | Optional | `2026-10-15T23:59:59Z` | Scheduled expiration date. Product automatically hides after this timestamp. |
| `internalNote` | Optional | `Sourced from PR gifting kit; stock low` | **Private operator note**. Strictly visible only to admins in diagnostics/preview. |

---

## 3. Product Status & Visibility Rules

1. **`published` or `active`**:
   - Live on the public storefront, categories, search, and sitemap.
   - Accessible via `/product/[slug]` and `/go/[slug]`.
2. **`draft`**:
   - Hidden from public storefront, search results, and robots/sitemaps.
   - Previewable **only** by authenticated administrators at `/admin/preview/product/[slug]`.
3. **`archived`**:
   - Removed from public display.
   - Outbound `/go/[slug]` routes gracefully to `/product-unavailable` with alternate recommendations.

---

## 4. Scheduled Publishing (`publishAt` / `unpublishAt`)

- To schedule a future collection drop without staying up at midnight:
  1. Set `status` to `published`.
  2. Set `publishAt` to the launch timestamp (e.g. `2026-10-15T18:00:00Z`).
  3. The website will automatically hide the item until that exact time arrives.
- To set a time-limited festive special:
  1. Set `unpublishAt` (e.g. `2026-10-25T23:59:59Z`).
  2. The item will automatically disappear when the time expires.

---

## 5. Connecting Products to Instagram Content

When posting a Reel or Story:
1. In Google Sheets, set `contentId` (e.g. `reel_027`).
2. Add the same `contentId` to all outfit items shown in that Reel.
3. In your Instagram link in bio, use:
   `https://sunidhi.shop/?content=reel_027`
   or direct lookbook route:
   `https://sunidhi.shop/content/reel_027`
4. Visitors clicking the link will see the contextual Reel banner with all matching items prioritized at the very top!

---

## 6. How to Diagnose Bad Product Rows (`/admin/products/health`)

If a product does not appear on the website:
1. Visit **`/admin/products/health`**.
2. Filter by **Invalid** or **Warnings**.
3. Common issues detected:
   - **Missing image**: Check that URL starts with `https://`.
   - **Missing price**: Ensure price is a positive number.
   - **Missing affiliateUrl**: Ensure valid destination link is provided.
   - **Duplicate ID/Slug**: Ensure each product has a unique identifier.

---

## 7. How to Force an Instant Catalog Refresh

- Changes in Google Sheets update automatically based on cache TTL (5 minutes by default).
- For immediate publishing:
  1. Visit **`/admin/system`**.
  2. Click **"Refresh Product Cache"**.
  3. The cache invalidates immediately and re-syncs the fresh catalog from Google Sheets.

---

## 8. Safe Rollback & Empty Sheet Protection

- **Accidental Sheet Clear**: If someone accidentally deletes all rows or Google Sheets returns an empty response, **sunidhi.shop will NOT crash or wipe the live store**.
- The system automatically detects the anomaly, logs a `fallback_activated` alert in `/admin/system`, and **retains the last-known-good catalog** until the sheet is restored.

---

## 9. Admin Suite Quick Links

All admin tools require authentication via your admin password:
- **Analytics Dashboard**: `https://sunidhi.shop/admin/analytics`
- **Product Health Diagnostics**: `https://sunidhi.shop/admin/products/health`
- **System Status & Cache Refresh**: `https://sunidhi.shop/admin/system`
- **Draft Product Preview**: `https://sunidhi.shop/admin/preview/product/[slug]`
