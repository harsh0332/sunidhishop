import { StandardAnalyticsEventName, EventProperties, DeviceType } from '@/types/analytics';
import { logger } from './monitoring';

/**
 * Normalizes client device category from user agent string
 */
function getClientDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'unknown';
  const ua = window.navigator.userAgent.toLowerCase();

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    )
  ) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Normalizes referrer host into a privacy-safe category
 */
function normalizeReferrer(refStr: string): string {
  if (!refStr || refStr.trim().length === 0) return 'direct';
  const ref = refStr.toLowerCase();

  if (ref.includes('instagram.com') || ref.includes('ig.me')) return 'instagram';
  if (ref.includes('google.')) return 'google';
  if (ref.includes('facebook.com') || ref.includes('fb.me')) return 'facebook';
  if (ref.includes('youtube.com') || ref.includes('youtu.be')) return 'youtube';
  if (ref.includes('pinterest.')) return 'pinterest';
  if (ref.includes('twitter.com') || ref.includes('t.co') || ref.includes('x.com')) return 'twitter';

  try {
    const parsed = new URL(refStr);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'external';
  }
}

/**
 * Manages privacy-friendly, session-persistent attribution tags (UTMs & creator content IDs).
 * Ensures that if a user lands from an Instagram Reel (e.g. ?utm_source=instagram&content=reel_27),
 * that context remains attached to all product impressions, views, and outbound affiliate clicks.
 */
class SessionAttributionContext {
  private memoryCache: Partial<EventProperties> = {};
  private initialized = false;

  public getContext(): Partial<EventProperties> {
    if (typeof window === 'undefined') return {};

    if (!this.initialized) {
      this.initFromCurrentUrl();
    }

    return { ...this.memoryCache };
  }

  private initFromCurrentUrl(): void {
    if (typeof window === 'undefined') return;

    try {
      // 1. Try reading from sessionStorage
      const saved = window.sessionStorage.getItem('sunidhi_attribution');
      if (saved) {
        this.memoryCache = JSON.parse(saved);
      }

      // 2. Extract fresh parameters if present in URL
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get('utm_source');
      const utmMedium = urlParams.get('utm_medium');
      const utmCampaign = urlParams.get('utm_campaign');
      const utmContent = urlParams.get('utm_content');
      const utmTerm = urlParams.get('utm_term');

      const contentId =
        urlParams.get('content') ||
        urlParams.get('creator_content') ||
        urlParams.get('reel') ||
        urlParams.get('content_id');

      const campaignId =
        urlParams.get('campaign') ||
        urlParams.get('campaign_id') ||
        utmCampaign;

      // Update if newly supplied
      if (utmSource) this.memoryCache.utmSource = utmSource;
      if (utmMedium) this.memoryCache.utmMedium = utmMedium;
      if (utmCampaign) this.memoryCache.utmCampaign = utmCampaign;
      if (utmContent) this.memoryCache.utmContent = utmContent;
      if (utmTerm) this.memoryCache.utmTerm = utmTerm;
      if (contentId) this.memoryCache.contentId = contentId;
      if (campaignId) this.memoryCache.campaignId = campaignId;

      // Set initial referrer if not set
      if (!this.memoryCache.referrer && typeof document !== 'undefined') {
        this.memoryCache.referrer = normalizeReferrer(document.referrer);
      }

      // 3. Persist back to sessionStorage
      window.sessionStorage.setItem(
        'sunidhi_attribution',
        JSON.stringify(this.memoryCache)
      );
    } catch {
      // Storage unavailable or disabled; memory fallback remains intact
    } finally {
      this.initialized = true;
    }
  }

  public setAttribution(newAttrs: Partial<EventProperties>): void {
    if (typeof window === 'undefined') return;
    this.memoryCache = { ...this.memoryCache, ...newAttrs };
    try {
      window.sessionStorage.setItem(
        'sunidhi_attribution',
        JSON.stringify(this.memoryCache)
      );
    } catch {
      // Storage unavailable or disabled
    }
  }
}

const sessionAttribution = new SessionAttributionContext();

export class AnalyticsService {
  private isProduction = process.env.NODE_ENV === 'production';
  private impressedProductIds = new Set<string>();

  /**
   * Universal Centralized Analytics Dispatch: trackEvent(name, properties)
   * All events across sunidhi.shop pass through this single entry point.
   * Guarantees: zero PII, fail-safe isolation, attribution preservation, device normalization.
   */
  public trackEvent(
    name: StandardAnalyticsEventName,
    properties: EventProperties = {}
  ): void {
    try {
      const isClient = typeof window !== 'undefined';
      const attribution = isClient ? sessionAttribution.getContext() : {};

      const enrichedPayload: EventProperties = {
        ...attribution,
        ...properties,
        eventType: name,
        deviceType: properties.deviceType || (isClient ? getClientDeviceType() : 'unknown'),
        referrer: properties.referrer || (isClient ? normalizeReferrer(document.referrer) : undefined),
        source: properties.source || (isClient ? window.location.pathname : 'server'),
        timestamp: properties.timestamp || new Date().toISOString(),
      };

      // Strip any accidental sensitive attributes
      delete enrichedPayload.password;
      delete enrichedPayload.email;
      delete enrichedPayload.phone;
      delete enrichedPayload.token;

      // Delegate to this.track for sink dispatch and mock/interceptor compatibility
      this.track({
        ...enrichedPayload,
        eventType: name,
      });
    } catch (err) {
      // Fail-Safe Isolation: Analytics failure must NEVER crash or block the application
      logger.warn('Failed to dispatch analytics event', { name }, err);
    }
  }

