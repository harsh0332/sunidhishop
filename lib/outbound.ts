import { Product } from '@/types/product';

/**
 * Centralized abstraction for resolving outbound merchant destinations.
 * 
 * In Phase 1 & 2, this routes through the server-side redirect endpoint
 * `/go/[slug]`, which logs click analytics, validates security headers,
 * and performs an HTTP 307 temporary redirect to the merchant affiliate URL.
 * 
 * All CTAs, cards, and lookbook links MUST use this abstraction rather than
 * scattering raw URLs or direct window.location logic.
 */
export function getProductOutboundUrl(
  product: Pick<Product, 'slug' | 'affiliateUrl'>,
  options?: {
    directAffiliate?: boolean;
    utmSource?: string;
    utmCampaign?: string;
    contentId?: string;
    campaignId?: string;
  }
): string {
  if (options?.directAffiliate && product.affiliateUrl) {
    return product.affiliateUrl;
  }

  // Use the internal tracking & redirect endpoint
  const baseGoPath = `/go/${encodeURIComponent(product.slug)}`;
  
  const params = new URLSearchParams();
  if (options?.utmSource) params.set('utm_source', options.utmSource);
  if (options?.utmCampaign) params.set('utm_campaign', options.utmCampaign);
  if (options?.contentId) params.set('contentId', options.contentId);
  if (options?.campaignId) params.set('campaignId', options.campaignId);

  const queryString = params.toString();
  return queryString ? `${baseGoPath}?${queryString}` : baseGoPath;
}
