import { NextResponse, type NextRequest } from 'next/server';

const ADMIN_COOKIE_NAME = 'sunidhi_admin_session';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Intercept /admin routes, except /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const authHeader = request.headers.get('authorization');
    const querySecret = request.nextUrl.searchParams.get('secret');

    let isAuthorized = false;

    if (sessionCookie) {
      const parts = sessionCookie.split('.');
      if (parts.length === 2) {
        const timestamp = parseInt(parts[0], 10);
        if (!isNaN(timestamp) && Date.now() - timestamp < SEVEN_DAYS_MS) {
          isAuthorized = true;
        }
      }
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      isAuthorized = true;
    } else if (querySecret) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
