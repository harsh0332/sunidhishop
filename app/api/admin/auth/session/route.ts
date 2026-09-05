import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/analytics/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authenticated = verifyAdminSession(request);
  return NextResponse.json({ authenticated }, { status: 200 });
}
