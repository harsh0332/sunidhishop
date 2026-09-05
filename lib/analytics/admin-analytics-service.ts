import { ClickTracker } from '@/lib/analytics/click-tracker';
import { EventTracker } from '@/lib/analytics/event-tracker';
import { productRepository } from '@/lib/data';
import {
  ActionableInsight,
  AdminOverviewKPIs,
  CampaignPerformanceMetric,
  CategoryPerformanceMetric,
  ClickEvent,
  ContentPerformanceMetric,
  DevicePerformanceMetric,
  ProductPerformanceMetric,
  RecentActivityItem,
  SourcePerformanceMetric,
  TimeSeriesPoint,
  UtmPerformanceMetric,
} from '@/types/analytics';

export interface DateFilter {
  range?: 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';
  startDate?: string; // ISO string or YYYY-MM-DD
  endDate?: string;   // ISO string or YYYY-MM-DD
  humanOnly?: boolean;
}

export class AdminAnalyticsService {
  /**
   * Resolves the start and end Date objects for a date filter
   */
  public static resolveDateRange(filter?: DateFilter): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
    const end = filter?.endDate ? new Date(filter.endDate) : new Date();
    // Ensure end of day if just a date string
    if (filter?.endDate && filter.endDate.length === 10) {
      end.setHours(23, 59, 59, 999);
    }

    const range = filter?.range || '7d';
    let start = new Date(end);

    if (range === 'today') {
      start = new Date(end);
      start.setHours(0, 0, 0, 0);
    } else if (range === '7d') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (range === '30d') {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (range === '90d') {
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
    } else if (range === 'all') {
      start = new Date(2025, 0, 1);
    } else if (range === 'custom' && filter?.startDate) {
      start = new Date(filter.startDate);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    }

    // Previous period for comparison
    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    return { start, end, prevStart, prevEnd };
  }

  /**
   * Helper to filter click events
   */
  private static filterClicks(clicks: ClickEvent[], start: Date, end: Date, humanOnly: boolean): ClickEvent[] {
    const startMs = start.getTime();
    const endMs = end.getTime();

    return clicks.filter(c => {
      const t = new Date(c.timestamp).getTime();
      if (t < startMs || t > endMs) return false;
      if (humanOnly && c.trafficType !== 'human') return false;
      return true;
    });
  }

  /**
   * Helper to filter general telemetry events
   */
  private static filterEvents(start: Date, end: Date, humanOnly: boolean) {
    const startMs = start.getTime();
    const endMs = end.getTime();

    return EventTracker.getAllEvents().filter(e => {
      const t = new Date(e.timestamp).getTime();
      if (t < startMs || t > endMs) return false;
      if (humanOnly && e.trafficType === 'bot') return false;
      return true;
    });
  }

