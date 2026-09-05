import { NextRequest, NextResponse } from 'next/server';
import { productRepository } from '@/lib/data';

interface RouteContext {
  params: {
    slug: string;
  };
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { slug } = params;
    const product = await productRepository.getProductBySlug(slug);

    if (!product || product.status !== 'active') {
      return NextResponse.json(
        { error: 'Product not found or currently unavailable' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { product },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[API /api/products/${params.slug} Error]:`, error);
    return NextResponse.json(
      { error: 'Internal server error while retrieving product' },
      { status: 500 }
    );
  }
}
