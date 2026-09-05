import { NextRequest, NextResponse } from 'next/server';
import { AdminAnalyticsService } from '@/lib/analytics/admin-analytics-service';
import { authorizeAnalyticsRequest } from '@/lib/analytics/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorized = authorizeAnalyticsRequest(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const range = (url.searchParams.get('range') || '7d') as any;
  const startDate = url.searchParams.get('startDate') || undefined;
  const endDate = url.searchParams.get('endDate') || undefined;
  const humanOnly = url.searchParams.get('humanOnly') !== 'false';

  const content = await AdminAnalyticsService.getContentPerformance({
    range,
    startDate,
    endDate,
    humanOnly,
  });

  return NextResponse.json({ content }, { status: 200 });
}
