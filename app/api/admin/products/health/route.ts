import { NextRequest, NextResponse } from 'next/server';
import { productRepository } from '@/lib/data';
import { auditCatalogHealth } from '@/lib/data/product-validator';
import { authorizeAnalyticsRequest } from '@/lib/analytics/auth';
import { ProductHealthGrade } from '@/types/product';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorized = authorizeAnalyticsRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const gradeFilter = url.searchParams.get('grade') as ProductHealthGrade | null;
    const statusFilter = url.searchParams.get('status');
    const fieldFilter = url.searchParams.get('field');

    // Retrieve all products including draft and archived for health audit
    const products = productRepository.getAllProductsAdmin
      ? await productRepository.getAllProductsAdmin()
      : await productRepository.getAllProducts();

    const { summary, reports } = auditCatalogHealth(products);

    let filteredReports = reports;

    if (gradeFilter && ['healthy', 'warning', 'invalid'].includes(gradeFilter)) {
      filteredReports = filteredReports.filter(r => r.grade === gradeFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      filteredReports = filteredReports.filter(r => r.product.status === statusFilter);
    }

    if (fieldFilter) {
      filteredReports = filteredReports.filter(r => r.issues.some(i => i.field.toLowerCase() === fieldFilter.toLowerCase()));
    }

    return NextResponse.json({
      summary,
      totalAudited: reports.length,
      matchingCount: filteredReports.length,
      reports: filteredReports,
      auditedAt: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to run product health diagnostics', details: String(error) },
      { status: 500 }
    );
  }
}
