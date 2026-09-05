export type ProductCategory = 
  | 'fashion' 
  | 'beauty' 
  | 'accessories' 
  | 'lifestyle' 
  | 'footwear';

export type ProductStatus = 'active' | 'draft' | 'archived';

export type ProductAvailability = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  // Core Identity & URL
  id: string;
  slug: string;
  title: string;
  brand: string;
  store: string;
  
  // Categorization
  category: ProductCategory;
  subcategory?: string;
  tags?: string[];
  
  // Media
  image: string;
  imageAlt: string;
  additionalImages?: string[];
  videoUrl?: string;
  instagramUrl?: string;
  reelUrl?: string;
  
  // Pricing
  price: number;
  originalPrice?: number;
  currency: string; // e.g., 'INR', 'USD'
  discount?: string; // e.g. '30% OFF'
  priceUpdatedAt?: string;
  
  // Editorial Content
  description: string;
  creatorNote?: string; // "Sunidhi's Take"
  badge?: string; // e.g., 'Seen on Sunidhi', 'Trending', 'Curator Pick'
  ctaText?: string; // e.g. 'Shop at Zara', 'View Product', 'Check Price'
  
  // External Merchant & Affiliate
  affiliateUrl: string;
  canonicalUrl?: string;
  externalProductId?: string;
  sourceProductId?: string;
  
  // Operations & Source Tracking
  source: 'manual' | 'google-sheet' | 'affiliate-api' | 'merchant-feed';
  status: ProductStatus;
  featured: boolean;
  trending: boolean;
  new: boolean;
  displayOrder: number;
  publishedAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  
  // Enrichment & Availability
  rating?: number;
  availability?: ProductAvailability;

  // Creator Content & Campaign Metadata (Phases 8 & 9)
  contentId?: string;
  contentIds?: string[];
  contentType?: CreatorContentType;
  contentTitle?: string;
  contentUrl?: string;
  contentThumbnail?: string;
  campaignId?: string;
  campaignName?: string;
  contentOrder?: number;
  contentStatus?: 'published' | 'draft' | 'archived';

  // Phase 11: Operations, Scheduling & Internal Notes
  internalNote?: string; // Private operator notes (supplier, shooting info). Never public.
  publishAt?: string;    // ISO timestamp for future scheduled drop
  unpublishAt?: string;  // ISO timestamp for scheduled expiration
}

export type CreatorContentType = 'reel' | 'post' | 'story' | 'video' | 'campaign';

export interface CategorySummary {
  id: ProductCategory | 'all';
  name: string;
  slug: string;
  description?: string;
  count: number;
}

export interface LookbookItem {
  id: string;
  reelId: string;
  thumbnailUrl: string;
  title: string;
  creatorNote: string;
  instagramPostUrl?: string;
  date: string;
  taggedProducts: Product[];
}

export interface ProductFilterOptions {
  category?: string;
  tag?: string;
  search?: string;
  featured?: boolean;
  trending?: boolean;
  isNew?: boolean;
  sortBy?: 'featured' | 'newest' | 'price-low' | 'price-high' | 'trending';
  limit?: number;
  offset?: number;
}

// Phase 11: Product Health & Diagnostics
export type ProductHealthGrade = 'healthy' | 'warning' | 'invalid';

export interface ProductHealthIssue {
  field: string;
  severity: 'warning' | 'invalid';
  message: string;
}

export interface ProductHealthReport {
  product: Product;
  grade: ProductHealthGrade;
  issues: ProductHealthIssue[];
}

export interface CatalogHealthSummary {
  total: number;
  published: number;
  draft: number;
  archived: number;
  healthy: number;
  warnings: number;
  invalid: number;
  issuesCount: Record<string, number>;
}

// Phase 11: System Status & Operations Audit
export type SubsystemHealth = 'healthy' | 'warning' | 'unavailable';

export interface SystemStatusReport {
  overallStatus: SubsystemHealth;
  subsystems: {
    application: { status: SubsystemHealth; message: string; uptimeSeconds: number };
    googleSheetsPipeline: { status: SubsystemHealth; message: string; lastSyncAt?: string; syncMethod: string };
    productCache: { status: SubsystemHealth; message: string; cachedCount: number; lastRefreshedAt?: string };
    analyticsEngine: { status: SubsystemHealth; message: string; totalEventsTracked: number; totalClicksTracked: number };
    redirectSystem: { status: SubsystemHealth; message: string; latencyStatus: string };
  };
  catalogCounts: {
    total: number;
    published: number;
    draft: number;
    archived: number;
  };
  recentOperations: OperationLogEntry[];
}

export interface OperationLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  action: 'sheet_sync' | 'cache_refresh' | 'fallback_activated' | 'admin_refresh' | 'validation_run';
  status: 'success' | 'warning' | 'error';
  details: string;
  adminIdentity?: string;
}
