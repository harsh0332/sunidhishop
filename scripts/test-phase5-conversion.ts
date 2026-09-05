import assert from 'assert';
import { analytics } from '../lib/analytics';
import { computeRelatedProducts } from '../lib/data/cross-sell';
import { getProductOutboundUrl } from '../lib/outbound';
import { Product } from '../types/product';
import { MOCK_PRODUCTS } from '../lib/data/mock-products';

console.log('--- RUNNING PHASE 5: HIGH-CONVERTING STOREFRONT & MOBILE OPTIMIZATION TESTS ---\n');

let passedTests = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// -------------------------------------------------------------
// Suite 1: Analytics & Funnel Event Telemetry
// -------------------------------------------------------------
console.log('Suite 1: Analytics & Funnel Event Telemetry');

const mockProduct: Product = {
  id: 'prod_test_01',
  slug: 'linen-tailored-blazer',
  title: 'Linen Tailored Blazer',
  brand: 'Massimo Dutti',
  store: 'Massimo Dutti',
  category: 'fashion',
  subcategory: 'Blazers',
  tags: ['tailoring', 'summer', 'minimalist'],
  image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1000&q=80',
  imageAlt: 'Linen Tailored Blazer',
  price: 9990,
  currency: 'INR',
  description: 'Pure linen single-breasted blazer.',
  affiliateUrl: 'https://rstyle.me/+mockblazer',
  source: 'manual',
  status: 'active',
  featured: true,
  trending: true,
  new: false,
  displayOrder: 1,
  publishedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test('trackProductImpression dedupes multiple views for the same product in session', () => {
  let callCount = 0;
  const originalTrack = analytics.track.bind(analytics);
  analytics.track = (payload) => {
    if (payload.eventType === 'product_impression') {
      callCount++;
    }
  };

  // First impression
  analytics.trackProductImpression(mockProduct);
  assert.strictEqual(callCount, 1, 'First impression should trigger event');

  // Second impression for same product
  analytics.trackProductImpression(mockProduct);
  assert.strictEqual(callCount, 1, 'Second impression for same product should be deduped');

  // New product impression
  analytics.trackProductImpression({ ...mockProduct, id: 'prod_test_02', slug: 'slip-dress' });
  assert.strictEqual(callCount, 2, 'New product impression should trigger event');

  analytics.track = originalTrack;
});

test('trackAffiliateClick correctly captures placement attribution', () => {
  const events: any[] = [];
  const originalTrack = analytics.track.bind(analytics);
  analytics.track = (payload) => events.push(payload);

  analytics.trackAffiliateClick(mockProduct, 'mobile_sticky_bar');
  analytics.trackAffiliateClick(mockProduct, 'product_main_cta');
  analytics.trackAffiliateClick(mockProduct, 'card_cta');

  assert.strictEqual(events.length, 3);
  assert.ok(
    events[0].eventType === 'affiliate_click' || events[0].eventType === 'outbound_affiliate_click',
    'Event type should be affiliate_click or outbound_affiliate_click'
  );
  assert.strictEqual(events[0].source, 'mobile_sticky_bar');
  assert.strictEqual(events[1].source, 'product_main_cta');
  assert.strictEqual(events[2].source, 'card_cta');

  analytics.track = originalTrack;
});

test('trackCategoryView records category and count', () => {
  const events: any[] = [];
  const originalTrack = analytics.track.bind(analytics);
  analytics.track = (payload) => events.push(payload);

  analytics.trackCategoryView('fashion', 12);
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].eventType, 'category_view');
  assert.strictEqual(events[0].category, 'fashion');

  analytics.track = originalTrack;
});

// -------------------------------------------------------------
// Suite 2: Contextual Cross-Selling Engine
// -------------------------------------------------------------
console.log('\nSuite 2: Contextual Cross-Selling Engine');

test('computeRelatedProducts excludes the current product', () => {
  const current = MOCK_PRODUCTS[0];
  const related = computeRelatedProducts(current, MOCK_PRODUCTS, 4);

  assert.strictEqual(related.some(p => p.id === current.id), false, 'Current product must never appear in related list');
});

test('computeRelatedProducts respects the requested limit', () => {
  const current = MOCK_PRODUCTS[0];
  const related = computeRelatedProducts(current, MOCK_PRODUCTS, 3);

  assert.strictEqual(related.length, 3, 'Should return exactly 3 items');
});

