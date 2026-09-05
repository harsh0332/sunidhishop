import { normalizeProductRow, deduplicateAndSanitizeProducts } from '../lib/data/product-validator';
import { NextRequest } from 'next/server';
import { redirectToAffiliate } from '../lib/analytics/redirect-service';
import { mockProductRepository } from '../lib/data/mock-product-repository';

async function runPhase4Tests() {
  console.log('--- RUNNING PHASE 4 MANUAL GOOGLE SHEETS CMS TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Test 1: Minimal 5-field product creation (Section 5)
  // Creator provides ONLY: title, image, price, currency, affiliateUrl, status
  const minimalRow = {
    title: 'Handcrafted Brass Temple Choker',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f',
    price: '1899',
    currency: 'INR',
    affiliateUrl: 'https://merchant.example/temple-choker',
    status: 'published',
  };

  const { product: minProd, validation: minVal } = normalizeProductRow(minimalRow, 0);
  assert(minVal.isValid === true, 'Minimal 5-field product is 100% valid');
  assert(minProd.id === 'prod-handcrafted-brass-temple-choker', 'Auto-generates stable ID from title');
  assert(minProd.slug === 'handcrafted-brass-temple-choker', 'Auto-generates clean URL slug from title');
  assert(minProd.source === 'manual', 'Sets source to manual');
  assert(minProd.price === 1899, 'Coerces price correctly');

  // Test 2: Optional field omission (Section 18)
  assert(minProd.brand === '', 'Leaves brand empty rather than inventing placeholders');
  assert(minProd.store === '', 'Leaves store empty');
  assert(minProd.originalPrice === undefined, 'Original price is undefined when omitted');
  assert(minProd.discount === undefined, 'Discount is undefined when omitted');
  assert(minProd.creatorNote === undefined, 'Creator note is undefined when omitted');
  assert(minProd.badge === undefined, 'Badge is undefined when omitted');
  assert(minProd.tags === undefined, 'Tags are undefined when omitted');
  assert(minProd.reelUrl === undefined, 'Reel URL is undefined when omitted');

  // Test 3: Missing mandatory fields validation (Section 16)
  const missingPriceRow = {
    title: 'Silk Scarf',
    image: 'https://images.unsplash.com/photo-1',
    affiliateUrl: 'https://brand.com/item',
    status: 'published',
    // price omitted
  };
  const missingPriceRes = normalizeProductRow(missingPriceRow, 1);
  assert(missingPriceRes.validation.isValid === false, 'Rejects published product missing price');

  const missingUrlRow = {
    title: 'Silk Scarf',
    image: 'https://images.unsplash.com/photo-1',
    price: '999',
    status: 'published',
    // affiliateUrl omitted
  };
  const missingUrlRes = normalizeProductRow(missingUrlRow, 2);
  assert(missingUrlRes.validation.isValid === false, 'Rejects published product missing affiliateUrl');

  // Test 4: Deduplication of rows without explicit IDs
  const multipleMinimalRows = [
    {
      title: 'Boho Linen Blouse',
      image: 'https://images.unsplash.com/photo-1',
      price: '1299',
      affiliateUrl: 'https://store.com/1',
      status: 'published',
    },
    {
      title: 'Boho Linen Blouse', // Duplicate title and derived slug/ID
      image: 'https://images.unsplash.com/photo-2',
      price: '1499',
      affiliateUrl: 'https://store.com/2',
      status: 'published',
    },
  ];

  const deduplicated = deduplicateAndSanitizeProducts(multipleMinimalRows);
  assert(deduplicated.length === 1, 'Deduplicates identical auto-derived IDs safely');

  // Test 5: Changing affiliate URL dynamically (Section 26)
  const allProds = await mockProductRepository.getAllProducts();
  const testP = allProds[0];
  const originalAffUrl = testP.affiliateUrl;

  // Update affiliate URL as if edited in Sheet
  testP.affiliateUrl = 'https://www.new-merchant-destination.com/product/123';
  const reqUpdate = new NextRequest('https://sunidhi.shop/go/' + testP.slug, {
    headers: { 'user-agent': 'Test User' },
  });
  const resUpdate = await redirectToAffiliate(testP.slug, reqUpdate);
  assert(resUpdate.headers.get('location') === 'https://www.new-merchant-destination.com/product/123', 'Outbound redirect uses updated affiliate destination immediately');

  // Restore original URL
  testP.affiliateUrl = originalAffUrl;

  // Test 6: Deactivation via status = archived (Section 27)
  testP.status = 'archived';
  const reqArchived = new NextRequest('https://sunidhi.shop/go/' + testP.slug, {
    headers: { 'user-agent': 'Test User' },
  });
  const resArchived = await redirectToAffiliate(testP.slug, reqArchived);
  assert(resArchived.headers.get('location')?.includes('/product-unavailable'), 'Archived product is blocked from outbound redirect');
  testP.status = 'active'; // restore

  console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runPhase4Tests().catch(err => {
  console.error('Fatal error during Phase 4 test:', err);
  process.exit(1);
});
