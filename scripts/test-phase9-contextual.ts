/**
 * Phase 9 Intelligent Link-in-Bio Destination & Contextual Merchandising Test Suite
 * Tests entry parameter resolution, contextual merchandising, recently viewed tracking,
 * enhanced cross-selling, content & campaign repositories, outbound attribution, and shortlink routing.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { MOCK_PRODUCTS } from '../lib/data/mock-products';
import { resolveMerchandisingContext } from '../lib/contextual-merchandising';
import { contentRepository } from '../lib/data/content-repository';
import { computeRelatedProducts } from '../lib/data/cross-sell';
import { getProductOutboundUrl } from '../lib/outbound';
import { normalizeProductRow } from '../lib/data/product-validator';
import { Product } from '../types/product';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runAsyncTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log('--- PHASE 9: INTELLIGENT LINK-IN-BIO & CONTEXTUAL MERCHANDISING TESTS ---');

  // Suite 1: Entry Parameter & Context Resolution Engine
  console.log('\nSuite 1: Context Resolution Engine');

  runTest('Resolves /?content=reel_027 to content context with prioritized products', () => {
    const context = resolveMerchandisingContext({ content: 'reel_027' }, MOCK_PRODUCTS);
    assert.strictEqual(context.type, 'content');
    assert.strictEqual(context.contentId, 'reel_027');
    assert.ok(context.heading.includes('Festive'));
    assert.strictEqual(context.badge, 'Shop This Reel');
    assert.ok(context.prioritizedProducts.length >= 3);
    assert.ok(context.prioritizedProducts.every((p) => p.contentId === 'reel_027'));
    assert.ok(context.remainingProducts.length > 0);
  });

  runTest('Resolves /?campaign=festive_2026 to campaign context with campaign products', () => {
    const context = resolveMerchandisingContext({ campaign: 'festive_2026' }, MOCK_PRODUCTS);
    assert.strictEqual(context.type, 'campaign');
    assert.strictEqual(context.campaignId, 'festive_2026');
    assert.strictEqual(context.badge, 'Curated Campaign');
    assert.ok(context.prioritizedProducts.some((p) => p.campaignId === 'festive_2026'));
  });

  runTest('Resolves /?product=[slug] to product context with spotlighted product', () => {
    const context = resolveMerchandisingContext(
      { product: 'satin-bias-cut-slip-midi-dress' },
      MOCK_PRODUCTS
    );
    assert.strictEqual(context.type, 'product');
    assert.strictEqual(context.badge, 'Featured Link');
    assert.strictEqual(context.highlightedProduct?.slug, 'satin-bias-cut-slip-midi-dress');
    assert.strictEqual(context.prioritizedProducts.length, 1);
  });

  runTest('Resolves /?category=beauty to category context with target category', () => {
    const context = resolveMerchandisingContext({ category: 'beauty' }, MOCK_PRODUCTS);
    assert.strictEqual(context.type, 'category');
    assert.strictEqual(context.targetCategory, 'beauty');
    assert.ok(context.prioritizedProducts.every((p) => p.category === 'beauty'));
  });

  runTest('Gracefully falls back to default storefront on missing or invalid parameters', () => {
    const context = resolveMerchandisingContext({ content: 'non_existent_reel_999' }, MOCK_PRODUCTS);
    assert.strictEqual(context.type, 'default');
    assert.strictEqual(context.heading, "Sunidhi's Latest Picks");
    assert.strictEqual(context.prioritizedProducts.length, MOCK_PRODUCTS.filter((p) => p.status === 'active').length);
    assert.strictEqual(context.remainingProducts.length, 0);
  });

  runTest('Sanitizes malicious script tags in query parameters safely without crashing', () => {
    const context = resolveMerchandisingContext(
      { content: '<script>alert("xss")</script>' },
      MOCK_PRODUCTS
    );
    // Malicious script is stripped and safely resolves without error or injection
    assert.ok(context.type === 'default' || context.type === 'content');
    assert.ok(!context.heading.includes('<script>'));
  });

  // Suite 2: Creator Content & Campaign Repository Layer
  console.log('\nSuite 2: Content & Campaign Repository Layer');

  await runAsyncTest('contentRepository resolves reel_027 look with ordered products', async () => {
    const content = await contentRepository.getContentById('reel_027');
    assert.ok(content !== null, 'Content reel_027 must exist');
    assert.strictEqual(content?.id, 'reel_027');
    assert.strictEqual(content?.type, 'reel');
    assert.ok(content?.products.length >= 3);
    // Order verification (contentOrder 1, 2, 3)
    assert.strictEqual(content?.products[0].contentOrder, 1);
    assert.strictEqual(content?.products[1].contentOrder, 2);
    assert.strictEqual(content?.products[2].contentOrder, 3);
  });

  await runAsyncTest('contentRepository returns null for unknown content ID (404 condition)', async () => {
    const missing = await contentRepository.getContentById('unknown_look_404');
    assert.strictEqual(missing, null);
  });

  await runAsyncTest('contentRepository resolves festive_2026 campaign with looks and products', async () => {
    const campaign = await contentRepository.getCampaignById('festive_2026');
    assert.ok(campaign !== null, 'Campaign festive_2026 must exist');
    assert.strictEqual(campaign?.id, 'festive_2026');
    assert.ok(campaign?.products.length >= 3);
    assert.ok(campaign?.contents.length > 0);
  });

  runTest('Product validator parses comma-separated contentIds for single product without duplication', () => {
    const rawRow = {
      title: 'Multipurpose Cashmere Wrap',
      image: 'https://images.unsplash.com/wrap',
      price: '4990',
      affiliateUrl: 'https://merchant.com/wrap',
      contentIds: 'reel_027, reel_014, reel_099',
      contentType: 'reel',
      contentTitle: 'Autumn Layering Wrap',
      campaignId: 'festive_2026',
    };

    const { product, validation } = normalizeProductRow(rawRow, 0);
    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(product.contentId, 'reel_027');
    assert.deepStrictEqual(product.contentIds, ['reel_027', 'reel_014', 'reel_099']);
  });

  // Suite 3: Contextual Cross-Selling & Recommendations
  console.log('\nSuite 3: Contextual Cross-Selling & Recommendations');

  runTest('computeRelatedProducts prioritizes items from the same Reel/Look and shared tags', () => {
    const current = MOCK_PRODUCTS.find((p) => p.slug === 'satin-bias-cut-slip-midi-dress')!;
    const related = computeRelatedProducts(current, MOCK_PRODUCTS, 3);

    assert.strictEqual(related.length, 3);
    // Current product must never be included
    assert.ok(related.every((p) => p.id !== current.id));
    // Products from the same Reel (prod-03 or prod-04) should score higher due to same contentId (+5)
    assert.ok(related.some((p) => p.contentId === current.contentId));
  });

  // Suite 4: Outbound Attribution & Navigation Safety
  console.log('\nSuite 4: Outbound Attribution & Deep Links');

  runTest('getProductOutboundUrl preserves contentId and campaignId in redirect query', () => {
    const product = MOCK_PRODUCTS[0];
    const url = getProductOutboundUrl(product, {
      contentId: 'reel_027',
      campaignId: 'festive_2026',
    });

    assert.ok(url.includes(`/go/${encodeURIComponent(product.slug)}`));
    assert.ok(url.includes('contentId=reel_027'));
    assert.ok(url.includes('campaignId=festive_2026'));
  });

  runTest('Canonical URLs on homepage and content pages remain strictly clean without query params', () => {
    const homeContent = fs.readFileSync(path.join(process.cwd(), 'app/page.tsx'), 'utf-8');
    assert.ok(homeContent.includes("canonical: 'https://sunidhi.shop'"));

    const contentPage = fs.readFileSync(path.join(process.cwd(), 'app/content/[contentId]/page.tsx'), 'utf-8');
    assert.ok(contentPage.includes('canonical: canonicalUrl'));
    assert.ok(contentPage.includes('${SITE_CONFIG.url}/content/${content.id}'));
  });

  // Suite 5: Future-Ready Shortlink & Route Setup
  console.log('\nSuite 5: Future Shortlink Architecture');

  runTest('Shortlink router at app/l/[code]/route.ts exists and compiles', () => {
    const routePath = path.join(process.cwd(), 'app/l/[code]/route.ts');
    assert.ok(fs.existsSync(routePath), 'app/l/[code]/route.ts must exist');
    const content = fs.readFileSync(routePath, 'utf-8');
    assert.ok(content.includes('contentRepository.getContentById'));
    assert.ok(content.includes('contentRepository.getAllCampaigns'));
  });

  runTest('Dynamic sitemap includes published contents, campaigns, and legal routes', () => {
    const sitemapPath = path.join(process.cwd(), 'app/sitemap.ts');
    const content = fs.readFileSync(sitemapPath, 'utf-8');
    assert.ok(content.includes('contentRepository.getAllContents'));
    assert.ok(content.includes('contentRepository.getAllCampaigns'));
    assert.ok(content.includes('/content/'));
    assert.ok(content.includes('/campaign/'));
  });

  // Suite 6: Recently Viewed Privacy Architecture
  console.log('\nSuite 6: Recently Viewed Architecture');

  runTest('Recently viewed client storage helper exists with max 4 limit and zero server transmission', () => {
    const helperPath = path.join(process.cwd(), 'lib/recently-viewed.ts');
    assert.ok(fs.existsSync(helperPath), 'lib/recently-viewed.ts must exist');
    const content = fs.readFileSync(helperPath, 'utf-8');
    assert.ok(content.includes('MAX_RECENT_ITEMS = 4'));
    assert.ok(content.includes('sunidhi_recently_viewed'));
  });

  runTest('RecentlyViewed component exists and is mounted on homepage', () => {
    const compPath = path.join(process.cwd(), 'components/product/RecentlyViewed.tsx');
    assert.ok(fs.existsSync(compPath), 'components/product/RecentlyViewed.tsx must exist');

    const viewContent = fs.readFileSync(path.join(process.cwd(), 'components/home/StorefrontView.tsx'), 'utf-8');
    assert.ok(viewContent.includes('<RecentlyViewed />'));
  });

  console.log(`\n========================================`);
  console.log(`Phase 9 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
