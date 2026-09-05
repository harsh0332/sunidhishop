import assert from 'assert';
import { NextRequest } from 'next/server';
import {
  parseBoolean,
  parseNumber,
  sanitizeText,
  slugify,
  normalizeProductRow,
  deduplicateAndSanitizeProducts,
  auditProductHealth,
  auditCatalogHealth,
} from '../lib/data/product-validator';
import { GoogleSheetsProductProvider, productRepository } from '../lib/data';
import { OperationsLogger } from '../lib/data/operations-logger';
import { getAdminSecret } from '../lib/analytics/auth';
import { GET as healthApiGet } from '../app/api/admin/products/health/route';
import { GET as systemStatusApiGet } from '../app/api/admin/system/status/route';
import { POST as refreshApiPost } from '../app/api/admin/refresh-products/route';
import { Product } from '../types/product';

console.log('--- RUNNING PHASE 11: SMART PRODUCT OPERATIONS & FINAL MAINTAINABILITY TESTS ---\n');

let passedTests = 0;
async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runTests() {
  OperationsLogger.clear();

  // -------------------------------------------------------------
  // Suite 1: Google Sheet Quality of Life & Human Input Normalization
  // -------------------------------------------------------------
  console.log('Suite 1: Spreadsheet QoL & Human Input Normalization');

  await test('parseBoolean handles human spreadsheet variations (TRUE, true, Yes, 1, FALSE, No, 0)', () => {
    assert.strictEqual(parseBoolean('TRUE'), true);
    assert.strictEqual(parseBoolean('True'), true);
    assert.strictEqual(parseBoolean('true'), true);
    assert.strictEqual(parseBoolean('Yes'), true);
    assert.strictEqual(parseBoolean('yes'), true);
    assert.strictEqual(parseBoolean('Y'), true);
    assert.strictEqual(parseBoolean('1'), true);
    assert.strictEqual(parseBoolean(1), true);
    assert.strictEqual(parseBoolean(true), true);

    assert.strictEqual(parseBoolean('FALSE'), false);
    assert.strictEqual(parseBoolean('False'), false);
    assert.strictEqual(parseBoolean('false'), false);
    assert.strictEqual(parseBoolean('No'), false);
    assert.strictEqual(parseBoolean('no'), false);
    assert.strictEqual(parseBoolean('N'), false);
    assert.strictEqual(parseBoolean('0'), false);
    assert.strictEqual(parseBoolean(0), false);
    assert.strictEqual(parseBoolean(false), false);

    assert.strictEqual(parseBoolean('', true), true); // default fallback
    assert.strictEqual(parseBoolean(null, false), false);
  });

  await test('parseNumber safely parses Indian Rupees, currency symbols, and commas', () => {
    assert.strictEqual(parseNumber(1499), 1499);
    assert.strictEqual(parseNumber('1499'), 1499);
    assert.strictEqual(parseNumber('1,499'), 1499);
    assert.strictEqual(parseNumber('₹1499'), 1499);
    assert.strictEqual(parseNumber('₹ 1,499'), 1499);
    assert.strictEqual(parseNumber('₹ 1,499.50'), 1499.5);
    assert.strictEqual(parseNumber('INR 2,500'), 2500);
    assert.strictEqual(parseNumber('$49.99'), 49.99);

    // Rejects non-positive or unparseable input
    assert.strictEqual(parseNumber('free'), undefined);
    assert.strictEqual(parseNumber('0'), undefined);
    assert.strictEqual(parseNumber(0), undefined);
    assert.strictEqual(parseNumber(-500), undefined);
    assert.strictEqual(parseNumber(''), undefined);
  });

  await test('sanitizeText neutralizes spreadsheet formula injection and HTML tags', () => {
    // Formula injection protection
    assert.strictEqual(sanitizeText('=SUM(A1:A10)'), 'SUM(A1:A10)');
    assert.strictEqual(sanitizeText('+cmd|calc!A0'), 'cmd|calc!A0');
    assert.strictEqual(sanitizeText('@HYPERLINK("http://evil.com")'), 'HYPERLINK("http://evil.com")');

    // HTML tag stripping
    assert.strictEqual(sanitizeText('<i>Silk Scarf</i>'), 'Silk Scarf');
    assert.strictEqual(sanitizeText('<b>Bold Dress</b>'), 'Bold Dress');

    // Extra whitespace trimming
    assert.strictEqual(sanitizeText('   Satin Midi Dress   '), 'Satin Midi Dress');
  });

  await test('normalizeProductRow gracefully detects and skips completely blank spreadsheet rows', () => {
    const blankRow = { id: '', title: '', price: '', image: '', affiliateUrl: '' };
    const { validation } = normalizeProductRow(blankRow, 5);
    assert.strictEqual(validation.isBlank, true);
    assert.strictEqual(validation.isValid, false);
  });

  await test('normalizeProductRow normalizes status variations and defaults safely to draft', () => {
    // Published / active variations
    const row1 = { title: 'T', price: 1000, image: 'https://img.com/1.jpg', affiliateUrl: 'https://z.com', status: 'Published' };
    assert.strictEqual(normalizeProductRow(row1, 0).product.status, 'active');

    const row2 = { title: 'T', price: 1000, image: 'https://img.com/1.jpg', affiliateUrl: 'https://z.com', status: 'PUBLISHED' };
    assert.strictEqual(normalizeProductRow(row2, 1).product.status, 'active');

    const row3 = { title: 'T', price: 1000, image: 'https://img.com/1.jpg', affiliateUrl: 'https://z.com', status: 'active' };
    assert.strictEqual(normalizeProductRow(row3, 2).product.status, 'active');

    // Draft variations
    const row4 = { title: 'T', price: 1000, image: 'https://img.com/1.jpg', affiliateUrl: 'https://z.com', status: 'Draft' };
    assert.strictEqual(normalizeProductRow(row4, 3).product.status, 'draft');

    // Archived variations
    const row5 = { title: 'T', price: 1000, image: 'https://img.com/1.jpg', affiliateUrl: 'https://z.com', status: 'Archived' };
    assert.strictEqual(normalizeProductRow(row5, 4).product.status, 'archived');

    // Unknown or invalid status defaults to draft (never silently publishes!)
    const row6 = { title: 'T', price: 1000, image: 'https://img.com/1.jpg', affiliateUrl: 'https://z.com', status: 'pending-review' };
    const res6 = normalizeProductRow(row6, 5);
    assert.strictEqual(res6.product.status, 'draft');
    assert.ok(res6.validation.warnings.some(w => w.includes('defaulted to "draft"')));
  });

  await test('Discount logic calculates savings only when originalPrice > price', () => {
    // Valid discount calculation
    const row1 = {
      title: 'Dress',
      price: '2000',
      originalPrice: '4000',
      image: 'https://img.com/1.jpg',
      affiliateUrl: 'https://z.com',
    };
    const res1 = normalizeProductRow(row1, 0);
    assert.strictEqual(res1.product.discount, '50% OFF');

    // Misleading savings (originalPrice <= price) -> no discount generated
    const row2 = {
      title: 'Top',
      price: '2000',
      originalPrice: '1500',
      image: 'https://img.com/1.jpg',
      affiliateUrl: 'https://z.com',
    };
    const res2 = normalizeProductRow(row2, 1);
    assert.strictEqual(res2.product.discount, undefined);

    // Explicitly provided valid discount is preserved
    const row3 = {
      title: 'Bag',
      price: '2000',
      discount: 'Special 30% Deal',
      image: 'https://img.com/1.jpg',
      affiliateUrl: 'https://z.com',
    };
    const res3 = normalizeProductRow(row3, 2);
    assert.strictEqual(res3.product.discount, 'Special 30% Deal');
  });

  await test('Stable slug generation: preserves existing slugs and generates from title when omitted', () => {
    const row1 = { title: 'Classic Tailored Blazer', image: 'https://img.com/1.jpg', price: 5000, affiliateUrl: 'https://z.com' };
    assert.strictEqual(normalizeProductRow(row1, 0).product.slug, 'classic-tailored-blazer');

    const row2 = { title: 'New Title', slug: 'established-custom-url-slug', image: 'https://img.com/1.jpg', price: 5000, affiliateUrl: 'https://z.com' };
    assert.strictEqual(normalizeProductRow(row2, 1).product.slug, 'established-custom-url-slug');
  });

  // -------------------------------------------------------------
  // Suite 2: Duplicate Handling & Collision Resolution
  // -------------------------------------------------------------
  console.log('\nSuite 2: Duplicate Handling & Collision Resolution');

  await test('deduplicateAndSanitizeProducts catches duplicate IDs and deterministically suffixes duplicate slugs', () => {
    const rawRows = [
      { id: 'p1', slug: 'linen-blazer', title: 'Blazer A', price: 3000, image: 'https://img.com/1.jpg', affiliateUrl: 'https://z.com' },
      { id: 'p1', slug: 'linen-blazer', title: 'Blazer B (Duplicate ID & Slug)', price: 3000, image: 'https://img.com/1.jpg', affiliateUrl: 'https://z.com' },
      { id: 'p2', slug: 'linen-blazer', title: 'Blazer C (Duplicate Slug Only)', price: 4000, image: 'https://img.com/1.jpg', affiliateUrl: 'https://z.com' },
    ];

    const deduplicated = deduplicateAndSanitizeProducts(rawRows);
    assert.strictEqual(deduplicated.length, 2, 'Must deduplicate row with duplicate ID p1');
    assert.strictEqual(deduplicated[0].id, 'p1');
    assert.strictEqual(deduplicated[0].slug, 'linen-blazer');
    assert.strictEqual(deduplicated[1].id, 'p2');
    assert.strictEqual(deduplicated[1].slug, 'linen-blazer-2', 'Duplicate slug must receive -2 suffix');
  });

  // -------------------------------------------------------------
  // Suite 3: Product Quality & Health Diagnostic Suite
  // -------------------------------------------------------------
  console.log('\nSuite 3: Product Quality & Health Diagnostic Suite');

  await test('auditProductHealth grades products correctly as healthy, warning, or invalid', () => {
    // 1. Healthy product
    const healthyProd: Partial<Product> = {
      id: 'h1',
      slug: 'healthy-dress',
      title: 'Healthy Dress',
      brand: 'Zara',
      store: 'Zara',
      price: 2500,
      image: 'https://images.unsplash.com/photo-1',
      affiliateUrl: 'https://zara.com/dress',
      creatorNote: 'Wore this all day!',
      status: 'active',
    };
    const hReport = auditProductHealth(healthyProd);
    assert.strictEqual(hReport.grade, 'healthy');
    assert.strictEqual(hReport.issues.length, 0);

    // 2. Warning product (optional fields missing)
    const warningProd: Partial<Product> = {
      id: 'w1',
      slug: 'warning-dress',
      title: 'Warning Dress',
      price: 2500,
      image: 'https://images.unsplash.com/photo-1',
      affiliateUrl: 'https://zara.com/dress',
      // Missing creatorNote, missing brand
      status: 'active',
    };
    const wReport = auditProductHealth(warningProd);
    assert.strictEqual(wReport.grade, 'warning');
    assert.ok(wReport.issues.some(i => i.field === 'creatorNote'));

    // 3. Invalid product (missing price, malformed URL)
    const invalidProd: Partial<Product> = {
      id: 'inv1',
      slug: 'invalid-item',
      title: 'Broken Item',
      price: 0, // invalid price
      image: 'javascript:alert(1)', // rejected protocol
      affiliateUrl: 'invalid-url', // malformed URL
      status: 'active',
    };
    const invReport = auditProductHealth(invalidProd);
    assert.strictEqual(invReport.grade, 'invalid');
    assert.ok(invReport.issues.some(i => i.field === 'price' && i.severity === 'invalid'));
    assert.ok(invReport.issues.some(i => i.field === 'image' && i.severity === 'invalid'));
    assert.ok(invReport.issues.some(i => i.field === 'affiliateUrl' && i.severity === 'invalid'));
  });

  await test('auditCatalogHealth aggregates health counts across the catalog', () => {
    const products: Product[] = [
      { id: '1', slug: 'p1', title: 'P1', brand: 'B', store: 'S', price: 1000, image: 'https://img.com/1.jpg', affiliateUrl: 'https://z.com', creatorNote: 'Note', status: 'active', category: 'fashion', currency: 'INR', description: 'D', source: 'manual', featured: false, trending: false, new: false, displayOrder: 1, publishedAt: '', updatedAt: '', imageAlt: '' },
      { id: '2', slug: 'p2', title: 'P2', store: 'S', price: 1000, image: 'https://img.com/2.jpg', affiliateUrl: 'https://z.com', status: 'draft', category: 'fashion', currency: 'INR', description: 'D', source: 'manual', featured: false, trending: false, new: false, displayOrder: 2, publishedAt: '', updatedAt: '', imageAlt: '', brand: '' },
    ];
    const { summary, reports } = auditCatalogHealth(products);
    assert.strictEqual(summary.total, 2);
    assert.strictEqual(summary.published, 1);
    assert.strictEqual(summary.draft, 1);
    assert.strictEqual(reports.length, 2);
  });

  // -------------------------------------------------------------
  // Suite 4: Scheduled Publishing & Private Operator Notes
  // -------------------------------------------------------------
  console.log('\nSuite 4: Scheduled Publishing & Private Operator Notes');

  await test('Scheduled drops with future publishAt are excluded from public storefront', async () => {
    const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours in future
    const pastTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago

    const testProducts: Product[] = [
      {
        id: 'sched_live',
        slug: 'live-drop',
        title: 'Live Drop',
        brand: 'Zara',
        store: 'Zara',
        price: 2000,
        image: 'https://img.com/1.jpg',
        affiliateUrl: 'https://z.com',
        status: 'active',
        publishAt: pastTime, // Dropped 2 days ago
        category: 'fashion',
        currency: 'INR',
        description: 'Live',
        source: 'manual',
        featured: false,
        trending: false,
        new: false,
        displayOrder: 1,
        publishedAt: '',
        updatedAt: '',
        imageAlt: '',
      },
      {
        id: 'sched_future',
        slug: 'future-drop-preview',
        title: 'Future Secret Drop',
        brand: 'Zara',
        store: 'Zara',
        price: 2000,
        image: 'https://img.com/2.jpg',
        affiliateUrl: 'https://z.com',
        status: 'active',
        publishAt: futureTime, // In future
        category: 'fashion',
        currency: 'INR',
        description: 'Future',
        source: 'manual',
        featured: false,
        trending: false,
        new: false,
        displayOrder: 2,
        publishedAt: '',
        updatedAt: '',
        imageAlt: '',
      },
    ];

    // Seed into provider
    (GoogleSheetsProductProvider as any).cache = { products: testProducts, timestamp: Date.now() };
    (GoogleSheetsProductProvider as any).lastKnownGoodProducts = testProducts;

    const provider = new GoogleSheetsProductProvider();
    const publicProducts = await provider.getAllProducts();

    assert.ok(publicProducts.some(p => p.slug === 'live-drop'), 'Live drop must be visible');
    assert.ok(!publicProducts.some(p => p.slug === 'future-drop-preview'), 'Future drop must be hidden from public');

    // Admin can still retrieve future drop via getProductBySlugAdmin
    const adminProduct = await provider.getProductBySlugAdmin('future-drop-preview');
    assert.ok(adminProduct !== null, 'Admin can preview future drop');
    assert.strictEqual(adminProduct?.slug, 'future-drop-preview');
  });

  await test('Internal notes are parsed and stored on model, but never leaked publicly', () => {
    const row = {
      id: 'p_note',
      title: 'Designer Saree',
      price: 15000,
      image: 'https://img.com/saree.jpg',
      affiliateUrl: 'https://merchant.com/saree',
      internalNote: 'PR Gifting Kit from Mumbai Shoot; Low inventory (only 3 left)',
    };
    const { product } = normalizeProductRow(row, 0);
    assert.strictEqual(product.internalNote, 'PR Gifting Kit from Mumbai Shoot; Low inventory (only 3 left)');
  });

  // -------------------------------------------------------------
  // Suite 5: Empty Sheet Protection & Safe Rollback Concept
  // -------------------------------------------------------------
  console.log('\nSuite 5: Empty Sheet Protection & Safe Rollback Concept');

  await test('Empty or broken Sheet does NOT erase live catalog when lastKnownGoodProducts exists', async () => {
    const goodDataset: Product[] = [
      { id: 'g1', slug: 'good-dress', title: 'Good Dress', brand: 'Zara', store: 'Zara', price: 2990, image: 'https://img.com/1.jpg', affiliateUrl: 'https://z.com', status: 'active', category: 'fashion', currency: 'INR', description: 'Good', source: 'manual', featured: false, trending: false, new: false, displayOrder: 1, publishedAt: '', updatedAt: '', imageAlt: '' },
    ];

    (GoogleSheetsProductProvider as any).lastKnownGoodProducts = goodDataset;
    (GoogleSheetsProductProvider as any).cache = null; // simulate expired/empty cache

    const provider = new GoogleSheetsProductProvider();
    const result = await provider.getAllProducts();

    assert.ok(result.length > 0, 'Must retain last known good products');
    assert.strictEqual(result[0].slug, 'good-dress');

    // Check that OperationsLogger recorded the event
    const logs = OperationsLogger.getRecentLogs(5);
    assert.ok(logs.some(l => l.action === 'sheet_sync' || l.action === 'fallback_activated' || l.action === 'cache_refresh'));
  });

  // -------------------------------------------------------------
  // Suite 6: Operations Audit Logger
  // -------------------------------------------------------------
  console.log('\nSuite 6: Operations Audit Logger');

  await test('OperationsLogger logs events with timestamps and action details', () => {
    OperationsLogger.log('admin_refresh', 'success', 'Catalog refreshed by admin', '127.0.0.1');
    const logs = OperationsLogger.getRecentLogs(5);
    assert.ok(logs.length > 0);
    assert.strictEqual(logs[0].action, 'admin_refresh');
    assert.strictEqual(logs[0].status, 'success');
    assert.strictEqual(logs[0].adminIdentity, '127.0.0.1');
  });

  // -------------------------------------------------------------
  // Suite 7: Protected Admin Diagnostic APIs
  // -------------------------------------------------------------
  console.log('\nSuite 7: Protected Admin Diagnostic APIs');

  await test('GET /api/admin/products/health requires admin authorization and returns health summary', async () => {
    // Unauthenticated
    const unauthReq = new NextRequest('http://localhost:3000/api/admin/products/health');
    const unauthRes = await healthApiGet(unauthReq);
    assert.strictEqual(unauthRes.status, 401);

    // Authenticated
    const secret = getAdminSecret();
    const authReq = new NextRequest(`http://localhost:3000/api/admin/products/health?secret=${secret}`);
    const authRes = await healthApiGet(authReq);
    assert.strictEqual(authRes.status, 200);

    const data = await authRes.json();
    assert.ok(data.summary);
    assert.ok(typeof data.summary.total === 'number');
    assert.ok(Array.isArray(data.reports));
  });

  await test('GET /api/admin/system/status requires admin authorization and reports 5 subsystems', async () => {
    // Unauthenticated
    const unauthReq = new NextRequest('http://localhost:3000/api/admin/system/status');
    const unauthRes = await systemStatusApiGet(unauthReq);
    assert.strictEqual(unauthRes.status, 401);

    // Authenticated
    const secret = getAdminSecret();
    const authReq = new NextRequest(`http://localhost:3000/api/admin/system/status?secret=${secret}`);
    const authRes = await systemStatusApiGet(authReq);
    assert.strictEqual(authRes.status, 200);

    const data = await authRes.json();
    assert.ok(data.subsystems);
    assert.ok(data.subsystems.application);
    assert.ok(data.subsystems.googleSheetsPipeline);
    assert.ok(data.subsystems.productCache);
    assert.ok(data.subsystems.analyticsEngine);
    assert.ok(data.subsystems.redirectSystem);
  });

  await test('POST /api/admin/refresh-products logs operation and invalidates cache', async () => {
    const secret = getAdminSecret();
    const req = new NextRequest(`http://localhost:3000/api/admin/refresh-products?secret=${secret}`, {
      method: 'POST',
    });
    const res = await refreshApiPost(req);
    assert.strictEqual(res.status, 200);

    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(typeof data.activeProductCount === 'number');

    // OperationsLogger must contain entry
    const logs = OperationsLogger.getRecentLogs(5);
    assert.ok(logs.some(l => l.action === 'admin_refresh'));
  });

  console.log(`\nAll Phase 11 tests passed successfully: ${passedTests} / ${passedTests} ✓\n`);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
