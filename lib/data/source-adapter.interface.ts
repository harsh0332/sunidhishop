import { Product } from '@/types/product';

/**
 * ==============================================================================
 * FUTURE ARCHITECTURAL PLACEHOLDER - ZERO SCRAPING / NO EXTERNAL APIS IN PHASE 4
 * ==============================================================================
 * For the current version of sunidhi.shop:
 * - Google Sheets is the sole production source of truth.
 * - All product titles, images, prices, and affiliate URLs are entered manually.
 * - NO merchant scraping (Amazon, Myntra, Zara, Nykaa, etc.) is implemented.
 * - NO affiliate network APIs (Impact, CJ, Awin, etc.) are called.
 * 
 * When the business scales, future providers can implement this interface:
 * 1. GoogleSheetsProductProvider (Current Source of Truth)
 * 2. Future: AffiliateNetworkProductProvider (Impact / CJ / ShareASale)
 * 3. Future: MerchantFeedProductProvider (Direct CSV/XML data feeds)
 * 4. Future: OfficialMerchantApiProvider (Approved retailer APIs)
 * 
 * Future Data Merging Priority:
 * 1. Manual Sheet value / override (Creator notes & manual curation always win)
 * 2. Trusted API / Feed data (Live stock & price sync)
 * 3. Default fallback
 * ==============================================================================
 */

export type SourcePriority = 1 | 2 | 3 | 4;

export interface ProductDataSourceMetadata {
  sourceName: string;
  priority: SourcePriority; // 1: Manual Sheet Override, 2: Trusted API/Feed, 3: Approved Metadata, 4: Fallback
  isAutomated: boolean;
  rateLimitPerMinute?: number;
}

export interface IProductSourceAdapter<TRawData = unknown> {
  readonly metadata: ProductDataSourceMetadata;

  /**
   * Fetch raw product payload from external API or source
   */
  fetchProduct(externalId: string): Promise<TRawData>;

  /**
   * Normalize source-specific raw data into canonical Sunidhi Product schema
   */
  normalizeProduct(rawData: TRawData): Partial<Product>;

  /**
   * Refresh price, availability, and merchant affiliate links
   */
  refreshProduct(existingProduct: Product): Promise<Partial<Product>>;

  /**
   * Validate that the product data conforms to quality and affiliate standards
   */
  validateProduct(product: Partial<Product>): { isValid: boolean; errors?: string[] };
}

/**
 * Data merger that merges attributes according to source priority:
 * 1. Trusted API/feed data
 * 2. Manually overridden values from Sheet (e.g. custom creator notes take precedence)
 * 3. Approved structured metadata
 * 4. Fallback/manual data
 */
export class ProductDataEnrichmentPipeline {
  static mergeWithPriority(
    base: Product,
    enriched: Partial<Product>,
    manualSheetOverrides?: Partial<Product>
  ): Product {
    const merged: Product = {
      ...base,
      ...enriched,
      // Manual creator note & custom badges from the Sheet always take precedence over automated feeds
      creatorNote: manualSheetOverrides?.creatorNote ?? base.creatorNote,
      badge: manualSheetOverrides?.badge ?? base.badge,
      title: manualSheetOverrides?.title ?? enriched.title ?? base.title,
      price: enriched.price ?? base.price,
      availability: enriched.availability ?? base.availability,
      lastSyncedAt: new Date().toISOString(),
      priceUpdatedAt: enriched.priceUpdatedAt ?? new Date().toISOString(),
    };

    return merged;
  }
}
