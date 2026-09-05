import { NextRequest, NextResponse } from 'next/server';
import { AdminAnalyticsService } from '@/lib/analytics/admin-analytics-service';
import { authorizeAnalyticsRequest } from '@/lib/analytics/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorized = authorizeAnalyticsRequest(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  const activity = await AdminAnalyticsService.getRecentActivity(limit);

  return NextResponse.json({ activity }, { status: 200 });
}
