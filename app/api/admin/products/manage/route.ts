import { NextRequest, NextResponse } from 'next/server';
import { getCustomProducts } from '@/lib/data/custom-products-store';
import { removeProductAny, updateProductAny } from '@/lib/data/product-overrides';
import { GoogleSheetsProductProvider } from '@/lib/data/google-sheets-provider';
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/analytics/auth';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const token =
    request.cookies.get(ADMIN_COOKIE_NAME)?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.nextUrl.searchParams.get('secret');
  return verifyAdminToken(token);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const provider = new GoogleSheetsProductProvider();
    const allProducts = await provider.getAllProductsAdmin();
    const customList = getCustomProducts();
    const customIds = new Set(customList.map((p) => p.id));

    const products = allProducts.map((p) => ({
      ...p,
      isCustom: customIds.has(p.id),
    }));

    return NextResponse.json({ success: true, products });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to list products', details: String(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, affiliateUrl, price, originalPrice, title, image } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    updateProductAny(id, {
      ...(affiliateUrl ? { affiliateUrl: String(affiliateUrl).trim() } : {}),
      ...(price !== undefined ? { price: Number(price) } : {}),
      ...(originalPrice !== undefined ? { originalPrice: Number(originalPrice) } : {}),
      ...(title ? { title: String(title).trim() } : {}),
      ...(image ? { image: String(image).trim() } : {}),
    });

    return NextResponse.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update product', details: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    removeProductAny(id);
    return NextResponse.json({ success: true, message: 'Product deleted from website' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete product', details: String(err) }, { status: 500 });
  }
}