  // --- Convenience Funnel Methods (All route through trackEvent) ---

  public trackPageView(properties?: EventProperties): void {
    this.trackEvent('page_view', properties);
  }

  /**
   * Tracks a product impression only when it scrolls meaningfully into the viewport.
   * Deduplicates per session to prevent scroll-loop noise.
   */
  public trackProductImpression(product: {
    id: string;
    slug: string;
    title: string;
    brand?: string;
    store?: string;
    price?: number;
    category?: string;
    subcategory?: string;
  }): void {
    if (this.impressedProductIds.has(product.id)) {
      return; // Already counted during this session
    }
    this.impressedProductIds.add(product.id);

    this.trackEvent('product_impression', {
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      brand: product.brand,
      store: product.store,
      merchant: product.store,
      price: product.price,
      category: product.category,
      subcategory: product.subcategory,
    });
  }

  public trackProductView(product: {
    id: string;
    slug: string;
    title: string;
    brand?: string;
    store?: string;
    price?: number;
    category?: string;
    subcategory?: string;
  }, source: string = 'product_page'): void {
    this.trackEvent('product_view', {
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      brand: product.brand,
      store: product.store,
      merchant: product.store,
      price: product.price,
      category: product.category,
      subcategory: product.subcategory,
      source,
    });
  }

  public trackCategoryView(category: string, count?: number): void {
    this.trackEvent('category_view', {
      category,
      filterName: 'category',
      filterValue: category,
      resultCount: count,
    });
  }

  public trackSearch(searchQuery: string, resultCount?: number): void {
    if (!searchQuery || searchQuery.trim().length === 0) return;
    this.trackEvent('search', {
      searchQuery: searchQuery.trim(),
      resultCount,
    });
  }

  public trackRelatedProductClick(
    currentProduct: { id: string; slug: string },
    relatedProduct: { id: string; slug: string; title: string; store?: string; price?: number }
  ): void {
    this.trackEvent('related_product_click', {
      productId: relatedProduct.id,
      productSlug: relatedProduct.slug,
      productTitle: relatedProduct.title,
      store: relatedProduct.store,
      merchant: relatedProduct.store,
      price: relatedProduct.price,
      relatedToProductId: currentProduct.id,
      source: 'related_picks',
    });
  }

  public trackAffiliateClick(
    product: {
      id: string;
      slug: string;
      title: string;
      brand?: string;
      store?: string;
      price?: number;
      affiliateUrl?: string;
    },
    placement: string = 'product_cta'
  ): void {
    this.trackEvent('affiliate_click', {
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      brand: product.brand,
      store: product.store,
      merchant: product.store,
      price: product.price,
      affiliateUrl: product.affiliateUrl,
      source: placement,
    });
  }

  public trackContextualLanding(properties: EventProperties): void {
    if (properties.contentId || properties.campaignId) {
      sessionAttribution.setAttribution({
        contentId: properties.contentId,
        campaignId: properties.campaignId,
      });
    }
    this.trackEvent('contextual_landing', properties);
  }

  public trackContentView(contentId: string, properties?: EventProperties): void {
    sessionAttribution.setAttribution({ contentId });
    this.trackEvent('content_view', {
      contentId,
      source: 'content_landing',
      ...properties,
    });
  }

  public trackContentProductClick(
    contentId: string,
    product: { id: string; slug: string; title?: string; price?: number; store?: string }
  ): void {
    this.trackEvent('content_product_click', {
      contentId,
      productId: product.id,
      productSlug: product.slug,
      productTitle: product.title,
      price: product.price,
      merchant: product.store,
      source: 'content_grid',
    });
  }

  public trackCampaignView(campaignId: string, properties?: EventProperties): void {
    sessionAttribution.setAttribution({ campaignId });
    this.trackEvent('campaign_view', {
      campaignId,
      source: 'campaign_landing',
      ...properties,
    });
  }

  public setAttribution(attrs: Partial<EventProperties>): void {
    sessionAttribution.setAttribution(attrs);
  }

  public track(event: EventProperties & { eventType: StandardAnalyticsEventName }): void {
    const isClient = typeof window !== 'undefined';
    if (isClient) {
      if (!this.isProduction) {
        // eslint-disable-next-line no-console
        console.log(`[Sunidhi Analytics: ${event.eventType}]`, event);
      }

      const windowWithAnalytics = window as Window & { dataLayer?: unknown[] };
      if (Array.isArray(windowWithAnalytics.dataLayer)) {
        windowWithAnalytics.dataLayer.push({
          event: event.eventType,
          ...event,
        });
      }

      try {
        window.dispatchEvent(
          new CustomEvent('sunidhi:analytics', {
            detail: { name: event.eventType, properties: event },
          })
        );
      } catch {
        // CustomEvent dispatch failure ignored
      }

      // Non-blocking telemetry ingestion to /api/analytics/event
      try {
        const payload = JSON.stringify(event);
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/event', payload);
        } else {
          fetch('/api/analytics/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Telemetry failure ignored
      }
    }
  }

  public trackOutboundClick(
    product: {
      id: string;
      slug: string;
      title: string;
      brand?: string;
      store?: string;
      price?: number;
      affiliateUrl?: string;
    },
    placement: string = 'card_cta'
  ): void {
    this.trackAffiliateClick(product, placement);
  }
}

export const analytics = new AnalyticsService();

/**
 * Exported standalone helper for ergonomic import:
 * import { trackEvent } from '@/lib/analytics';
 */
export const trackEvent = (
  name: StandardAnalyticsEventName,
  properties?: EventProperties
): void => {
  analytics.trackEvent(name, properties);
};
