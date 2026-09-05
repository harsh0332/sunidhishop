import { NextRequest, NextResponse } from 'next/server';
import { AdminAnalyticsService } from '@/lib/analytics/admin-analytics-service';
import { authorizeAnalyticsRequest } from '@/lib/analytics/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorized = authorizeAnalyticsRequest(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const type = (url.searchParams.get('type') || 'products') as 'products' | 'daily' | 'content' | 'campaigns';

  const csv = await AdminAnalyticsService.generateCsv(type);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `sunidhi-analytics-${type}-${dateStr}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
