import { NextRequest, NextResponse } from 'next/server';
import { productRepository } from '@/lib/data';
import { ClickEvent } from '@/types/analytics';
import { classifyTrafficType, detectDeviceType } from './bot-detector';
import { extractAttribution, normalizeMerchant } from './attribution-context';
import { ClickTracker } from './click-tracker';

import { authorizeAnalyticsRequest } from './auth';

/**
 * Validates destination URL security.
 * Rejects javascript:, data:, file:, and malformed protocols.
 */
export function validateDestinationUrl(urlStr: string): string | null {
  if (!urlStr || urlStr.trim().length === 0) return null;

  try {
    const parsed = new URL(urlStr.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export async function redirectToAffiliate(
  slug: string,
  request: NextRequest
): Promise<NextResponse> {
  const currentUrl = new URL(request.url);
  const fallbackRedirect = new URL('/product-unavailable', request.url);
  fallbackRedirect.searchParams.set('item', slug);

  // Check if this is an authorized admin preview
  const isPreview = currentUrl.searchParams.get('preview') === 'true';
  const isAdminAuthorized = isPreview && authorizeAnalyticsRequest(request) === null;

  // 1. Resolve product strictly from trusted repository
  let product = await productRepository.getProductBySlug(slug);
  if (!product && isAdminAuthorized && productRepository.getProductBySlugAdmin) {
    product = await productRepository.getProductBySlugAdmin(slug);
  }

  // 2. Publication & Status Verification (Section 11)
  // Must be active/published (or draft strictly during authorized admin preview).
  const isAllowedStatus = product && (product.status === 'active' || (isAdminAuthorized && product.status === 'draft'));
  if (!product || !isAllowedStatus) {
    return NextResponse.redirect(fallbackRedirect, {
      status: 307,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // 3. Validate destination protocol and format (Section 9 & 10)
  const safeDestination = validateDestinationUrl(product.affiliateUrl);
  if (!safeDestination) {
    // eslint-disable-next-line no-console
    console.error(`[Security Warning] Unsafe or invalid affiliate destination for product ${slug}:`, product.affiliateUrl);
    return NextResponse.redirect(fallbackRedirect, {
      status: 307,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // 4. Attribution & Device Analysis
  const referrer = request.headers.get('referer') || '';
  const userAgent = request.headers.get('user-agent') || '';
  const deviceType = detectDeviceType(userAgent);
  const trafficType = classifyTrafficType(userAgent);
  const attribution = extractAttribution(currentUrl, referrer, userAgent);
  const merchant = normalizeMerchant(product.store, product.brand);

  // 5. Build ClickEvent
  const clickEvent: ClickEvent = {
    id: `clk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    productId: product.id,
    productSlug: product.slug,
    timestamp: new Date().toISOString(),
    referrer,
    landingPage: currentUrl.pathname,
    userAgent,
    deviceType,
    trafficType,
    source: attribution.source,
    merchant,
    affiliateDestination: safeDestination,
    utmSource: attribution.utmSource,
    utmMedium: attribution.utmMedium,
    utmCampaign: attribution.utmCampaign,
    utmContent: attribution.utmContent,
    utmTerm: attribution.utmTerm,
    contentId: attribution.contentId,
    campaignId: attribution.campaignId,
    sessionId: attribution.sessionId,
    createdAt: new Date().toISOString(),
  };

  // 6. Record event asynchronously with fail-safe isolation
  try {
    ClickTracker.recordClick(clickEvent);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Analytics Warning] Failed to log affiliate click; proceeding with redirect:', err);
  }

  // 7. Immediate HTTP 307 Temporary Redirect with anti-caching headers (Section 12)
  return NextResponse.redirect(safeDestination, {
    status: 307,
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