  /**
   * Overview KPIs + Trend Chart + Insights
   */
  public static async getOverview(filter?: DateFilter): Promise<AdminOverviewKPIs> {
    const humanOnly = filter?.humanOnly !== false; // Default true
    const { start, end, prevStart, prevEnd } = this.resolveDateRange(filter);

    const allClicks = ClickTracker.getRecentClicks(10000);
    const currentClicks = this.filterClicks(allClicks, start, end, humanOnly);
    const prevClicks = this.filterClicks(allClicks, prevStart, prevEnd, humanOnly);

    const currentEvents = this.filterEvents(start, end, humanOnly);
    const prevEvents = this.filterEvents(prevStart, prevEnd, humanOnly);

    // Current period metrics
    const currentVisitors = new Set<string>();
    currentClicks.forEach(c => c.sessionId && currentVisitors.add(c.sessionId));
    currentEvents.forEach(e => e.sessionId && currentVisitors.add(e.sessionId));

    const currentViews = currentEvents.filter(e => e.eventType === 'product_view').length;
    const currentClicksCount = currentClicks.length;
    const currentImpressions = currentEvents.filter(e => e.eventType === 'product_impression').length;
    const currentContentViews = currentEvents.filter(e => e.eventType === 'content_view').length;
    const currentCtr = currentViews > 0 ? Number(((currentClicksCount / currentViews) * 100).toFixed(1)) : 0;

    // Previous period metrics
    const prevVisitors = new Set<string>();
    prevClicks.forEach(c => c.sessionId && prevVisitors.add(c.sessionId));
    prevEvents.forEach(e => e.sessionId && prevVisitors.add(e.sessionId));

    const prevViews = prevEvents.filter(e => e.eventType === 'product_view').length;
    const prevClicksCount = prevClicks.length;
    const prevCtr = prevViews > 0 ? Number(((prevClicksCount / prevViews) * 100).toFixed(1)) : 0;

    const calcDelta = (cur: number, prev: number): number | null => {
      if (prev === 0) return cur > 0 ? 100 : null;
      return Number((((cur - prev) / prev) * 100).toFixed(1));
    };

    // Quality breakdown (from allClicks in period regardless of humanOnly toggle)
    const rawPeriodClicks = this.filterClicks(allClicks, start, end, false);
    const humanClicks = rawPeriodClicks.filter(c => c.trafficType === 'human').length;
    const botClicks = rawPeriodClicks.filter(c => c.trafficType === 'bot').length;
    const unknownClicks = rawPeriodClicks.filter(c => c.trafficType !== 'human' && c.trafficType !== 'bot').length;
    const humanPercentage = rawPeriodClicks.length > 0
      ? Number(((humanClicks / rawPeriodClicks.length) * 100).toFixed(1))
      : 100;

    // Daily time-series trend
    const trendMap = new Map<string, { visitors: Set<string>; views: number; clicks: number }>();

    // Seed all dates in the range so chart has no gaps
    const cursor = new Date(start);
    while (cursor <= end) {
      const dateKey = cursor.toISOString().slice(0, 10);
      trendMap.set(dateKey, { visitors: new Set<string>(), views: 0, clicks: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    currentEvents.forEach(e => {
      const d = e.timestamp.slice(0, 10);
      const entry = trendMap.get(d) || { visitors: new Set<string>(), views: 0, clicks: 0 };
      if (e.sessionId) entry.visitors.add(e.sessionId);
      if (e.eventType === 'product_view') entry.views++;
      trendMap.set(d, entry);
    });

    currentClicks.forEach(c => {
      const d = c.timestamp.slice(0, 10);
      const entry = trendMap.get(d) || { visitors: new Set<string>(), views: 0, clicks: 0 };
      if (c.sessionId) entry.visitors.add(c.sessionId);
      entry.clicks++;
      trendMap.set(d, entry);
    });

    const trend: TimeSeriesPoint[] = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        visitors: data.visitors.size,
        views: data.views,
        clicks: data.clicks,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Actionable Insights (Deterministic & grounded in real data)
    const insights: ActionableInsight[] = [];

    if (currentClicksCount > 0) {
      // Find top clicked product
      const productCounts = new Map<string, number>();
      currentClicks.forEach(c => {
        productCounts.set(c.productSlug, (productCounts.get(c.productSlug) || 0) + 1);
      });
      const topSlug = Array.from(productCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topSlug) {
        const share = Math.round((topSlug[1] / currentClicksCount) * 100);
        insights.push({
          id: 'top-product',
          type: 'success',
          title: 'Top Performing Product',
          description: `"${topSlug[0].replace(/-/g, ' ')}" generated ${topSlug[1]} clicks (${share}% of all affiliate clicks in this period).`,
          metric: `${share}% share`,
        });
      }

      // Check Instagram Reel attribution
      const reelClicks = currentClicks.filter(c => c.contentId);
      if (reelClicks.length > 0) {
        const reelShare = Math.round((reelClicks.length / currentClicksCount) * 100);
        insights.push({
          id: 'reel-impact',
          type: 'opportunity',
          title: 'Creator Content Momentum',
          description: `Creator content and Reels directly contributed ${reelClicks.length} outbound clicks (${reelShare}% of total).`,
          metric: `${reelShare}% from Reels`,
        });
      }

      // Top merchant
      const merchantCounts = new Map<string, number>();
      currentClicks.forEach(c => {
        merchantCounts.set(c.merchant, (merchantCounts.get(c.merchant) || 0) + 1);
      });
      const topMerchant = Array.from(merchantCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topMerchant) {
        insights.push({
          id: 'top-merchant',
          type: 'info',
          title: 'Primary Destination Merchant',
          description: `${topMerchant[0]} received the largest share of outbound shopper traffic (${topMerchant[1]} clicks).`,
          metric: topMerchant[0],
        });
      }
    } else {
      insights.push({
        id: 'no-clicks-yet',
        type: 'info',
        title: 'Awaiting Affiliate Outbound Traffic',
        description: 'No outbound affiliate clicks recorded in this date range yet. Add new products or feature items in upcoming Reels.',
      });
    }

    return {
      totalVisitors: currentVisitors.size,
      productViews: currentViews,
      affiliateClicks: currentClicksCount,
      affiliateCtr: currentCtr,
      productImpressions: currentImpressions,
      contentViews: currentContentViews,
      periodComparison: {
        visitorsChangePct: calcDelta(currentVisitors.size, prevVisitors.size),
        viewsChangePct: calcDelta(currentViews, prevViews),
        clicksChangePct: calcDelta(currentClicksCount, prevClicksCount),
        ctrChangePct: calcDelta(currentCtr, prevCtr),
      },
      trend,
      trafficQuality: {
        totalClicks: rawPeriodClicks.length,
        humanClicks,
        botClicks,
        unknownClicks,
        humanPercentage,
      },
      insights,
    };
  }

  /**
   * Product Performance Table with High-Intent and Underperforming segmentation
   */
  public static async getProductPerformance(filter?: DateFilter & {
    category?: string;
    store?: string;
    status?: string;
    searchQuery?: string;
    sortBy?: 'clicks' | 'views' | 'ctr';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    products: ProductPerformanceMetric[];
    highIntentProducts: ProductPerformanceMetric[];
    underperformingProducts: ProductPerformanceMetric[];
    totalCount: number;
  }> {
    const humanOnly = filter?.humanOnly !== false;
    const { start, end } = this.resolveDateRange(filter);

    const allClicks = ClickTracker.getRecentClicks(10000);
    const periodClicks = this.filterClicks(allClicks, start, end, humanOnly);
    const periodEvents = this.filterEvents(start, end, humanOnly);

    // Map clicks and views by slug/id
    const clicksBySlug = new Map<string, number>();
    periodClicks.forEach(c => {
      const key = c.productSlug || c.productId;
      clicksBySlug.set(key, (clicksBySlug.get(key) || 0) + 1);
    });

    const viewsBySlug = new Map<string, number>();
    const impressionsBySlug = new Map<string, number>();

    periodEvents.forEach(e => {
      const key = e.productSlug || e.productId;
      if (!key) return;
      if (e.eventType === 'product_view') {
        viewsBySlug.set(key, (viewsBySlug.get(key) || 0) + 1);
      } else if (e.eventType === 'product_impression') {
        impressionsBySlug.set(key, (impressionsBySlug.get(key) || 0) + 1);
      }
    });

    const catalog = await productRepository.getAllProducts();

    let productMetrics: ProductPerformanceMetric[] = catalog.map(p => {
      const views = viewsBySlug.get(p.slug) || viewsBySlug.get(p.id) || 0;
      const clicks = clicksBySlug.get(p.slug) || clicksBySlug.get(p.id) || 0;
      const impressions = impressionsBySlug.get(p.slug) || impressionsBySlug.get(p.id) || 0;
      const ctr = views > 0 ? Number(((clicks / views) * 100).toFixed(1)) : 0;

      const isHighIntent = views >= 3 && clicks >= 2 && ctr >= 15;
      const isUnderperforming = (views >= 10 || impressions >= 15) && clicks === 0;

      return {
        productId: p.id,
        productSlug: p.slug,
        title: p.title,
        category: p.category,
        brand: p.brand,
        store: p.store,
        price: p.price,
        impressions,
        views,
        clicks,
        ctr,
        status: p.status,
        featured: p.featured,
        trending: p.trending,
        isHighIntent,
        isUnderperforming,
      };
    });

    // Apply search and categorical filters
    if (filter?.category && filter.category !== 'all') {
      productMetrics = productMetrics.filter(p => p.category.toLowerCase() === filter.category?.toLowerCase());
    }
    if (filter?.store && filter.store !== 'all') {
      productMetrics = productMetrics.filter(p => p.store.toLowerCase() === filter.store?.toLowerCase());
    }
    if (filter?.status && filter.status !== 'all') {
      productMetrics = productMetrics.filter(p => p.status === filter.status);
    }
    if (filter?.searchQuery) {
      const q = filter.searchQuery.toLowerCase().trim();
      productMetrics = productMetrics.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.productSlug.toLowerCase().includes(q)
      );
    }

    // Sort
    const sortBy = filter?.sortBy || 'clicks';
    const sortOrder = filter?.sortOrder || 'desc';

    productMetrics.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'clicks') diff = b.clicks - a.clicks;
      else if (sortBy === 'views') diff = b.views - a.views;
      else if (sortBy === 'ctr') diff = b.ctr - a.ctr;
      return sortOrder === 'desc' ? diff : -diff;
    });

    const highIntentProducts = productMetrics.filter(p => p.isHighIntent).slice(0, 5);
    const underperformingProducts = productMetrics.filter(p => p.isUnderperforming).slice(0, 5);

    return {
      products: productMetrics,
      highIntentProducts,
      underperformingProducts,
      totalCount: productMetrics.length,
    };
  }

