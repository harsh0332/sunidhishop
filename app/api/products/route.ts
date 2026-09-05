import { NextRequest, NextResponse } from 'next/server';
import { productRepository } from '@/lib/data';
import { ProductFilterOptions } from '@/types/product';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const category = searchParams.get('category') || undefined;
    const subcategory = searchParams.get('subcategory') || undefined;
    const search = searchParams.get('search') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
    const sort = searchParams.get('sort') as ProductFilterOptions['sortBy'] | undefined;

    const featured = searchParams.has('featured')
      ? searchParams.get('featured') === 'true'
      : undefined;

    const trending = searchParams.has('trending')
      ? searchParams.get('trending') === 'true'
      : undefined;

    const isNew = searchParams.has('new')
      ? searchParams.get('new') === 'true'
      : undefined;

    const filters: ProductFilterOptions = {
      category,
      tag,
      search,
      featured,
      trending,
      isNew,
      sortBy: sort,
      limit,
    };

    let products = await productRepository.getAllProducts(filters);

    if (subcategory) {
      products = products.filter(
        p => p.subcategory?.toLowerCase() === subcategory.toLowerCase()
      );
    }

    return NextResponse.json(
      {
        count: products.length,
        products,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API /api/products Error]:', error);
    return NextResponse.json(
      { error: 'Internal server error while retrieving products' },
      { status: 500 }
    );
  }
}
