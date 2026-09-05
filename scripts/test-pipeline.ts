import { normalizeProductRow, deduplicateAndSanitizeProducts, sanitizeUrl, sanitizeText } from '../lib/data/product-validator';

function runTests() {
  console.log('--- RUNNING PHASE 2 DATA PIPELINE & VALIDATION TESTS ---');
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

  // Test 1: XSS sanitization
  const dirtyTitle = 'Chic Silk Saree <script>alert("hack")</script>';
  const cleanTitle = sanitizeText(dirtyTitle);
  assert(cleanTitle === 'Chic Silk Saree alert("hack")', 'Sanitizes HTML tags from spreadsheet input');

  // Test 2: URL protocol validation
  assert(sanitizeUrl('https://zara.com/product') === 'https://zara.com/product', 'Accepts valid HTTPS url');
  assert(sanitizeUrl('http://zara.com/product') === 'http://zara.com/product', 'Accepts valid HTTP url');
  assert(sanitizeUrl('javascript:alert(1)') === undefined, 'Rejects dangerous javascript: protocol');

  // Test 3: Normalization of numbers and booleans
  const rawRow = {
    id: 'test-01',
    title: 'Minimalist Linen Vest',
    price: '₹2,499',
    originalPrice: '3,999',
    currency: 'inr',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea',
    affiliateUrl: 'https://brand.com/item?aff=1',
    status: 'published',
    featured: 'TRUE',
    trending: '1',
    new: 'yes',
    tags: 'Linen, Summer, Minimal',
  };

  const { product, validation } = normalizeProductRow(rawRow, 0);
  assert(validation.isValid === true, 'Valid row passes validation');
  assert(product.price === 2499, 'Coerces currency formatted price string to number');
  assert(product.originalPrice === 3999, 'Coerces originalPrice string to number');
  assert(product.currency === 'INR', 'Normalizes currency code to uppercase');
  assert(product.discount === '38% OFF', 'Auto-calculates discount percentage when missing');
  assert(product.featured === true, 'Parses "TRUE" string as boolean true');
  assert(product.trending === true, 'Parses "1" as boolean true');
  assert(product.new === true, 'Parses "yes" as boolean true');
  assert(product.tags?.length === 3 && product.tags[1] === 'Summer', 'Parses comma-delimited tags into clean array');

  // Test 4: Missing mandatory fields (Fault Tolerance)
  const invalidRow = {
    id: 'invalid-01',
    // Missing title, price, image, affiliateUrl
    status: 'published',
  };
  const invalidResult = normalizeProductRow(invalidRow, 1);
  assert(invalidResult.validation.isValid === false, 'Detects missing mandatory fields');
  assert(invalidResult.validation.errors.length >= 4, 'Reports all missing mandatory fields');

  // Test 5: Duplicate ID Protection & Deduplication
  const duplicateRows = [
    {
      id: 'dup-id',
      title: 'Original Product',
      image: 'https://images.unsplash.com/photo-1',
      price: '1000',
      affiliateUrl: 'https://store.com/1',
      status: 'published',
    },
    {
      id: 'dup-id', // Duplicate ID
      title: 'Conflicting Product',
      image: 'https://images.unsplash.com/photo-2',
      price: '2000',
      affiliateUrl: 'https://store.com/2',
      status: 'published',
    },
    {
      id: 'unique-id',
      title: 'Original Product', // Duplicate slug potential
      image: 'https://images.unsplash.com/photo-3',
      price: '3000',
      affiliateUrl: 'https://store.com/3',
      status: 'published',
    },
  ];

  const deduplicated = deduplicateAndSanitizeProducts(duplicateRows);
  assert(deduplicated.length === 2, 'Deduplicates rows by ID keeping only first entry');
  assert(deduplicated[0].id === 'dup-id' && deduplicated[0].title === 'Original Product', 'Preserves first occurrence');
  assert(deduplicated[1].slug === 'original-product-2', 'Ensures colliding slugs are resolved with unique suffixes');

  // Test 6: Status filtering (draft & archived)
  const draftRow = {
    id: 'draft-01',
    title: 'Secret Draft',
    image: 'https://images.unsplash.com/photo-4',
    price: '500',
    affiliateUrl: 'https://store.com/draft',
    status: 'draft',
  };
  const archivedRow = {
    id: 'archived-01',
    title: 'Past Season Item',
    image: 'https://images.unsplash.com/photo-5',
    price: '800',
    affiliateUrl: 'https://store.com/archived',
    status: 'archived',
  };

  const draftNormalized = normalizeProductRow(draftRow, 3);
  const archivedNormalized = normalizeProductRow(archivedRow, 4);
  assert(draftNormalized.product.status === 'draft', 'Marks status as draft');
  assert(archivedNormalized.product.status === 'archived', 'Marks status as archived');

  console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
