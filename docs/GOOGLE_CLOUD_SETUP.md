# Google Cloud Service Account Setup for Sunidhi.shop

This step-by-step guide explains how to configure Google Sheets as the live, server-side Content Management System (CMS) for **sunidhi.shop**.

---

## Architecture Overview

```
Google Sheet ("Products" tab)
        ↓
Google Sheets API v4 (Read-Only)
        ↓
Server-Side Connector (lib/data/google-sheets-provider.ts)
        ↓
Normalized Product Cache (In-Memory)
        ↓
Storefront (sunidhi.shop)
```

- **Read-Only Scope**: The service account strictly requires read-only access (`https://www.googleapis.com/auth/spreadsheets.readonly`). It can never write to or delete your Google Drive files.
- **Server-Only Security**: Credentials exist exclusively in server environment variables. They are never transmitted or bundled into client code.

---

## Step 1: Create a Google Cloud Project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown in the top navigation bar.
3. Click **New Project**.
4. Name the project (e.g. `sunidhi-shop-production`) and click **Create**.
5. Select the newly created project.

---

## Step 2: Enable the Google Sheets API

1. In the Google Cloud Console, navigate to **APIs & Services → Library** (or search for `Google Sheets API`).
2. Click **Google Sheets API**.
3. Click **Enable**.

---

## Step 3: Create a Service Account

1. Navigate to **APIs & Services → Credentials**.
2. Click **+ CREATE CREDENTIALS** at the top and select **Service account**.
3. Fill in the service account details:
   - **Service account name**: `sunidhi-sheets-sync`
   - **Service account ID**: `sunidhi-sheets-sync` (auto-filled)
   - **Description**: `Read-only spreadsheet connector for sunidhi.shop CMS`
4. Click **Create and Continue**.
5. Role assignment is optional for private sheets (the sheet will be shared directly with the service account email). Click **Continue**, then **Done**.

---

## Step 4: Generate the Private Key (JSON)

1. Under **Service Accounts** on the Credentials page, click on the newly created service account (`sunidhi-sheets-sync@...`).
2. Go to the **Keys** tab.
3. Click **ADD KEY → Create new key**.
4. Select **JSON** as the key type and click **Create**.
5. A JSON file will automatically download to your computer.
   - *Example content:*
     ```json
     {
       "type": "service_account",
       "project_id": "sunidhi-shop-production",
       "private_key_id": "9a8b7c6d5e4f3a2b1c0d",
       "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...\n-----END PRIVATE KEY-----\n",
       "client_email": "sunidhi-sheets-sync@sunidhi-shop-production.iam.gserviceaccount.com"
     }
     ```
   - **Security Warning**: Keep this file safe. Never commit this file to GitHub or share it publicly.

---

## Step 5: Share Your Google Sheet

1. Open your master Google Sheet in Google Drive (e.g., named **Sunidhi.shop Product Database**).
2. Ensure the sheet has a tab named **`Products`**.
3. Click the **Share** button in the top-right corner.
4. In the "Add people and groups" field, paste the **`client_email`** from your service account JSON file:
   `sunidhi-sheets-sync@<your-project-id>.iam.gserviceaccount.com`
5. Set permission to **Viewer** (recommended) or **Editor**.
6. Uncheck "Notify people" (since service accounts do not have an inbox) and click **Share**.

---

## Step 6: Extract the Spreadsheet ID

From your Google Sheet URL:
`https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0`

The string between `/d/` and `/edit` is your `GOOGLE_SHEET_ID`:
`1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

---

## Step 7: Configure Environment Variables on Hosting Platform

Add the following environment variables in your hosting settings (e.g. Vercel, Railway, Node.js):

| Variable Name | Value Description | Example |
|---|---|---|
| `DATA_SOURCE` | Set to `google-sheets` | `google-sheets` |
| `GOOGLE_SHEET_ID` | Your spreadsheet ID from Step 6 | `1BxiMVs0XRA5...` |
| `GOOGLE_SHEET_NAME` | Tab name in sheet | `Products` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email from JSON | `sunidhi-sheets-sync@...iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Exact `private_key` string with `\n` | `"-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"` |
| `CACHE_TTL_SECONDS` | In-memory cache duration | `300` |
| `ADMIN_PASSWORD` | Strong password for /admin login | `YOUR_SECURE_ADMIN_PASSPHRASE` |
| `NEXT_PUBLIC_SITE_URL` | Production domain | `https://sunidhi.shop` |

> **Formatting Tip**: When copying the `GOOGLE_PRIVATE_KEY`, ensure all `\n` characters remain intact as literal escaped newlines or actual multiline strings.

---

## Step 8: Deploy & Test Connection

1. Trigger a deployment on your hosting platform.
2. Log into the internal admin dashboard at:
   `https://sunidhi.shop/admin/system`
3. Check the **Google Sheets Pipeline** card:
   - Status will show **Healthy** (Green).
   - Sync method will show **Service Account API v4**.
   - Last sync timestamp will report the current time.
4. Click **Refresh Products** to trigger a manual cache invalidation and verify that live sheet updates reflect immediately.