test('computeRelatedProducts prioritizes same category and brand', () => {
  const testPool: Product[] = [
    {
      id: 'p1',
      slug: 'current-blazer',
      title: 'Current Blazer',
      brand: 'Zara',
      store: 'Zara',
      category: 'fashion',
      subcategory: 'Blazers',
      tags: ['minimalist', 'office'],
      image: '',
      imageAlt: '',
      price: 5000,
      currency: 'INR',
      description: '',
      affiliateUrl: 'https://example.com/p1',
      source: 'manual',
      status: 'active',
      featured: false,
      trending: false,
      new: false,
      displayOrder: 1,
      publishedAt: '',
      updatedAt: '',
    },
    {
      id: 'p2',
      slug: 'zara-trousers',
      title: 'Zara Tailored Trousers',
      brand: 'Zara',
      store: 'Zara',
      category: 'fashion',
      subcategory: 'Trousers',
      tags: ['minimalist'],
      image: '',
      imageAlt: '',
      price: 3500,
      currency: 'INR',
      description: '',
      affiliateUrl: 'https://example.com/p2',
      source: 'manual',
      status: 'active',
      featured: false,
      trending: false,
      new: false,
      displayOrder: 2,
      publishedAt: '',
      updatedAt: '',
    },
    {
      id: 'p3',
      slug: 'other-brand-blazer',
      title: 'H&M Blazer',
      brand: 'H&M',
      store: 'H&M',
      category: 'fashion',
      subcategory: 'Blazers',
      tags: ['office'],
      image: '',
      imageAlt: '',
      price: 4000,
      currency: 'INR',
      description: '',
      affiliateUrl: 'https://example.com/p3',
      source: 'manual',
      status: 'active',
      featured: false,
      trending: false,
      new: false,
      displayOrder: 3,
      publishedAt: '',
      updatedAt: '',
    },
    {
      id: 'p4',
      slug: 'random-perfume',
      title: 'Citrus Perfume',
      brand: 'Jo Malone',
      store: 'Nykaa',
      category: 'beauty',
      subcategory: 'Fragrance',
      tags: ['summer'],
      image: '',
      imageAlt: '',
      price: 12000,
      currency: 'INR',
      description: '',
      affiliateUrl: 'https://example.com/p4',
      source: 'manual',
      status: 'active',
      featured: false,
      trending: false,
      new: false,
      displayOrder: 4,
      publishedAt: '',
      updatedAt: '',
    }
  ];

  const current = testPool[0];
  const related = computeRelatedProducts(current, testPool, 2);

  // Both p2 (same brand + same category + shared tag) and p3 (same subcategory + same category + shared tag)
  // should beat p4 (different category, brand, subcategory).
  const relatedIds = related.map(p => p.id);
  assert.ok(relatedIds.includes('p2'), 'Zara trousers should be in top recommendations');
  assert.ok(relatedIds.includes('p3'), 'H&M blazer should be in top recommendations');
  assert.ok(!relatedIds.includes('p4'), 'Unrelated fragrance should not be in top 2');
});

test('computeRelatedProducts pairs complementary categories (fashion with accessories/footwear)', () => {
  const dress: Product = {
    id: 'dress_1',
    slug: 'silk-evening-dress',
    title: 'Silk Evening Dress',
    brand: 'Reformation',
    store: 'Reformation',
    category: 'fashion',
    subcategory: 'Dresses',
    tags: ['evening', 'party'],
    image: '',
    imageAlt: '',
    price: 18000,
    currency: 'INR',
    description: '',
    affiliateUrl: 'https://example.com',
    source: 'manual',
    status: 'active',
    featured: false,
    trending: false,
    new: false,
    displayOrder: 1,
    publishedAt: '',
    updatedAt: '',
  };

  const clutch: Product = {
    id: 'bag_1',
    slug: 'leather-clutch',
    title: 'Leather Evening Clutch',
    brand: 'Mango',
    store: 'Mango',
    category: 'accessories',
    tags: ['evening'],
    image: '',
    imageAlt: '',
    price: 4500,
    currency: 'INR',
    description: '',
    affiliateUrl: 'https://example.com',
    source: 'manual',
    status: 'active',
    featured: false,
    trending: false,
    new: false,
    displayOrder: 2,
    publishedAt: '',
    updatedAt: '',
  };

  const candle: Product = {
    id: 'home_1',
    slug: 'scented-candle',
    title: 'Scented Candle',
    brand: 'Diptyque',
    store: 'Diptyque',
    category: 'lifestyle',
    tags: ['home'],
    image: '',
    imageAlt: '',
    price: 6000,
    currency: 'INR',
    description: '',
    affiliateUrl: 'https://example.com',
    source: 'manual',
    status: 'active',
    featured: false,
    trending: false,
    new: false,
    displayOrder: 3,
    publishedAt: '',
    updatedAt: '',
  };

  const related = computeRelatedProducts(dress, [dress, clutch, candle], 1);
  assert.strictEqual(related[0].id, 'bag_1', 'Evening clutch should rank higher than scented candle for evening dress');
});

// -------------------------------------------------------------
// Suite 3: Outbound URL Abstraction & Navigation Safety
// -------------------------------------------------------------
console.log('\nSuite 3: Outbound URL Abstraction & Navigation Safety');

test('getProductOutboundUrl routes to canonical /go/[slug]', () => {
  const url = getProductOutboundUrl({ slug: 'oversized-wool-coat', affiliateUrl: 'https://external.com' });
  assert.strictEqual(url, '/go/oversized-wool-coat');
});

test('getProductOutboundUrl preserves query parameters correctly', () => {
  const url = getProductOutboundUrl(
    { slug: 'oversized-wool-coat', affiliateUrl: 'https://external.com' },
    { utmSource: 'instagram_story', utmCampaign: 'winter_edit' }
  );
  assert.ok(url.includes('utm_source=instagram_story'));
  assert.ok(url.includes('utm_campaign=winter_edit'));
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log(`\n========================================`);
console.log(`ALL ${passedTests} PHASE 5 TESTS PASSED SUCCESSFULLY!`);
console.log(`========================================\n`);
