import { NextRequest, NextResponse } from 'next/server';
import { AdminAnalyticsService } from '@/lib/analytics/admin-analytics-service';
import { authorizeAnalyticsRequest } from '@/lib/analytics/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorized = authorizeAnalyticsRequest(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || url.searchParams.get('id');

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug or id parameter' }, { status: 400 });
  }

  const detail = await AdminAnalyticsService.getProductDetail(slug);

  return NextResponse.json(detail, { status: 200 });
}
