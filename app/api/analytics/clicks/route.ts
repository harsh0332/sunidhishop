import { NextRequest, NextResponse } from 'next/server';
import { authorizeAnalyticsRequest } from '@/lib/analytics/auth';
import { ClickTracker } from '@/lib/analytics/click-tracker';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorizedResponse = authorizeAnalyticsRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 1000) : 100;
  const productId = searchParams.get('productId') || undefined;
  const merchant = searchParams.get('merchant') || undefined;
  const trafficType = searchParams.get('trafficType') || undefined;

  const clicks = ClickTracker.getRecentClicks(limit, {
    productId,
    merchant,
    trafficType,
  });

  return NextResponse.json({
    count: clicks.length,
    clicks,
    generatedAt: new Date().toISOString(),
  });
}
