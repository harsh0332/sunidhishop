import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/analytics/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' }, { status: 200 });

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
