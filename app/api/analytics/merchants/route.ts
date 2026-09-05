import { NextRequest, NextResponse } from 'next/server';
import { authorizeAnalyticsRequest } from '@/lib/analytics/auth';
import { ClickTracker } from '@/lib/analytics/click-tracker';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorizedResponse = authorizeAnalyticsRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  const metrics = ClickTracker.getMerchantMetrics();

  return NextResponse.json({
    totalMerchantsTracked: metrics.length,
    merchants: metrics,
    generatedAt: new Date().toISOString(),
  });
}
