import { NextRequest, NextResponse } from 'next/server';
import { authorizeAnalyticsRequest } from '@/lib/analytics/auth';
import { ClickTracker } from '@/lib/analytics/click-tracker';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorizedResponse = authorizeAnalyticsRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  const metrics = ClickTracker.getProductMetrics();

  return NextResponse.json({
    totalProductsTracked: metrics.length,
    products: metrics,
    generatedAt: new Date().toISOString(),
  });
}
