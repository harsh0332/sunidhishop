import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { CategorySummary, LookbookItem, Product, ProductCategory, ProductFilterOptions } from '@/types/product';
import { IProductRepository } from './product-repository.interface';
import { deduplicateAndSanitizeProducts } from './product-validator';
import { MOCK_LOOKBOOKS, MOCK_PRODUCTS } from './mock-products';
import { computeRelatedProducts } from './cross-sell';
import { OperationsLogger } from './operations-logger';
import { getCustomProducts } from './custom-products-store';
import { applyProductOverrides } from './product-overrides';

interface CacheEntry {
  products: Product[];
  timestamp: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DISK_CACHE_FILE = path.join(DATA_DIR, 'sheet-cache.json');

function readDiskCache(): Product[] | null {
  try {
    if (fs.existsSync(DISK_CACHE_FILE)) {
      const raw = fs.readFileSync(DISK_CACHE_FILE, 'utf-8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[GoogleSheetsProductProvider] Could not read disk cache:', err);
  }
  return null;
}

function writeDiskCache(products: Product[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DISK_CACHE_FILE, JSON.stringify(products, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[GoogleSheetsProductProvider] Could not write disk cache:', err);
  }
}

export class GoogleSheetsProductProvider implements IProductRepository {
  private sheetId: string;
  private sheetName: string;
  private serviceAccountEmail?: string;
  private privateKey?: string;
  private cacheTtlMs: number;

  // In-memory cache & fault-tolerant fallback storage
  private static cache: CacheEntry | null = null;
  private static lastKnownGoodProducts: Product[] | null = null;
  private static lastSuccessfulSyncAt: string | undefined = undefined;
  private static lastCacheRefreshAt: string | undefined = undefined;
  // In-flight sync promise deduplication lock (Requirement #53)
  private static activeFetchPromise: Promise<Product[]> | null = null;
  private static isInitializedFromDisk = false;

  private static ensureDiskCacheLoaded(): void {
    if (GoogleSheetsProductProvider.isInitializedFromDisk) return;
    GoogleSheetsProductProvider.isInitializedFromDisk = true;

    const fromDisk = readDiskCache();
    if (fromDisk && fromDisk.length > 0) {
      GoogleSheetsProductProvider.lastKnownGoodProducts = fromDisk;
      GoogleSheetsProductProvider.cache = {
        products: fromDisk,
        timestamp: Date.now(),
      };
      GoogleSheetsProductProvider.lastSuccessfulSyncAt = new Date().toISOString();
      return;
    }

    // Default fast seed combining custom products + mock catalog
    let custom: Product[] = [];
    try {
      custom = getCustomProducts();
    } catch {}
    const combinedMap = new Map<string, Product>();
    for (const p of custom) combinedMap.set(p.id, p);
    for (const p of MOCK_PRODUCTS) {
      if (!combinedMap.has(p.id)) combinedMap.set(p.id, p);
    }
    const initial = applyProductOverrides(Array.from(combinedMap.values()));
    GoogleSheetsProductProvider.lastKnownGoodProducts = initial;
    GoogleSheetsProductProvider.cache = {
      products: initial,
      timestamp: Date.now(),
    };
    writeDiskCache(initial);
  }

  constructor() {
    GoogleSheetsProductProvider.ensureDiskCacheLoaded();
    this.sheetId = process.env.GOOGLE_SHEET_ID || '';
    this.sheetName = process.env.GOOGLE_SHEET_NAME || 'Products';
    this.serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    this.privateKey = process.env.GOOGLE_PRIVATE_KEY
      ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    const ttlSeconds = parseInt(process.env.CACHE_TTL_SECONDS || '300', 10);
    this.cacheTtlMs = (isNaN(ttlSeconds) ? 300 : ttlSeconds) * 1000;
  }

  /**
   * Invalidates the server-side memory cache, forcing next read to fetch fresh Sheet data
   */
  public static invalidateCache(): void {
    GoogleSheetsProductProvider.cache = null;
    GoogleSheetsProductProvider.activeFetchPromise = null;
    GoogleSheetsProductProvider.lastCacheRefreshAt = new Date().toISOString();

    // Immediately update memory and disk cache with latest custom products + overrides
    try {
      let customProducts: Product[] = [];
      try {
        customProducts = getCustomProducts();
      } catch {}
      const base = GoogleSheetsProductProvider.lastKnownGoodProducts || MOCK_PRODUCTS;
      const combinedMap = new Map<string, Product>();
      for (const p of customProducts) combinedMap.set(p.id, p);
      for (const p of base) {
        if (!combinedMap.has(p.id)) combinedMap.set(p.id, p);
      }
      const dataset = applyProductOverrides(Array.from(combinedMap.values()));
      GoogleSheetsProductProvider.cache = {
        products: dataset,
        timestamp: Date.now(),
      };
      GoogleSheetsProductProvider.lastKnownGoodProducts = dataset;
      writeDiskCache(dataset);
    } catch {}

    OperationsLogger.log('cache_refresh', 'success', 'Product cache invalidated manually');
    // eslint-disable-next-line no-console
    console.log('[GoogleSheetsProductProvider] Cache manually invalidated.');
  }

  public static getLastSyncAt(): string | undefined {
    return GoogleSheetsProductProvider.lastSuccessfulSyncAt || OperationsLogger.getLastSyncTime();
  }

  public static getLastCacheRefreshAt(): string | undefined {
    return GoogleSheetsProductProvider.lastCacheRefreshAt || OperationsLogger.getLastRefreshTime();
  }

  public static getCacheStatus(): { cachedCount: number; timestamp?: number } {
    return {
      cachedCount: GoogleSheetsProductProvider.cache?.products.length || 0,
      timestamp: GoogleSheetsProductProvider.cache?.timestamp,
    };
  }

  public static isSyncInProgress(): boolean {
    return GoogleSheetsProductProvider.activeFetchPromise !== null;
  }

  /**
   * Retrieves products with caching, stale-while-revalidate, in-flight concurrency deduplication, and fault-tolerant fallback
   */
  private async fetchAllProductsFromSheet(): Promise<Product[]> {
    GoogleSheetsProductProvider.ensureDiskCacheLoaded();
    const now = Date.now();

    // 1. Return valid cache if still fresh
    if (
      GoogleSheetsProductProvider.cache &&
      now - GoogleSheetsProductProvider.cache.timestamp < this.cacheTtlMs
    ) {
      return GoogleSheetsProductProvider.cache.products;
    }

    // 2. Stale-While-Revalidate: Return existing cache or disk products IMMEDIATELY (< 1ms!)
    // and revalidate asynchronously in the background so visitors and redirects NEVER wait for Google Sheets!
    const available =
      GoogleSheetsProductProvider.cache?.products ||
      GoogleSheetsProductProvider.lastKnownGoodProducts;

    if (available && available.length > 0) {
      if (!GoogleSheetsProductProvider.activeFetchPromise) {
        GoogleSheetsProductProvider.activeFetchPromise = this.performSheetSync(now)
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.error('[GoogleSheetsProductProvider] Background sync error:', err);
            return available;
          })
          .finally(() => {
            GoogleSheetsProductProvider.activeFetchPromise = null;
          });
      }
      return available;
    }

    // 3. Concurrency Lock: If a sync is already in flight, await that single promise (Requirement #53)
    if (GoogleSheetsProductProvider.activeFetchPromise) {
      return GoogleSheetsProductProvider.activeFetchPromise;
    }

    // 4. Initiate single synchronized fetch (only if no cache or disk data exists)
    GoogleSheetsProductProvider.activeFetchPromise = (async () => {
      try {
        return await this.performSheetSync(now);
      } finally {
        GoogleSheetsProductProvider.activeFetchPromise = null;
      }
    })();

    return GoogleSheetsProductProvider.activeFetchPromise;
  }

  /**
   * Executes the actual sync against Google Sheets API or CSV fallback
   */
  private async performSheetSync(now: number): Promise<Product[]> {
    if (!this.sheetId) {
      // If GOOGLE_SHEET_ID is missing, use default mock dataset merged with custom products
      const base = GoogleSheetsProductProvider.lastKnownGoodProducts || MOCK_PRODUCTS;
      let customProducts: Product[] = [];
      try {
        customProducts = getCustomProducts();
      } catch {}
      const combinedMap = new Map<string, Product>();
      for (const p of customProducts) combinedMap.set(p.id, p);
      for (const p of base) {
        if (!combinedMap.has(p.id)) combinedMap.set(p.id, p);
      }
      const dataset = applyProductOverrides(Array.from(combinedMap.values()));
      GoogleSheetsProductProvider.lastSuccessfulSyncAt = new Date().toISOString();
      if (GoogleSheetsProductProvider.lastKnownGoodProducts && GoogleSheetsProductProvider.lastKnownGoodProducts.length > 0) {
        OperationsLogger.log(
          'fallback_activated',
          'warning',
          `No sheet ID configured. Retaining ${dataset.length} products.`
        );
      } else {
        OperationsLogger.log(
          'sheet_sync',
          'success',
          `No sheet ID configured. Serving local catalog (${dataset.length} products).`
        );
      }
      return dataset;
    }

    try {
      let rawRows: Record<string, unknown>[] = [];

      // Strategy A: Google Service Account Auth via Sheets API v4
      if (this.serviceAccountEmail && this.privateKey) {
        rawRows = await this.fetchViaServiceAccount();
      } else {
        // Strategy B: Public / Shared Sheet CSV Export
        rawRows = await this.fetchViaPublicCsvExport();
      }

      // Empty Sheet Protection (Phase 11 Requirement #25):
      // If the sheet returns 0 rows, do NOT wipe the live catalog!
      if (!rawRows || rawRows.length === 0) {
        if (GoogleSheetsProductProvider.lastKnownGoodProducts && GoogleSheetsProductProvider.lastKnownGoodProducts.length > 0) {
          OperationsLogger.log(
            'fallback_activated',
            'warning',
            `Google Sheet returned empty rowset. Retaining ${GoogleSheetsProductProvider.lastKnownGoodProducts.length} last-known-good products.`
          );
          return GoogleSheetsProductProvider.lastKnownGoodProducts;
        }
      }

      // 2. Validate, deduplicate, and normalize all rows from Google Sheet
      const sheetProducts = deduplicateAndSanitizeProducts(rawRows);

      // 3. Merge custom products added directly via Quick Add
      let customProducts: Product[] = [];
      try {
        customProducts = getCustomProducts();
      } catch {
        // Safe fallback
      }

      const combinedMap = new Map<string, Product>();
      for (const p of customProducts) combinedMap.set(p.id, p);
      for (const p of sheetProducts) {
        if (!combinedMap.has(p.id)) {
          combinedMap.set(p.id, p);
        }
      }
      const normalizedProducts = applyProductOverrides(Array.from(combinedMap.values()));

      if (normalizedProducts.length > 0) {
        // Update both cache and last-known-good dataset
        GoogleSheetsProductProvider.cache = {
          products: normalizedProducts,
          timestamp: now,
        };
        GoogleSheetsProductProvider.lastKnownGoodProducts = normalizedProducts;
        GoogleSheetsProductProvider.lastSuccessfulSyncAt = new Date().toISOString();
        writeDiskCache(normalizedProducts);

        OperationsLogger.log(
          'sheet_sync',
          'success',
          `Successfully synced and normalized ${normalizedProducts.length} products (${sheetProducts.length} from Sheet, ${customProducts.length} added via Admin)`
        );

        return normalizedProducts;
      }

      throw new Error('Google Sheet returned 0 valid products after normalization');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[GoogleSheetsProductProvider] Failed to fetch live data from Google Sheets:', error);

      // Safe Rollback (Phase 11 Requirement #24):
      // Never replace good cached products with an empty/broken dataset
      if (GoogleSheetsProductProvider.lastKnownGoodProducts && GoogleSheetsProductProvider.lastKnownGoodProducts.length > 0) {
        OperationsLogger.log(
          'fallback_activated',
          'warning',
          `Sheet sync failed (${String(error)}). Serving ${GoogleSheetsProductProvider.lastKnownGoodProducts.length} last-known-good cached products.`
        );
        return GoogleSheetsProductProvider.lastKnownGoodProducts;
      }

      // Ultimate Fallback: seed data to prevent storefront crash
      OperationsLogger.log(
        'fallback_activated',
        'warning',
        'No prior cache found. Serving default seed catalog.'
      );
      return MOCK_PRODUCTS;
    }
  }

  /**
   * Fetch using official Google Sheets API v4 with Service Account credentials
   */
  private async fetchViaServiceAccount(): Promise<Record<string, unknown>[]> {
    const auth = new google.auth.JWT({
      email: this.serviceAccountEmail,
      key: this.privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: `${this.sheetName}!A1:ZZ`,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      return [];
    }

    const headers = (rows[0] as string[]).map(h => String(h).trim());
    const dataRows = rows.slice(1);

    return dataRows.map(row => {
      const rowObj: Record<string, unknown> = {};
      headers.forEach((header, colIndex) => {
        rowObj[header] = row[colIndex] !== undefined ? row[colIndex] : '';
      });
      return rowObj;
    });
  }

  /**
   * Fetch using Google Sheets CSV export (when spreadsheet has link-sharing enabled)
   * Protected with 4.5-second timeout so remote stalls never hang the user's connection.
   */
  private async fetchViaPublicCsvExport(): Promise<Record<string, unknown>[]> {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
      this.sheetName
    )}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    let res: Response;
    try {
      res = await fetch(csvUrl, {
        signal: controller.signal,
        next: { revalidate: this.cacheTtlMs / 1000 },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch Google Sheet CSV: ${res.status} ${res.statusText}`);
    }

    const csvText = await res.text();
    return this.parseCsvText(csvText);
  }

  /**
   * Lightweight CSV parser handling commas, quotes, and newlines
   */
  private parseCsvText(text: string): Record<string, unknown>[] {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentLine += char;
      } else if (char === '\n' && !inQuotes) {
        lines.push(currentLine.trim());
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) lines.push(currentLine.trim());

    if (lines.length < 2) return [];

    const splitRow = (rowText: string): string[] => {
      const cols: string[] = [];
      let cur = '';
      let quote = false;
      for (let i = 0; i < rowText.length; i++) {
        const c = rowText[i];
        if (c === '"') {
          quote = !quote;
        } else if (c === ',' && !quote) {
          cols.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      cols.push(cur.trim());
      return cols.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
    };

    const headers = splitRow(lines[0]);
    const results: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = splitRow(lines[i]);
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] !== undefined ? cols[idx] : '';
      });
      results.push(obj);
    }

    return results;
  }

  // --- IProductRepository Implementation ---

  async getAllProducts(filters?: ProductFilterOptions): Promise<Product[]> {
    const allProducts = await this.fetchAllProductsFromSheet();
    const now = Date.now();

    // 1. Public visibility filter: Only published ('active') products
    let result = allProducts.filter(p => p.status === 'active');

    // 2. Scheduled Publishing & Unpublishing (Phase 11 Requirement #13):
    // Exclude products whose publishAt is in the future
    // Exclude products whose unpublishAt is in the past
    result = result.filter(p => {
      if (p.publishAt) {
        const pubTime = new Date(p.publishAt).getTime();
        if (!isNaN(pubTime) && pubTime > now) {
          return false; // Future drop, not yet live
        }
      }
      if (p.unpublishAt) {
        const unpubTime = new Date(p.unpublishAt).getTime();
        if (!isNaN(unpubTime) && unpubTime <= now) {
          return false; // Expired drop
        }
      }
      return true;
    });

    if (filters?.category && filters.category !== 'all') {
      result = result.filter(p => p.category.toLowerCase() === filters.category?.toLowerCase());
    }

    if (filters?.tag) {
      result = result.filter(p => p.tags?.some(t => t.toLowerCase() === filters.tag?.toLowerCase()));
    }

    if (filters?.featured !== undefined) {
      result = result.filter(p => p.featured === filters.featured);
    }

    if (filters?.trending !== undefined) {
      result = result.filter(p => p.trending === filters.trending);
    }

    if (filters?.isNew !== undefined) {
      result = result.filter(p => p.new === filters.isNew);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.store.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.subcategory?.toLowerCase().includes(q) ||
          p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'newest':
          result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
          break;
        case 'price-low':
          result.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          result.sort((a, b) => b.price - a.price);
          break;
        case 'trending':
          result.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0));
          break;
        case 'featured':
        default:
          result.sort((a, b) => a.displayOrder - b.displayOrder);
          break;
      }
    } else {
      result.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    if (filters?.offset !== undefined && filters?.limit !== undefined) {
      return result.slice(filters.offset, filters.offset + filters.limit);
    } else if (filters?.limit !== undefined) {
      return result.slice(0, filters.limit);
    }

    return result;
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    // 1. Ultra-fast path: Check custom products directly (< 0.2ms)
    try {
      const customProducts = getCustomProducts();
      const customMatch = customProducts.find(p => p.slug === slug);
      if (customMatch && customMatch.status === 'active') {
        const overridden = applyProductOverrides([customMatch]);
        if (overridden.length > 0) return overridden[0];
      }
    } catch {}

    const all = await this.fetchAllProductsFromSheet();
    const now = Date.now();

    // Only published products can be retrieved on public product detail route
    const product = all.find(p => {
      if (p.slug !== slug || p.status !== 'active') return false;

      // Check scheduled publishing
      if (p.publishAt) {
        const pubTime = new Date(p.publishAt).getTime();
        if (!isNaN(pubTime) && pubTime > now) return false;
      }
      if (p.unpublishAt) {
        const unpubTime = new Date(p.unpublishAt).getTime();
        if (!isNaN(unpubTime) && unpubTime <= now) return false;
      }
      return true;
    });

    return product || null;
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const customProducts = getCustomProducts();
      const customMatch = customProducts.find(p => p.id === id);
      if (customMatch && customMatch.status === 'active') {
        const overridden = applyProductOverrides([customMatch]);
        if (overridden.length > 0) return overridden[0];
      }
    } catch {}

    const all = await this.fetchAllProductsFromSheet();
    const product = all.find(p => p.id === id && p.status === 'active');
    return product || null;
  }

  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    const active = await this.getAllProducts({ featured: true });
    return active.slice(0, limit);
  }

  async getSeenOnSunidhiProducts(limit: number = 6): Promise<Product[]> {
    const active = await this.getAllProducts();
    return active
      .filter(p => p.badge === 'Seen on Sunidhi' || Boolean(p.reelUrl))
      .slice(0, limit);
  }

  async getCategories(): Promise<CategorySummary[]> {
    const activeProducts = await this.getAllProducts();

    const validCategories: { id: ProductCategory | 'all'; name: string; slug: string; description: string }[] = [
      { id: 'all', name: 'All Picks', slug: 'all', description: 'Everything curated by Sunidhi' },
      { id: 'fashion', name: 'Fashion', slug: 'fashion', description: 'Tailoring, dresses & daily wear' },
      { id: 'beauty', name: 'Beauty', slug: 'beauty', description: 'Skincare, makeup & fragrances' },
      { id: 'accessories', name: 'Accessories', slug: 'accessories', description: 'Bags, jewelry & eyewear' },
      { id: 'footwear', name: 'Footwear', slug: 'footwear', description: 'Heels, sandals & daily flats' },
      { id: 'lifestyle', name: 'Lifestyle', slug: 'lifestyle', description: 'Home decor & aesthetic essentials' },
    ];

    return validCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      count: cat.id === 'all'
        ? activeProducts.length
        : activeProducts.filter(p => p.category === cat.id).length,
    }));
  }

  async getLookbooks(): Promise<LookbookItem[]> {
    return MOCK_LOOKBOOKS;
  }

  async searchProducts(query: string): Promise<Product[]> {
    if (!query || query.trim().length === 0) return [];
    return this.getAllProducts({ search: query });
  }

  async getRelatedProducts(productId: string, limit: number = 4): Promise<Product[]> {
    const current = await this.getProductById(productId);
    const all = await this.getAllProducts();

    if (!current) return this.getFeaturedProducts(limit);

    return computeRelatedProducts(current, all, limit);
  }

  // --- Phase 11 Admin Diagnostics & Preview Methods ---

  /**
   * Retrieves all products in catalog without public status/time filtering
   * Used strictly for /admin/products/health and internal audits.
   */
  async getAllProductsAdmin(): Promise<Product[]> {
    return this.fetchAllProductsFromSheet();
  }

  /**
   * Retrieves a single product by slug regardless of status or scheduled drop
   * Used strictly for /admin/preview/product/[slug].
   */
  async getProductBySlugAdmin(slug: string): Promise<Product | null> {
    try {
      const customProducts = getCustomProducts();
      const customMatch = customProducts.find(p => p.slug === slug);
      if (customMatch) {
        const overridden = applyProductOverrides([customMatch]);
        if (overridden.length > 0) return overridden[0];
      }
    } catch {}

    const all = await this.fetchAllProductsFromSheet();
    const product = all.find(p => p.slug === slug);
    return product || null;
  }
}
