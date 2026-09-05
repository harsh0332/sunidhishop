export type TrafficType = 'human' | 'bot' | 'unknown';
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export type StandardAnalyticsEventName =
  | 'page_view'
  | 'product_impression'
  | 'product_view'
  | 'category_view'
  | 'search'
  | 'related_product_click'
  | 'affiliate_click'
  // Future-compatible events
  | 'content_click'
  | 'campaign_view'
  | 'outbound_click'
  | 'contextual_landing'
  | 'content_view'
  | 'content_product_click'
  // Legacy alias support
  | 'homepage_view'
  | 'outbound_affiliate_click'
  | 'product_card_click'
  | 'category_click'
  | 'filter_usage'
  | 'lookbook_interaction';

export interface EventProperties {
  productId?: string;
  productSlug?: string;
  productTitle?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  store?: string;
  merchant?: string;
  price?: number;
  source?: string;
  contentId?: string;
  campaignId?: string;
  referrer?: string;
  deviceType?: DeviceType;
  trafficType?: TrafficType;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  searchQuery?: string;
  filterName?: string;
  filterValue?: string;
  relatedToProductId?: string;
  affiliateUrl?: string;
  destinationUrl?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ClickEvent {
  id: string;
  productId: string;
  productSlug: string;
  timestamp: string; // ISO 8601
  referrer: string;
  landingPage: string;
  userAgent: string;
  deviceType: DeviceType;
  trafficType: TrafficType;
  
  // Attribution
  source: string;
  merchant: string;
  affiliateDestination: string;
  
  // Campaign & UTM Attribution
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  
  // Content-Level Creator Attribution (Instagram Reels, stories, campaign IDs)
  contentId?: string; // e.g., 'reel_001', 'story_005'
  campaignId?: string; // e.g., 'festive_edit_2025'
  
  // Privacy-friendly session hash (derived from user-agent and date, no raw IP)
  sessionId?: string;
  createdAt: string;
}

export interface ProductClickMetrics {
  productId: string;
  productSlug: string;
  merchant: string;
  totalClicks: number;
  humanClicks: number;
  botClicks: number;
  lastClickedAt: string;
}

export interface MerchantClickMetrics {
  merchant: string;
  totalClicks: number;
  humanClicks: number;
  uniqueSessions: number;
  lastClickedAt: string;
}

export interface DailyClickMetrics {
  date: string; // YYYY-MM-DD
  productId: string;
  merchant: string;
  clicks: number;
  humanClicks: number;
  botClicks: number;
}

export interface AnalyticsEvent {
  id: string;
  eventType: StandardAnalyticsEventName;
  timestamp: string; // ISO 8601
  sessionId?: string;
  productId?: string;
  productSlug?: string;
  productTitle?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  store?: string;
  merchant?: string;
  price?: number;
  source?: string;
  referrer?: string;
  deviceType?: DeviceType;
  trafficType?: TrafficType;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  contentId?: string;
  campaignId?: string;
  searchQuery?: string;
  createdAt: string;
}

export type DateRangeOption = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  visitors: number;
  views: number;
  clicks: number;
}

export interface ActionableInsight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'opportunity';
  title: string;
  description: string;
  metric?: string;
}

export interface AdminOverviewKPIs {
  totalVisitors: number;
  productViews: number;
  affiliateClicks: number;
  affiliateCtr: number; // Percentage (e.g. 12.5)
  productImpressions: number;
  contentViews: number;
  periodComparison?: {
    visitorsChangePct: number | null;
    viewsChangePct: number | null;
    clicksChangePct: number | null;
    ctrChangePct: number | null;
  };
  trend: TimeSeriesPoint[];
  trafficQuality: {
    totalClicks: number;
    humanClicks: number;
    botClicks: number;
    unknownClicks: number;
    humanPercentage: number;
  };
  insights: ActionableInsight[];
}

export interface ProductPerformanceMetric {
  productId: string;
  productSlug: string;
  title: string;
  category: string;
  brand: string;
  store: string;
  price: number;
  impressions: number;
  views: number;
  clicks: number;
  ctr: number; // (clicks / views) * 100
  status: string;
  featured?: boolean;
  trending?: boolean;
  isHighIntent?: boolean;
  isUnderperforming?: boolean;
}

export interface CategoryPerformanceMetric {
  category: string;
  productCount: number;
  views: number;
  clicks: number;
  ctr: number;
  shareOfClicks: number;
}

export interface ContentPerformanceMetric {
  contentId: string;
  contentType: string;
  title: string;
  views: number; // sunidhi.shop views
  productClicks: number;
  affiliateClicks: number;
  topProducts: { slug: string; title: string; clicks: number }[];
}

export interface CampaignPerformanceMetric {
  campaignId: string;
  name: string;
  views: number;
  productViews: number;
  affiliateClicks: number;
  ctr: number;
  topProducts: { slug: string; title: string; clicks: number }[];
}

export interface SourcePerformanceMetric {
  source: string;
  visitors: number;
  views: number;
  clicks: number;
  ctr: number;
  shareOfClicks: number;
}

export interface UtmPerformanceMetric {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  visitors: number;
  views: number;
  clicks: number;
}

export interface DevicePerformanceMetric {
  deviceType: DeviceType;
  visitors: number;
  views: number;
  clicks: number;
  ctr: number;
  shareOfClicks: number;
}

export interface RecentActivityItem {
  id: string;
  timestamp: string;
  eventType: string;
  productTitle?: string;
  productSlug?: string;
  merchant?: string;
  source: string;
  trafficType: TrafficType;
}

// Future commission compatibility extension point (Phase 10 requirement #36)
export interface FutureCommissionRecord {
  conversionId?: string;
  orderId?: string;
  merchant: string;
  productSlug?: string;
  orderValue?: number;
  commission?: number;
  currency?: string;
  network?: string;
  timestamp: string;
}
