import { NextRequest } from 'next/server';
import { redirectToAffiliate, validateDestinationUrl } from '../lib/analytics/redirect-service';
import { ClickTracker } from '../lib/analytics/click-tracker';
import { classifyTrafficType, detectDeviceType } from '../lib/analytics/bot-detector';
import { extractAttribution, normalizeMerchant } from '../lib/analytics/attribution-context';
import { mockProductRepository } from '../lib/data/mock-product-repository';

async function runPhase3Tests() {
  console.log('--- RUNNING PHASE 3 OUTBOUND REDIRECT & CLICK ENGINE TESTS ---');
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

  ClickTracker.clear();

  // Test 1: Destination URL validation & security
  assert(validateDestinationUrl('https://www.zara.com/in?aff=1') === 'https://www.zara.com/in?aff=1', 'Valid HTTPS URL is accepted');
  assert(validateDestinationUrl('http://shop.mango.com') === 'http://shop.mango.com/', 'Valid HTTP URL is accepted');
  assert(validateDestinationUrl('javascript:alert("hacked")') === null, 'Rejects dangerous javascript: protocol');
  assert(validateDestinationUrl('data:text/html,<script>alert(1)</script>') === null, 'Rejects dangerous data: protocol');
  assert(validateDestinationUrl('file:///etc/passwd') === null, 'Rejects file: protocol');
  assert(validateDestinationUrl('not-a-valid-url') === null, 'Rejects malformed string');

  // Test 2: Bot and device classification
  assert(classifyTrafficType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148') === 'human', 'Classifies mobile Safari as human');
  assert(classifyTrafficType('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)') === 'bot', 'Classifies Googlebot as bot');
  assert(classifyTrafficType('curl/8.1.2') === 'bot', 'Classifies curl as bot');
  assert(classifyTrafficType('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)') === 'bot', 'Classifies Facebook link preview crawler as bot');
  assert(detectDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148') === 'mobile', 'Detects mobile device');

  // Test 3: Merchant normalization
  assert(normalizeMerchant('Zara India') === 'zara', 'Normalizes Zara');
  assert(normalizeMerchant('Nykaa Luxe') === 'nykaa', 'Normalizes Nykaa');
  assert(normalizeMerchant('Massimo Dutti') === 'massimodutti', 'Normalizes Massimo Dutti');
  assert(normalizeMerchant('Sephora India') === 'sephora', 'Normalizes Sephora');

  // Test 4: Attribution context extraction
  const testUrl = new URL('https://sunidhi.shop/go/test-dress?utm_source=instagram&utm_medium=reel&utm_campaign=summer_25&reel=reel_monochrome_edit');
  const attribution = extractAttribution(testUrl, 'https://instagram.com', 'Mobile Safari');
  assert(attribution.utmSource === 'instagram', 'Extracts utm_source');
  assert(attribution.utmCampaign === 'summer_25', 'Extracts utm_campaign');
  assert(attribution.contentId === 'reel_monochrome_edit', 'Extracts creator content / Reel attribution');
  assert(attribution.sessionId.length === 16, 'Generates anonymous session ID without raw IP');

  // Test 5: Valid published product redirect
  const reqValid = new NextRequest('https://sunidhi.shop/go/sculptural-linen-blend-blazer-sand?utm_source=instagram&reel=reel_001', {
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      'referer': 'https://instagram.com/',
    },
  });
  const resValid = await redirectToAffiliate('sculptural-linen-blend-blazer-sand', reqValid);
  assert(resValid.status === 307, 'Returns HTTP 307 Temporary Redirect for valid product');
  const locationHeader = resValid.headers.get('location') || '';
  assert(locationHeader.includes('massimodutti.com'), 'Redirects to valid merchant destination');
  assert(Boolean(resValid.headers.get('cache-control')?.includes('no-store')), 'Includes Cache-Control: no-store header');
  assert(resValid.headers.get('x-robots-tag') === 'noindex, nofollow', 'Includes X-Robots-Tag: noindex, nofollow');

  // Test 6: Open redirect protection (ignores injected ?url=evil.com)
  const reqOpenRedirect = new NextRequest('https://sunidhi.shop/go/sculptural-linen-blend-blazer-sand?url=https://malicious-site.com', {
    headers: { 'user-agent': 'Browser User' },
  });
  const resOpenRedirect = await redirectToAffiliate('sculptural-linen-blend-blazer-sand', reqOpenRedirect);
  const safeLocation = resOpenRedirect.headers.get('location') || '';
  assert(!safeLocation.includes('malicious-site.com'), 'Open redirect parameter is ignored');
  assert(safeLocation.includes('massimodutti.com'), 'Only trusted product repository URL is used');

  // Test 7: Missing / Non-existent product
  const reqMissing = new NextRequest('https://sunidhi.shop/go/non-existent-dress', {
    headers: { 'user-agent': 'Browser User' },
  });
  const resMissing = await redirectToAffiliate('non-existent-dress', reqMissing);
  assert(resMissing.status === 307, 'Missing product issues redirect');
  assert(resMissing.headers.get('location')?.includes('/product-unavailable?item=non-existent-dress'), 'Redirects to branded unavailable page');

  // Test 8: Draft / Archived product protection
  // Add temporary draft product to test protection
  const allProds = await mockProductRepository.getAllProducts();
  const testProduct = allProds[0];
  testProduct.status = 'draft'; // temporarily draft

  const reqDraft = new NextRequest('https://sunidhi.shop/go/' + testProduct.slug, {
    headers: { 'user-agent': 'Browser User' },
  });
  const resDraft = await redirectToAffiliate(testProduct.slug, reqDraft);
  assert(resDraft.headers.get('location')?.includes('/product-unavailable'), 'Blocks redirect for draft product');
  testProduct.status = 'active'; // restore

  // Test 9: Click metrics aggregation
  // Add a bot click and another human click
  const reqBot = new NextRequest('https://sunidhi.shop/go/satin-bias-cut-slip-midi-dress', {
    headers: { 'user-agent': 'Googlebot/2.1' },
  });
  await redirectToAffiliate('satin-bias-cut-slip-midi-dress', reqBot);

  const productMetrics = ClickTracker.getProductMetrics();
  assert(productMetrics.length >= 2, 'Aggregates clicks across products');
  const merchantMetrics = ClickTracker.getMerchantMetrics();
  assert(merchantMetrics.length >= 2, 'Aggregates clicks across merchants');

  const recentClicks = ClickTracker.getRecentClicks(10);
  assert(recentClicks.length >= 2, 'Logs raw click events with timestamps and attribution');
  const lastClick = recentClicks[0];
  assert(lastClick.trafficType === 'bot', 'Accurately tags bot traffic in logged click stream');

  console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runPhase3Tests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
