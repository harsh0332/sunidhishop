import { NextRequest, NextResponse } from 'next/server';
import { extractProductFromUrl } from '@/lib/data/link-extractor';
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/analytics/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const token =
      request.cookies.get(ADMIN_COOKIE_NAME)?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      request.nextUrl.searchParams.get('secret');

    if (!verifyAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'A valid product or affiliate URL is required' }, { status: 400 });
    }

    const data = await extractProductFromUrl(url.trim());
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Extraction error:', err);
    return NextResponse.json(
      { error: 'Failed to extract product details from this link', details: String(err) },
      { status: 500 }
    );
  }
}
