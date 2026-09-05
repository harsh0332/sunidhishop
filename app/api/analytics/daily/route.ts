import { NextRequest, NextResponse } from 'next/server';
import { authorizeAnalyticsRequest } from '@/lib/analytics/auth';
import { ClickTracker } from '@/lib/analytics/click-tracker';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorizedResponse = authorizeAnalyticsRequest(request);
  if (unauthorizedResponse) return unauthorizedResponse;

  const metrics = ClickTracker.getDailyMetrics();

  return NextResponse.json({
    count: metrics.length,
    daily: metrics,
    generatedAt: new Date().toISOString(),
  });
}
