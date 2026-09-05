import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_MAX_AGE, ADMIN_COOKIE_NAME, createAdminSessionToken, getAdminSecret } from '@/lib/analytics/auth';
import { rateLimiter } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown-client';
    // Rate limit login attempts: 5 per minute per IP
    const limitCheck = rateLimiter.check(`admin_login_${clientIp}`, 5, 60 * 1000);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait 1 minute.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const expectedSecret = getAdminSecret();
    if (password.trim() !== expectedSecret) {
      return NextResponse.json({ error: 'Incorrect admin password' }, { status: 401 });
    }

    // Generate secure HMAC session token
    const token = createAdminSessionToken();
    const isProduction = process.env.NODE_ENV === 'production';

    const response = NextResponse.json(
      { success: true, message: 'Authentication successful' },
      { status: 200 }
    );

    // Set HttpOnly cookie
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: ADMIN_COOKIE_MAX_AGE,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: 'Login processing error', details: String(err) }, { status: 500 });
  }
}
