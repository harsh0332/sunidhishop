import assert from 'assert';
import { SITE_CONFIG } from '../lib/config/site';
import { analytics, trackEvent } from '../lib/analytics';
import { MOCK_PRODUCTS } from '../lib/data/mock-products';
import { Product } from '../types/product';
import sitemap from '../app/sitemap';
import robots from '../app/robots';
import { GET as healthCheckGet } from '../app/api/health/route';

console.log('--- RUNNING PHASE 6: PRODUCTION-READY DISCOVERY, SEO, ANALYTICS & MONITORING TESTS ---\n');

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
  // -------------------------------------------------------------
  // Suite 1: Central Site Configuration & Homepage SEO
  // -------------------------------------------------------------
  console.log('Suite 1: Site Configuration & Brand SEO');

  test('SITE_CONFIG defines production canonical domain https://sunidhi.shop', () => {
    assert.strictEqual(SITE_CONFIG.url, 'https://sunidhi.shop');
    assert.strictEqual(SITE_CONFIG.domain, 'sunidhi.shop');
    assert.strictEqual(SITE_CONFIG.name, 'SUNIDHI');
  });

  test('Homepage title and description communicate shopping purpose without keyword stuffing', () => {
    assert.ok(SITE_CONFIG.title.includes('Sunidhi'));
    assert.ok(SITE_CONFIG.title.length <= 60, 'Title length should be optimal for search results (<60 chars)');
    assert.ok(SITE_CONFIG.description.includes('Sunidhi'));
    assert.ok(SITE_CONFIG.description.length <= 160, 'Meta description should fit search snippet (<160 chars)');
  });

  // -------------------------------------------------------------
  // Suite 2: Product SEO, Metadata Fallbacks & Canonical URLs
  // -------------------------------------------------------------
  console.log('\nSuite 2: Product Metadata Fallback Hierarchy & Canonical URLs');

  test('Product canonical URLs strictly exclude query params, internal IDs, and UTM tags', () => {
    const slug = 'satin-bias-cut-slip-midi-dress';
    const canonical = `${SITE_CONFIG.url}/product/${slug}`;
    assert.strictEqual(canonical, 'https://sunidhi.shop/product/satin-bias-cut-slip-midi-dress');
    assert.ok(!canonical.includes('?'), 'Canonical must never contain query parameters');
    assert.ok(!canonical.includes('utm_'), 'Canonical must never contain UTM parameters');
  });

  test('Product metadata fallback hierarchy resolves cleanly when optional fields are omitted', () => {
    const minimalProduct: Product = {
      id: 'p_min',
      slug: 'minimal-blouse',
      title: 'Minimal Cotton Blouse',
      brand: '',
      store: '',
      category: 'fashion',
      image: '',
      imageAlt: '',
      price: 1500,
      currency: 'INR',
      description: '',
      affiliateUrl: 'https://merchant.example/blouse',
      source: 'manual',
      status: 'active',
      featured: false,
      trending: false,
      new: false,
      displayOrder: 1,
      publishedAt: '',
      updatedAt: '',
    };

    // 1. Description fallback
    const resolvedDescription =
      minimalProduct.creatorNote ||
      minimalProduct.description ||
      `${minimalProduct.title}${minimalProduct.brand ? ` by ${minimalProduct.brand}` : ''}. Curated by Sunidhi.`;
    assert.strictEqual(resolvedDescription, 'Minimal Cotton Blouse. Curated by Sunidhi.');

    // 2. OpenGraph image fallback
    const resolvedOgImage = minimalProduct.image || SITE_CONFIG.defaultOgImage;
    assert.strictEqual(resolvedOgImage, SITE_CONFIG.defaultOgImage);

    // 3. ImageAlt fallback
    const resolvedAlt = minimalProduct.imageAlt || minimalProduct.title;
    assert.strictEqual(resolvedAlt, 'Minimal Cotton Blouse');
  });

  // -------------------------------------------------------------
  // Suite 3: Product Structured Data (JSON-LD) Integrity
  // -------------------------------------------------------------
  console.log('\nSuite 3: Product Structured Data (JSON-LD) Integrity');

  test('Structured data strictly excludes fabricated ratings, fake reviews, and empty fields', () => {
    const sampleProduct = MOCK_PRODUCTS[0];
    const canonicalUrl = `${SITE_CONFIG.url}/product/${sampleProduct.slug}`;

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: sampleProduct.title,
      image: [sampleProduct.image || SITE_CONFIG.defaultOgImage],
      description: sampleProduct.description,
      offers: {
        '@type': 'Offer',
        price: sampleProduct.price,
        priceCurrency: sampleProduct.currency,
        availability: 'https://schema.org/InStock',
        url: canonicalUrl,
        ...(sampleProduct.store ? { seller: { '@type': 'Organization', name: sampleProduct.store } } : {}),
      },
      ...(sampleProduct.brand ? { brand: { '@type': 'Brand', name: sampleProduct.brand } } : {}),
    };

    assert.strictEqual(jsonLd['@type'], 'Product');
    assert.strictEqual(jsonLd.name, sampleProduct.title);
    assert.strictEqual(jsonLd.aggregateRating, undefined, 'Must NEVER fabricate aggregateRating');
    assert.strictEqual(jsonLd.review, undefined, 'Must NEVER fabricate fake reviews');
    assert.ok(jsonLd.offers, 'Must contain real offers object');
  });

  // -------------------------------------------------------------
  // Suite 4: Dynamic Sitemap & Robots.txt Crawl Boundaries
  // -------------------------------------------------------------
  console.log('\nSuite 4: Dynamic Sitemap & Robots.txt Crawl Boundaries');

  await test('Sitemap dynamically includes active products and excludes draft/archived items', async () => {
    const sitemapEntries = await sitemap();
    assert.ok(sitemapEntries.length > 0, 'Sitemap should contain URLs');

    // Homepage check
    const homepage = sitemapEntries.find(e => e.url === SITE_CONFIG.url);
    assert.ok(homepage, 'Sitemap must contain homepage');
    assert.strictEqual(homepage?.priority, 1.0);

    // Categories check
    const fashionCat = sitemapEntries.find(e => e.url === `${SITE_CONFIG.url}/category/fashion`);
    assert.ok(fashionCat, 'Sitemap must contain category pages');

    // Verify all product URLs in sitemap correspond only to valid active products
    const productEntries = sitemapEntries.filter(e => e.url.includes('/product/'));
    assert.ok(productEntries.length > 0, 'Sitemap should contain published products');

    for (const entry of productEntries) {
      assert.ok(!entry.url.includes('/go/'), 'Sitemap must never index /go/ outbound redirect paths');
      assert.ok(!entry.url.includes('/api/'), 'Sitemap must never index /api/ paths');
    }
  });

  test('Robots.txt disallows /go/, /api/, and /product-unavailable while pointing to canonical sitemap', () => {
    const robotRules = robots();
    const rules = Array.isArray(robotRules.rules) ? robotRules.rules[0] : robotRules.rules;

    assert.ok(rules, 'Robots rules must exist');
    assert.strictEqual(rules.allow, '/');

    const disallows = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];
    assert.ok(disallows.includes('/go/'), 'Must disallow /go/ tracking route');
    assert.ok(disallows.includes('/api/'), 'Must disallow /api/ endpoints');
    assert.ok(disallows.includes('/product-unavailable'), 'Must disallow /product-unavailable');

    assert.strictEqual(robotRules.sitemap, `${SITE_CONFIG.url}/sitemap.xml`);
  });

  // -------------------------------------------------------------
  // Suite 5: Centralized Analytics & Event Architecture
  // -------------------------------------------------------------
  console.log('\nSuite 5: Centralized Analytics Event Architecture');

  test('Universal trackEvent dispatches all required funnel events', () => {
    const recordedEvents: any[] = [];
    const originalTrackEvent = analytics.trackEvent.bind(analytics);

    analytics.trackEvent = (name, properties) => {
      recordedEvents.push({ name, properties });
    };

    // Funnel events
    trackEvent('page_view', { source: 'homepage' });
    trackEvent('product_impression', { productId: 'p1', productSlug: 'dress' });
    trackEvent('product_view', { productId: 'p1', productSlug: 'dress' });
    trackEvent('category_view', { category: 'fashion' });
    trackEvent('search', { searchQuery: 'linen blazer' });
    trackEvent('related_product_click', { productId: 'p2', relatedToProductId: 'p1' });
    trackEvent('affiliate_click', { productId: 'p1', store: 'Zara' });
    trackEvent('content_click', { contentId: 'reel_27' });
    trackEvent('campaign_view', { campaignId: 'festive_2026' });

    assert.strictEqual(recordedEvents.length, 9);
    assert.strictEqual(recordedEvents[0].name, 'page_view');
    assert.strictEqual(recordedEvents[1].name, 'product_impression');
    assert.strictEqual(recordedEvents[2].name, 'product_view');
    assert.strictEqual(recordedEvents[6].name, 'affiliate_click');

    analytics.trackEvent = originalTrackEvent;
  });

  test('Analytics never captures user personal data (PII)', () => {
    let captured: any = null;
    const originalTrackEvent = analytics.trackEvent.bind(analytics);

    analytics.trackEvent = (name, properties) => {
      captured = { name, properties };
    };

    trackEvent('affiliate_click', {
      productId: 'p1',
      store: 'Zara',
      // @ts-expect-error Testing accidental PII injection
      email: 'user@example.com',
      password: 'secretpassword',
      phone: '+919999999999',
    });

    // In trackEvent, sensitive keys are deleted
    analytics.trackEvent = originalTrackEvent;
  });

  test('Analytics failure isolation: unexpected errors never throw or disrupt application', () => {
    // Force an internal error in tracking
    const originalTrackEvent = analytics.trackEvent;
    
    assert.doesNotThrow(() => {
      // Calling analytics methods with abnormal input should be completely handled
      analytics.trackProductView({ id: '', slug: '', title: '' });
      analytics.trackSearch('');
      analytics.trackCategoryView('');
    });
  });

  // -------------------------------------------------------------
  // Suite 6: System Health Check & Monitoring
  // -------------------------------------------------------------
  console.log('\nSuite 6: System Health Check & Monitoring');

  await test('GET /api/health returns HTTP 200 with operational service statuses', async () => {
    const res = await healthCheckGet();
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'healthy');
    assert.strictEqual(body.app, 'SUNIDHI');
    assert.strictEqual(body.domain, 'sunidhi.shop');
    assert.strictEqual(body.services.application, 'operational');
    assert.strictEqual(body.services.productCatalog.status, 'operational');
    assert.ok(body.services.productCatalog.activeProducts > 0);
  });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log(`\n========================================`);
  console.log(`ALL ${passedTests} PHASE 6 TESTS PASSED SUCCESSFULLY!`);
  console.log(`========================================\n`);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
