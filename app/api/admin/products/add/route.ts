import { NextRequest, NextResponse } from 'next/server';
import { saveCustomProduct } from '@/lib/data/custom-products-store';
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
    const { title, affiliateUrl, price, image } = body;

    if (!title || !affiliateUrl) {
      return NextResponse.json({ error: 'Title and affiliate link are required' }, { status: 400 });
    }

    const product = saveCustomProduct(body);

    return NextResponse.json({
      success: true,
      message: 'Product published live to Sunidhi.shop!',
      product,
    });
  } catch (err) {
    console.error('Save product error:', err);
    return NextResponse.json(
      { error: 'Failed to publish product', details: String(err) },
      { status: 500 }
    );
  }
}
