import { NextRequest } from 'next/server';
import { redirectToAffiliate } from '@/lib/analytics/redirect-service';

interface RouteContext {
  params: {
    slug: string;
  };
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: RouteContext) {
  return redirectToAffiliate(params.slug, request);
}
