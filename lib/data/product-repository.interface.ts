import { CategorySummary, LookbookItem, Product, ProductFilterOptions } from '@/types/product';

export interface IProductRepository {
  /**
   * Retrieve products matching the specified filters, sorting, and pagination
   */
  getAllProducts(filters?: ProductFilterOptions): Promise<Product[]>;

  /**
   * Retrieve a single product by its URL slug
   */
  getProductBySlug(slug: string): Promise<Product | null>;

  /**
   * Retrieve a single product by its unique ID
   */
  getProductById(id: string): Promise<Product | null>;

  /**
   * Retrieve top featured picks curated by Sunidhi
   */
  getFeaturedProducts(limit?: number): Promise<Product[]>;

  /**
   * Retrieve products explicitly tagged as 'Seen on Sunidhi'
   */
  getSeenOnSunidhiProducts(limit?: number): Promise<Product[]>;

  /**
   * Retrieve category summary counts dynamically calculated from active products
   */
  getCategories(): Promise<CategorySummary[]>;

  /**
   * Retrieve Reel / Instagram lookbooks connecting social content to products
   */
  getLookbooks(): Promise<LookbookItem[]>;

  /**
   * Search products by keyword across title, brand, store, category, and tags
   */
  searchProducts(query: string): Promise<Product[]>;

  /**
   * Get related recommendations for a product detail page
   */
  getRelatedProducts(productId: string, limit?: number): Promise<Product[]>;

  /**
   * Admin inspection: Retrieve all products including draft and archived
   */
  getAllProductsAdmin?(filters?: ProductFilterOptions): Promise<Product[]>;

  /**
   * Admin preview: Retrieve a product by slug regardless of status
   */
  getProductBySlugAdmin?(slug: string): Promise<Product | null>;
}
