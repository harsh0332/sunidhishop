import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const ADMIN_COOKIE_NAME = 'sunidhi_admin_session';
export const ADMIN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export function getAdminSecret(): string {
  const secret = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET;
  if (secret) return secret.trim();
  // Safe default for non-production / test environments
  return 'sunidhi-admin-2026';
}

/**
 * Creates a signed HMAC session token: timestamp.signature
 */
export function createAdminSessionToken(): string {
  const secret = getAdminSecret();
  const timestamp = Date.now().toString();
  const signature = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
  return `${timestamp}.${signature}`;
}

/**
 * Verifies a token: matches either raw admin secret (for API/Bearer tokens) or a signed session token.
 */
export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const cleanToken = token.trim();
  const secret = getAdminSecret();

  // 1. Direct secret match (for Bearer token or URL secret)
  if (cleanToken === secret) {
    return true;
  }

  // 2. Signed session token format: timestamp.signature
  const parts = cleanToken.split('.');
  if (parts.length === 2) {
    const [timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    // Check expiration (7 days)
    const maxAgeMs = ADMIN_COOKIE_MAX_AGE * 1000;
    if (Date.now() - timestamp > maxAgeMs) {
      return false; // Expired
    }

    const expectedSignature = crypto.createHmac('sha256', secret).update(timestampStr).digest('hex');
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Checks request for authorization via Cookie, Bearer header, or query param.
 */
export function verifyAdminSession(request: NextRequest): boolean {
  // 1. Check HTTP-only cookie
  const cookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (cookie && verifyAdminToken(cookie)) {
    return true;
  }

  // 2. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.substring(7).trim();
    if (verifyAdminToken(bearer)) {
      return true;
    }
  }

  // 3. Check query parameter ?secret=
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  if (querySecret && verifyAdminToken(querySecret)) {
    return true;
  }

  return false;
}

/**
 * Guard for API routes returning 401 if unauthorized, or null if authorized.
 */
export function authorizeAnalyticsRequest(request: NextRequest): NextResponse | null {
  if (verifyAdminSession(request)) {
    return null; // Authorized
  }

  return NextResponse.json(
    { error: 'Unauthorized: Admin authentication required' },
    { status: 401 }
  );
}
