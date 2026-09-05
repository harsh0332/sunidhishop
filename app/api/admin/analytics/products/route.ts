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
  const category = url.searchParams.get('category') || undefined;
  const store = url.searchParams.get('store') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const searchQuery = url.searchParams.get('searchQuery') || undefined;
  const sortBy = (url.searchParams.get('sortBy') || 'clicks') as any;
  const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as any;

  const result = await AdminAnalyticsService.getProductPerformance({
    range,
    startDate,
    endDate,
    humanOnly,
    category,
    store,
    status,
    searchQuery,
    sortBy,
    sortOrder,
  });

  return NextResponse.json(result, { status: 200 });
}
