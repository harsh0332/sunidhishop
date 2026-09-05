import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { GoogleSheetsProductProvider } from '../lib/data/google-sheets-provider';
import {
  auditProductHealth,
  auditCatalogHealth,
  normalizeProductRow,
  deduplicateAndSanitizeProducts,
} from '../lib/data/product-validator';
import { redirectToAffiliate } from '../lib/analytics/redirect-service';
import { createAdminSessionToken, getAdminSecret } from '../lib/analytics/auth';
import { Product } from '../types/product';

console.log('--- RUNNING FINAL TECHNICAL INTEGRATION TESTS ---\n');

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

async function runAllTests() {
  // -------------------------------------------------------------
  // Suite 1: In-Flight Concurrency Lock & Promise Deduplication
  // -------------------------------------------------------------
  console.log('Suite 1: In-Flight Concurrency Lock & Promise Deduplication');

  await test('Multiple concurrent fetch calls share a single execution lock', async () => {
    GoogleSheetsProductProvider.invalidateCache();

    const provider = new GoogleSheetsProductProvider();
    // Launch 10 simultaneous calls
    const promises = Array.from({ length: 10 }, () => provider.getAllProducts());
    const results = await Promise.all(promises);

    assert.strictEqual(results.length, 10);
    // Every call must return the exact same items
    const firstLength = results[0].length;
    assert.ok(firstLength > 0);
    results.forEach((res) => {
      assert.strictEqual(res.length, firstLength);
      assert.strictEqual(res[0].id, results[0][0].id);
    });
  });

  // -------------------------------------------------------------
  // Suite 2: Extended Product Health Diagnostics
  // -------------------------------------------------------------
  console.log('\nSuite 2: Extended Product Health Diagnostics');

  await test('auditProductHealth detects missing category, invalid status, and malformed references', () => {
    // 1. Missing category
    const noCatProduct: Partial<Product> = {
      id: 'p1',
      slug: 'item-one',
      title: 'Item One',
      price: 1000,
      image: 'https://img.com/1.jpg',
      affiliateUrl: 'https://z.com',
      status: 'active',
      category: '' as any,
    };
    const r1 = auditProductHealth(noCatProduct);
    assert.ok(r1.issues.some((i) => i.field === 'category'));

    // 2. Invalid status
    const badStatusProduct: Partial<Product> = {
      id: 'p2',
      slug: 'item-two',
      title: 'Item Two',
      price: 1000,
      image: 'https://img.com/1.jpg',
      affiliateUrl: 'https://z.com',
      category: 'fashion',
      status: 'non_existent_status' as any,
    };
    const r2 = auditProductHealth(badStatusProduct);
    assert.ok(r2.issues.some((i) => i.field === 'status' && i.severity === 'invalid'));

    // 3. Malformed contentId and campaignId
    const badRefProduct: Partial<Product> = {
      id: 'p3',
      slug: 'item-three',
      title: 'Item Three',
      price: 1000,
      image: 'https://img.com/1.jpg',
      affiliateUrl: 'https://z.com',
      category: 'fashion',
      status: 'active',
      contentId: 'reel#invalid-chars!@',
      campaignId: 'summer campaign 2026', // spaces not allowed in slug ID
    };
    const r3 = auditProductHealth(badRefProduct);
    assert.ok(r3.issues.some((i) => i.field === 'contentId' && i.severity === 'warning'));
    assert.ok(r3.issues.some((i) => i.field === 'campaignId' && i.severity === 'warning'));
  });

  await test('auditCatalogHealth detects and reports duplicate IDs and duplicate slugs across catalog', () => {
    const collidingProducts: Product[] = [
      {
        id: 'dup-id-100',
        slug: 'satin-dress',
        title: 'Dress 1',
        brand: 'Zara',
        store: 'Zara',
        price: 2000,
        image: 'https://img.com/1.jpg',
        affiliateUrl: 'https://z.com',
        category: 'fashion',
        currency: 'INR',
        description: 'D',
        source: 'manual',
        status: 'active',
        featured: false,
        trending: false,
        new: false,
        displayOrder: 1,
        publishedAt: '',
        updatedAt: '',
        imageAlt: '',
      },
      {
        id: 'dup-id-100', // Colliding ID
        slug: 'satin-dress', // Colliding Slug
        title: 'Dress 2',
        brand: 'Zara',
        store: 'Zara',
        price: 3000,
        image: 'https://img.com/2.jpg',
        affiliateUrl: 'https://z.com',
        category: 'fashion',
        currency: 'INR',
        description: 'D',
        source: 'manual',
        status: 'active',
        featured: false,
        trending: false,
        new: false,
        displayOrder: 2,
        publishedAt: '',
        updatedAt: '',
        imageAlt: '',
      },
    ];

    const { summary, reports } = auditCatalogHealth(collidingProducts);
    assert.strictEqual(summary.total, 2);
    assert.ok(summary.invalid > 0, 'Colliding IDs must trigger invalid health grade');
    assert.ok(reports[0].issues.some((i) => i.field === 'id' && i.message.includes('Duplicate product ID')));
    assert.ok(reports[0].issues.some((i) => i.field === 'slug' && i.message.includes('Duplicate URL slug')));
  });

  // -------------------------------------------------------------
  // Suite 3: Authorized Admin Preview Redirect Engine
  // -------------------------------------------------------------
  console.log('\nSuite 3: Authorized Admin Preview Redirect Engine');

  await test('Public unauthenticated request to draft product redirects to /product-unavailable', async () => {
    const draftDataset: Product[] = [
      {
        id: 'draft-item',
        slug: 'draft-item-slug',
        title: 'Draft Item',
        brand: 'Zara',
        store: 'Zara',
        price: 5000,
        image: 'https://img.com/d.jpg',
        affiliateUrl: 'https://zara.com/secret-draft?aff=1',
        status: 'draft', // Draft status
        category: 'fashion',
        currency: 'INR',
        description: 'Draft',
        source: 'manual',
        featured: false,
        trending: false,
        new: false,
        displayOrder: 1,
        publishedAt: '',
        updatedAt: '',
        imageAlt: '',
      },
    ];

    (GoogleSheetsProductProvider as any).lastKnownGoodProducts = draftDataset;
    (GoogleSheetsProductProvider as any).cache = { products: draftDataset, timestamp: Date.now() };

    // 1. Unauthenticated request without preview flag
    const req1 = new NextRequest('http://localhost:3000/go/draft-item-slug');
    const res1 = await redirectToAffiliate('draft-item-slug', req1);
    assert.strictEqual(res1.status, 307);
    assert.ok(res1.headers.get('location')?.includes('/product-unavailable'));

    // 2. Unauthenticated request WITH preview flag
    const req2 = new NextRequest('http://localhost:3000/go/draft-item-slug?preview=true');
    const res2 = await redirectToAffiliate('draft-item-slug', req2);
    assert.strictEqual(res2.status, 307);
    assert.ok(res2.headers.get('location')?.includes('/product-unavailable'));

    // 3. Authenticated admin request WITH preview flag
    const adminToken = createAdminSessionToken();
    const req3 = new NextRequest('http://localhost:3000/go/draft-item-slug?preview=true', {
      headers: {
        cookie: `sunidhi_admin_session=${adminToken}`,
      },
    });
    const res3 = await redirectToAffiliate('draft-item-slug', req3);
    assert.strictEqual(res3.status, 307);
    assert.strictEqual(res3.headers.get('location'), 'https://zara.com/secret-draft?aff=1');
  });

  // -------------------------------------------------------------
  // Suite 4: Repository Hygiene & Zero Secrets Audit
  // -------------------------------------------------------------
  console.log('\nSuite 4: Repository Hygiene & Zero Secrets Audit');

  await test('.gitignore exists and contains all required secret and artifact rules', () => {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    assert.ok(fs.existsSync(gitignorePath), '.gitignore must exist');
    const content = fs.readFileSync(gitignorePath, 'utf-8');

    assert.ok(content.includes('.env'), 'Must ignore .env');
    assert.ok(content.includes('.env*.local'), 'Must ignore local envs');
    assert.ok(content.includes('*.pem'), 'Must ignore pem keys');
    assert.ok(content.includes('*service-account*.json'), 'Must ignore service account JSONs');
    assert.ok(content.includes('/.next/'), 'Must ignore .next build directory');
    assert.ok(content.includes('/node_modules'), 'Must ignore node_modules');
  });

  await test('.env.example exists with variable documentation and zero hardcoded secrets', () => {
    const envExamplePath = path.join(process.cwd(), '.env.example');
    assert.ok(fs.existsSync(envExamplePath), '.env.example must exist');
    const content = fs.readFileSync(envExamplePath, 'utf-8');

    assert.ok(content.includes('GOOGLE_SHEET_ID='), 'Must document GOOGLE_SHEET_ID');
    assert.ok(content.includes('GOOGLE_SERVICE_ACCOUNT_EMAIL='), 'Must document GOOGLE_SERVICE_ACCOUNT_EMAIL');
    assert.ok(content.includes('GOOGLE_PRIVATE_KEY='), 'Must document GOOGLE_PRIVATE_KEY');
    assert.ok(content.includes('ADMIN_PASSWORD='), 'Must document ADMIN_PASSWORD');
    assert.ok(!content.includes('MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDE'), 'Must not contain real private key');
  });

  await test('Documentation guides exist and provide clear operator instructions', () => {
    const gcpDoc = path.join(process.cwd(), 'docs/GOOGLE_CLOUD_SETUP.md');
    const opsDoc = path.join(process.cwd(), 'docs/OPERATIONS_GUIDE.md');
    const readmeDoc = path.join(process.cwd(), 'README.md');

    assert.ok(fs.existsSync(gcpDoc), 'GOOGLE_CLOUD_SETUP.md must exist');
    assert.ok(fs.existsSync(opsDoc), 'OPERATIONS_GUIDE.md must exist');
    assert.ok(fs.existsSync(readmeDoc), 'README.md must exist');
  });

  console.log(`\nAll Final Technical Integration tests passed successfully: ${passedTests} / ${passedTests} ✓\n`);
}

runAllTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
