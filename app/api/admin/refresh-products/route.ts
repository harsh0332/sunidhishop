import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsProductProvider, productRepository } from '@/lib/data';
import { rateLimiter } from '@/lib/rate-limiter';
import { authorizeAnalyticsRequest } from '@/lib/analytics/auth';
import { OperationsLogger } from '@/lib/data/operations-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown-client';
    const limitCheck = rateLimiter.check(`admin_refresh_${clientIp}`, 10, 60 * 1000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Authorize via cookie, Bearer token, or query secret
    const unauthorized = authorizeAnalyticsRequest(request);
    if (unauthorized) return unauthorized;

    // 1. Invalidate in-memory and static cache
    GoogleSheetsProductProvider.invalidateCache();

    // 2. Warm cache immediately by fetching fresh products
    const freshProducts = await productRepository.getAllProducts();

    OperationsLogger.log(
      'admin_refresh',
      'success',
      `Manual cache refresh triggered. Catalog refreshed with ${freshProducts.length} active products.`,
      clientIp
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Product cache successfully invalidated and re-fetched from Google Sheets',
        refreshedAt: new Date().toISOString(),
        activeProductCount: freshProducts.length,
      },
      { status: 200 }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API /api/admin/refresh-products Error]:', error);
    return NextResponse.json(
      { error: 'Failed to refresh products from Google Sheets', details: String(error) },
      { status: 500 }
    );
  }
}