  /**
   * Category Breakdown
   */
  public static async getCategories(filter?: DateFilter): Promise<CategoryPerformanceMetric[]> {
    const perf = await this.getProductPerformance(filter);
    const map = new Map<string, { count: number; views: number; clicks: number }>();

    let totalClicks = 0;
    perf.products.forEach(p => {
      const cat = p.category || 'Other';
      const entry = map.get(cat) || { count: 0, views: 0, clicks: 0 };
      entry.count++;
      entry.views += p.views;
      entry.clicks += p.clicks;
      totalClicks += p.clicks;
      map.set(cat, entry);
    });

    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        productCount: data.count,
        views: data.views,
        clicks: data.clicks,
        ctr: data.views > 0 ? Number(((data.clicks / data.views) * 100).toFixed(1)) : 0,
        shareOfClicks: totalClicks > 0 ? Number(((data.clicks / totalClicks) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }

  /**
   * Merchant Breakdown
   */
  public static async getMerchants(filter?: DateFilter) {
    const humanOnly = filter?.humanOnly !== false;
    const { start, end } = this.resolveDateRange(filter);

    const allClicks = ClickTracker.getRecentClicks(10000);
    const periodClicks = this.filterClicks(allClicks, start, end, humanOnly);

    const map = new Map<string, { total: number; human: number; sessions: Set<string>; last: string }>();
    const totalClicks = periodClicks.length;

    periodClicks.forEach(c => {
      const entry = map.get(c.merchant) || {
        total: 0,
        human: 0,
        sessions: new Set<string>(),
        last: c.timestamp,
      };
      entry.total++;
      if (c.trafficType === 'human') entry.human++;
      if (c.sessionId) entry.sessions.add(c.sessionId);
      if (new Date(c.timestamp) > new Date(entry.last)) entry.last = c.timestamp;
      map.set(c.merchant, entry);
    });

    return Array.from(map.entries())
      .map(([merchant, data]) => ({
        merchant,
        totalClicks: data.total,
        humanClicks: data.human,
        uniqueSessions: data.sessions.size,
        shareOfClicks: totalClicks > 0 ? Number(((data.total / totalClicks) * 100).toFixed(1)) : 0,
        lastClickedAt: data.last,
      }))
      .sort((a, b) => b.totalClicks - a.totalClicks);
  }

  /**
   * Content / Reel Performance
   */
  public static async getContentPerformance(filter?: DateFilter): Promise<ContentPerformanceMetric[]> {
    const humanOnly = filter?.humanOnly !== false;
    const { start, end } = this.resolveDateRange(filter);

    const allClicks = ClickTracker.getRecentClicks(10000);
    const periodClicks = this.filterClicks(allClicks, start, end, humanOnly);
    const periodEvents = this.filterEvents(start, end, humanOnly);

    const map = new Map<string, {
      type: string;
      title: string;
      views: number;
      productClicks: number;
      affiliateClicks: number;
      products: Map<string, { title: string; clicks: number }>;
    }>();

    // 1. Content Views
    periodEvents.forEach(e => {
      if (e.contentId) {
        const entry = map.get(e.contentId) || {
          type: 'reel',
          title: e.contentId.replace(/_/g, ' ').toUpperCase(),
          views: 0,
          productClicks: 0,
          affiliateClicks: 0,
          products: new Map(),
        };
        if (e.eventType === 'content_view') entry.views++;
        if (e.eventType === 'content_product_click') entry.productClicks++;
        map.set(e.contentId, entry);
      }
    });

    // 2. Affiliate Clicks with Content Attribution
    periodClicks.forEach(c => {
      if (c.contentId) {
        const entry = map.get(c.contentId) || {
          type: 'reel',
          title: c.contentId.replace(/_/g, ' ').toUpperCase(),
          views: 0,
          productClicks: 0,
          affiliateClicks: 0,
          products: new Map(),
        };
        entry.affiliateClicks++;
        const prod = entry.products.get(c.productSlug) || { title: c.productSlug, clicks: 0 };
        prod.clicks++;
        entry.products.set(c.productSlug, prod);
        map.set(c.contentId, entry);
      }
    });

    return Array.from(map.entries())
      .map(([contentId, data]) => ({
        contentId,
        contentType: data.type,
        title: data.title,
        views: data.views,
        productClicks: data.productClicks,
        affiliateClicks: data.affiliateClicks,
        topProducts: Array.from(data.products.entries())
          .map(([slug, p]) => ({ slug, title: p.title, clicks: p.clicks }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 3),
      }))
      .sort((a, b) => b.affiliateClicks - a.affiliateClicks);
  }

  /**
   * Campaign Performance
   */
  public static async getCampaignPerformance(filter?: DateFilter): Promise<CampaignPerformanceMetric[]> {
    const humanOnly = filter?.humanOnly !== false;
    const { start, end } = this.resolveDateRange(filter);

    const allClicks = ClickTracker.getRecentClicks(10000);
    const periodClicks = this.filterClicks(allClicks, start, end, humanOnly);
    const periodEvents = this.filterEvents(start, end, humanOnly);

    const map = new Map<string, {
      name: string;
      views: number;
      productViews: number;
      affiliateClicks: number;
      products: Map<string, { title: string; clicks: number }>;
    }>();

    periodEvents.forEach(e => {
      if (e.campaignId) {
        const entry = map.get(e.campaignId) || {
          name: e.campaignId.replace(/_/g, ' ').toUpperCase(),
          views: 0,
          productViews: 0,
          affiliateClicks: 0,
          products: new Map(),
        };
        if (e.eventType === 'campaign_view') entry.views++;
        if (e.eventType === 'product_view') entry.productViews++;
        map.set(e.campaignId, entry);
      }
    });

    periodClicks.forEach(c => {
      if (c.campaignId) {
        const entry = map.get(c.campaignId) || {
          name: c.campaignId.replace(/_/g, ' ').toUpperCase(),
          views: 0,
          productViews: 0,
          affiliateClicks: 0,
          products: new Map(),
        };
        entry.affiliateClicks++;
        const prod = entry.products.get(c.productSlug) || { title: c.productSlug, clicks: 0 };
        prod.clicks++;
        entry.products.set(c.productSlug, prod);
        map.set(c.campaignId, entry);
      }
    });

    return Array.from(map.entries())
      .map(([campaignId, data]) => ({
        campaignId,
        name: data.name,
        views: data.views,
        productViews: data.productViews,
        affiliateClicks: data.affiliateClicks,
        ctr: data.productViews > 0 ? Number(((data.affiliateClicks / data.productViews) * 100).toFixed(1)) : 0,
        topProducts: Array.from(data.products.entries())
          .map(([slug, p]) => ({ slug, title: p.title, clicks: p.clicks }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 3),
      }))
      .sort((a, b) => b.affiliateClicks - a.affiliateClicks);
  }

  /**
   * Traffic Sources and UTM Performance
   */
  public static async getSources(filter?: DateFilter): Promise<{
    sources: SourcePerformanceMetric[];
    utms: UtmPerformanceMetric[];
  }> {
    const humanOnly = filter?.humanOnly !== false;
    const { start, end } = this.resolveDateRange(filter);

    const allClicks = ClickTracker.getRecentClicks(10000);
    const periodClicks = this.filterClicks(allClicks, start, end, humanOnly);
    const periodEvents = this.filterEvents(start, end, humanOnly);

    const sourceMap = new Map<string, { visitors: Set<string>; views: number; clicks: number }>();
    const totalClicks = periodClicks.length;

    const normalizeSource = (src?: string, ref?: string) => {
      const combined = `${src || ''} ${ref || ''}`.toLowerCase();
      if (combined.includes('instagram') || combined.includes('ig')) return 'Instagram';
      if (combined.includes('google')) return 'Google Search';
      if (combined.includes('whatsapp')) return 'WhatsApp';
      if (combined.includes('facebook') || combined.includes('fb')) return 'Facebook';
      if (combined.includes('direct') || (!src && !ref)) return 'Direct';
      return 'Other Referral';
    };

    periodEvents.forEach(e => {
      const src = normalizeSource(e.source, e.referrer);
      const entry = sourceMap.get(src) || { visitors: new Set<string>(), views: 0, clicks: 0 };
      if (e.sessionId) entry.visitors.add(e.sessionId);
      if (e.eventType === 'product_view') entry.views++;
      sourceMap.set(src, entry);
    });

    periodClicks.forEach(c => {
      const src = normalizeSource(c.source, c.referrer);
      const entry = sourceMap.get(src) || { visitors: new Set<string>(), views: 0, clicks: 0 };
      if (c.sessionId) entry.visitors.add(c.sessionId);
      entry.clicks++;
      sourceMap.set(src, entry);
    });

    const sources: SourcePerformanceMetric[] = Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        visitors: data.visitors.size,
        views: data.views,
        clicks: data.clicks,
        ctr: data.views > 0 ? Number(((data.clicks / data.views) * 100).toFixed(1)) : 0,
        shareOfClicks: totalClicks > 0 ? Number(((data.clicks / totalClicks) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    // UTM Breakdown
    const utmMap = new Map<string, {
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
      visitors: Set<string>;
      views: number;
      clicks: number;
    }>();

    periodEvents.forEach(e => {
      if (e.utmSource || e.utmCampaign) {
        const key = `${e.utmSource || '-'}_${e.utmMedium || '-'}_${e.utmCampaign || '-'}_${e.utmContent || '-'}`;
        const entry = utmMap.get(key) || {
          utmSource: e.utmSource,
          utmMedium: e.utmMedium,
          utmCampaign: e.utmCampaign,
          utmContent: e.utmContent,
          visitors: new Set<string>(),
          views: 0,
          clicks: 0,
        };
        if (e.sessionId) entry.visitors.add(e.sessionId);
        if (e.eventType === 'product_view') entry.views++;
        utmMap.set(key, entry);
      }
    });

    periodClicks.forEach(c => {
      if (c.utmSource || c.utmCampaign) {
        const key = `${c.utmSource || '-'}_${c.utmMedium || '-'}_${c.utmCampaign || '-'}_${c.utmContent || '-'}`;
        const entry = utmMap.get(key) || {
          utmSource: c.utmSource,
          utmMedium: c.utmMedium,
          utmCampaign: c.utmCampaign,
          utmContent: c.utmContent,
          visitors: new Set<string>(),
          views: 0,
          clicks: 0,
        };
        if (c.sessionId) entry.visitors.add(c.sessionId);
        entry.clicks++;
        utmMap.set(key, entry);
      }
    });

    const utms: UtmPerformanceMetric[] = Array.from(utmMap.values())
      .map(u => ({
        utmSource: u.utmSource,
        utmMedium: u.utmMedium,
        utmCampaign: u.utmCampaign,
        utmContent: u.utmContent,
        visitors: u.visitors.size,
        views: u.views,
        clicks: u.clicks,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    return { sources, utms };
  }

  /**
   * Device Breakdown
   */
  public static async getDevices(filter?: DateFilter): Promise<DevicePerformanceMetric[]> {
    const humanOnly = filter?.humanOnly !== false;
    const { start, end } = this.resolveDateRange(filter);

    const allClicks = ClickTracker.getRecentClicks(10000);
    const periodClicks = this.filterClicks(allClicks, start, end, humanOnly);
    const periodEvents = this.filterEvents(start, end, humanOnly);

    const map = new Map<string, { visitors: Set<string>; views: number; clicks: number }>();
    const totalClicks = periodClicks.length;

    periodEvents.forEach(e => {
      const dev = e.deviceType || 'unknown';
      const entry = map.get(dev) || { visitors: new Set<string>(), views: 0, clicks: 0 };
      if (e.sessionId) entry.visitors.add(e.sessionId);
      if (e.eventType === 'product_view') entry.views++;
      map.set(dev, entry);
    });

    periodClicks.forEach(c => {
      const dev = c.deviceType || 'unknown';
      const entry = map.get(dev) || { visitors: new Set<string>(), views: 0, clicks: 0 };
      if (c.sessionId) entry.visitors.add(c.sessionId);
      entry.clicks++;
      map.set(dev, entry);
    });

    return Array.from(map.entries())
      .map(([deviceType, data]) => ({
        deviceType: deviceType as any,
        visitors: data.visitors.size,
        views: data.views,
        clicks: data.clicks,
        ctr: data.views > 0 ? Number(((data.clicks / data.views) * 100).toFixed(1)) : 0,
        shareOfClicks: totalClicks > 0 ? Number(((data.clicks / totalClicks) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }

  /**
   * Recent Activity Log (anonymized, zero PII)
   */
  public static async getRecentActivity(limit = 50): Promise<RecentActivityItem[]> {
    const clicks = ClickTracker.getRecentClicks(limit);
    const events = EventTracker.getAllEvents().slice(-limit);

    const combined: RecentActivityItem[] = [
      ...clicks.map(c => ({
        id: c.id,
        timestamp: c.timestamp,
        eventType: 'Affiliate Outbound Click',
        productSlug: c.productSlug,
        productTitle: c.productSlug.replace(/-/g, ' '),
        merchant: c.merchant,
        source: c.source || 'Product Page',
        trafficType: c.trafficType,
      })),
      ...events.map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        eventType: e.eventType === 'product_view' ? 'Product View'
          : e.eventType === 'content_view' ? 'Reel Look View'
          : e.eventType === 'product_impression' ? 'Product Impression'
          : e.eventType,
        productSlug: e.productSlug,
        productTitle: e.productTitle || e.productSlug?.replace(/-/g, ' '),
        merchant: e.store || e.merchant,
        source: e.source || 'Storefront',
        trafficType: e.trafficType || 'unknown',
      })),
    ];

    return combined
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Product Detail Analytics Drill-Down
   */
  public static async getProductDetail(slugOrId: string) {
    const catalog = await productRepository.getAllProducts();
    const product = catalog.find(p => p.slug === slugOrId || p.id === slugOrId);

    const allClicks = ClickTracker.getRecentClicks(10000).filter(
      c => c.productSlug === slugOrId || c.productId === slugOrId
    );
    const allEvents = EventTracker.getAllEvents().filter(
      e => e.productSlug === slugOrId || e.productId === slugOrId
    );

    const views = allEvents.filter(e => e.eventType === 'product_view').length;
    const clicks = allClicks.length;
    const ctr = views > 0 ? Number(((clicks / views) * 100).toFixed(1)) : 0;

    // Traffic sources
    const sources = new Map<string, number>();
    allClicks.forEach(c => {
      const s = c.source || 'Direct';
      sources.set(s, (sources.get(s) || 0) + 1);
    });

    // Content associations
    const contents = new Map<string, number>();
    allClicks.forEach(c => {
      if (c.contentId) contents.set(c.contentId, (contents.get(c.contentId) || 0) + 1);
    });

    // Daily breakdown for last 14 days
    const daily = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      daily.set(d.toISOString().slice(0, 10), 0);
    }
    allClicks.forEach(c => {
      const d = c.timestamp.slice(0, 10);
      if (daily.has(d)) daily.set(d, (daily.get(d) || 0) + 1);
    });

    return {
      product: product || {
        id: slugOrId,
        slug: slugOrId,
        title: slugOrId.replace(/-/g, ' '),
        category: 'Unknown',
        store: 'External',
        price: 0,
      },
      views,
      clicks,
      ctr,
      topSources: Array.from(sources.entries()).map(([source, count]) => ({ source, count })),
      topContent: Array.from(contents.entries()).map(([contentId, count]) => ({ contentId, count })),
      dailyClicks: Array.from(daily.entries()).map(([date, count]) => ({ date, count })),
    };
  }

  /**
   * CSV Data Generator
   */
  public static async generateCsv(type: 'products' | 'daily' | 'content' | 'campaigns'): Promise<string> {
    if (type === 'products') {
      const data = await this.getProductPerformance({ range: 'all' });
      const rows = [
        ['Product Title', 'Slug', 'Category', 'Store', 'Price', 'Views', 'Clicks', 'CTR (%)', 'Status'].join(','),
        ...data.products.map(p => [
          `"${p.title.replace(/"/g, '""')}"`,
          p.productSlug,
          `"${p.category}"`,
          `"${p.store}"`,
          p.price,
          p.views,
          p.clicks,
          p.ctr,
          p.status,
        ].join(',')),
      ];
      return rows.join('\n');
    }

    if (type === 'daily') {
      const overview = await this.getOverview({ range: '30d' });
      const rows = [
        ['Date', 'Visitors', 'Product Views', 'Affiliate Clicks'].join(','),
        ...overview.trend.map(t => [t.date, t.visitors, t.views, t.clicks].join(',')),
      ];
      return rows.join('\n');
    }

    if (type === 'content') {
      const data = await this.getContentPerformance({ range: 'all' });
      const rows = [
        ['Content ID', 'Type', 'Title', 'Sunidhi.shop Views', 'Product Clicks', 'Affiliate Clicks'].join(','),
        ...data.map(c => [
          c.contentId,
          c.contentType,
          `"${c.title.replace(/"/g, '""')}"`,
          c.views,
          c.productClicks,
          c.affiliateClicks,
        ].join(',')),
      ];
      return rows.join('\n');
    }

    if (type === 'campaigns') {
      const data = await this.getCampaignPerformance({ range: 'all' });
      const rows = [
        ['Campaign ID', 'Name', 'Views', 'Product Views', 'Affiliate Clicks', 'CTR (%)'].join(','),
        ...data.map(c => [
          c.campaignId,
          `"${c.name.replace(/"/g, '""')}"`,
          c.views,
          c.productViews,
          c.affiliateClicks,
          c.ctr,
        ].join(',')),
      ];
      return rows.join('\n');
    }

    return '';
  }
}
