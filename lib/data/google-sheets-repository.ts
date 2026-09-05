import { CategorySummary, LookbookItem, Product, ProductFilterOptions } from '@/types/product';
import { IProductRepository } from './product-repository.interface';
import { MockProductRepository } from './mock-product-repository';

/**
 * Google Sheets Product Repository Adapter
 * 
 * In future phases, this class connects to Google Sheets API via Service Account
 * or an exported CSV/JSON endpoint, normalizes rows into the canonical Product model,
 * and caches results with Next.js revalidation (ISR).
 * 
 * The UI never touches this directly—it only interacts with IProductRepository.
 */
export class GoogleSheetsProductRepository implements IProductRepository {
  private sheetId?: string;
  private apiKey?: string;
  private fallbackRepo: MockProductRepository;

  constructor(sheetId?: string, apiKey?: string) {
    this.sheetId = sheetId || process.env.GOOGLE_SHEET_ID;
    this.apiKey = apiKey || process.env.GOOGLE_SHEETS_API_KEY;
    this.fallbackRepo = new MockProductRepository();
  }

  /**
   * Translates a raw Google Sheet row into the canonical Product object
   */
  public static mapSheetRowToProduct(row: Record<string, string | number>): Product {
    return {
      id: String(row['id'] || ''),
      slug: String(row['slug'] || ''),
      title: String(row['title'] || ''),
      brand: String(row['brand'] || ''),
      store: String(row['store'] || ''),
      category: (row['category'] as Product['category']) || 'fashion',
      subcategory: row['subcategory'] ? String(row['subcategory']) : undefined,
      tags: row['tags'] ? String(row['tags']).split(',').map(s => s.trim()) : [],
      image: String(row['image'] || ''),
      imageAlt: String(row['imageAlt'] || row['title'] || ''),
      price: Number(row['price'] || 0),
      originalPrice: row['originalPrice'] ? Number(row['originalPrice']) : undefined,
      currency: String(row['currency'] || 'INR'),
      discount: row['discount'] ? String(row['discount']) : undefined,
      description: String(row['description'] || ''),
      creatorNote: row['creatorNote'] ? String(row['creatorNote']) : undefined,
      badge: row['badge'] ? String(row['badge']) : undefined,
      ctaText: row['ctaText'] ? String(row['ctaText']) : 'Shop Now',
      affiliateUrl: String(row['affiliateUrl'] || ''),
      canonicalUrl: row['canonicalUrl'] ? String(row['canonicalUrl']) : undefined,
      source: 'google-sheet',
      status: (row['status'] as Product['status']) || 'active',
      featured: Boolean(String(row['featured']).toUpperCase() === 'TRUE'),
      trending: Boolean(String(row['trending']).toUpperCase() === 'TRUE'),
      new: Boolean(String(row['new']).toUpperCase() === 'TRUE'),
      displayOrder: Number(row['displayOrder'] || 999),
      publishedAt: String(row['publishedAt'] || new Date().toISOString()),
      updatedAt: String(row['updatedAt'] || new Date().toISOString()),
      rating: row['rating'] ? Number(row['rating']) : undefined,
      availability: (row['availability'] as Product['availability']) || 'in_stock',
      reelUrl: row['reelUrl'] ? String(row['reelUrl']) : undefined,
      instagramUrl: row['instagramUrl'] ? String(row['instagramUrl']) : undefined,
    };
  }

  async getAllProducts(filters?: ProductFilterOptions): Promise<Product[]> {
    if (!this.sheetId || !this.apiKey) {
      // Fallback gracefully until Google Sheets credentials are provided in env
      return this.fallbackRepo.getAllProducts(filters);
    }
    // Future implementation: fetch from Google Sheets API with ISR cache
    return this.fallbackRepo.getAllProducts(filters);
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    return this.fallbackRepo.getProductBySlug(slug);
  }

  async getProductById(id: string): Promise<Product | null> {
    return this.fallbackRepo.getProductById(id);
  }

  async getFeaturedProducts(limit?: number): Promise<Product[]> {
    return this.fallbackRepo.getFeaturedProducts(limit);
  }

  async getSeenOnSunidhiProducts(limit?: number): Promise<Product[]> {
    return this.fallbackRepo.getSeenOnSunidhiProducts(limit);
  }

  async getCategories(): Promise<CategorySummary[]> {
    return this.fallbackRepo.getCategories();
  }

  async getLookbooks(): Promise<LookbookItem[]> {
    return this.fallbackRepo.getLookbooks();
  }

  async searchProducts(query: string): Promise<Product[]> {
    return this.fallbackRepo.searchProducts(query);
  }

  async getRelatedProducts(productId: string, limit?: number): Promise<Product[]> {
    return this.fallbackRepo.getRelatedProducts(productId, limit);
  }
}
