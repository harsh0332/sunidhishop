import { NextResponse } from 'next/server';
import { productRepository } from '@/lib/data';
import { SITE_CONFIG } from '@/lib/config/site';

export const dynamic = 'force-dynamic';

export async function GET() {
  const timestamp = new Date().toISOString();
  let catalogStatus = 'operational';
  let activeProductCount = 0;

  try {
    const products = await productRepository.getAllProducts();
    activeProductCount = products.filter((p) => p.status === 'active').length;
  } catch {
    catalogStatus = 'degraded';
  }

  const isHealthy = catalogStatus === 'operational';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp,
      app: SITE_CONFIG.name,
      domain: SITE_CONFIG.domain,
      environment: process.env.NODE_ENV || 'development',
      services: {
        application: 'operational',
        productCatalog: {
          status: catalogStatus,
          activeProducts: activeProductCount,
        },
        analytics: {
          status: 'operational',
        },
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    }
  );
}
