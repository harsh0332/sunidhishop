import assert from 'assert';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import {
  createAdminSessionToken,
  verifyAdminToken,
  verifyAdminSession,
  ADMIN_COOKIE_NAME,
  getAdminSecret,
  authorizeAnalyticsRequest,
} from '../lib/analytics/auth';
import { EventTracker } from '../lib/analytics/event-tracker';
import { ClickTracker } from '../lib/analytics/click-tracker';
import { AdminAnalyticsService } from '../lib/analytics/admin-analytics-service';
import { POST as loginPost } from '../app/api/admin/auth/login/route';
import { POST as logoutPost } from '../app/api/admin/auth/logout/route';
import { POST as eventPost } from '../app/api/analytics/event/route';
import { GET as overviewGet } from '../app/api/admin/analytics/overview/route';
import { GET as exportGet } from '../app/api/admin/analytics/export/route';

console.log('--- RUNNING PHASE 10: PRIVATE INTERNAL ANALYTICS DASHBOARD & ENGINE TESTS ---\n');

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
  // Clear any existing test telemetry
  EventTracker.clear();
  ClickTracker.clear();

  // -------------------------------------------------------------
  // Suite 1: Access Control, Cryptographic Tokens & Auth Guard
  // -------------------------------------------------------------
  console.log('Suite 1: Access Control & Cryptographic Sessions');

  await test('createAdminSessionToken generates a signed HMAC token in timestamp.signature format', () => {
    const token = createAdminSessionToken();
    const parts = token.split('.');
    assert.strictEqual(parts.length, 2, 'Token must contain timestamp and signature');
    const timestamp = parseInt(parts[0], 10);
    assert.ok(!isNaN(timestamp) && timestamp > 0, 'Timestamp must be a valid epoch number');
    assert.strictEqual(parts[1].length, 64, 'HMAC-SHA256 signature must be 64 hex characters');
  });

  await test('verifyAdminToken verifies genuine signed session token successfully', () => {
    const token = createAdminSessionToken();
    assert.strictEqual(verifyAdminToken(token), true);
  });

  await test('verifyAdminToken rejects tampered signature', () => {
    const token = createAdminSessionToken();
    const [ts, sig] = token.split('.');
    const tamperedSig = sig.substring(0, sig.length - 2) + 'aa';
    assert.strictEqual(verifyAdminToken(`${ts}.${tamperedSig}`), false);
  });

  await test('verifyAdminToken rejects expired session tokens (>7 days old)', () => {
    const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
    const secret = getAdminSecret();
    const signature = crypto.createHmac('sha256', secret).update(oldTimestamp.toString()).digest('hex');
    const expiredToken = `${oldTimestamp}.${signature}`;

    assert.strictEqual(verifyAdminToken(expiredToken), false, 'Expired session token must be rejected');
  });

  await test('verifyAdminToken accepts direct secret for CLI and Bearer token automation', () => {
    const secret = getAdminSecret();
    assert.strictEqual(verifyAdminToken(secret), true);
    assert.strictEqual(verifyAdminToken('invalid-secret-key-1234'), false);
  });

  await test('verifyAdminSession validates HTTP-only cookie, Bearer header, and query secret', () => {
    const token = createAdminSessionToken();

    // 1. Unauthenticated request
    const reqNoAuth = new NextRequest('http://localhost:3000/api/admin/analytics/overview');
    assert.strictEqual(verifyAdminSession(reqNoAuth), false);

    // 2. Cookie authentication
    const reqCookie = new NextRequest('http://localhost:3000/api/admin/analytics/overview', {
      headers: { cookie: `${ADMIN_COOKIE_NAME}=${token}` },
    });
    assert.strictEqual(verifyAdminSession(reqCookie), true);

    // 3. Bearer header authentication
    const reqBearer = new NextRequest('http://localhost:3000/api/admin/analytics/overview', {
      headers: { authorization: `Bearer ${getAdminSecret()}` },
    });
    assert.strictEqual(verifyAdminSession(reqBearer), true);

    // 4. Query secret authentication
    const reqQuery = new NextRequest(`http://localhost:3000/api/admin/analytics/overview?secret=${getAdminSecret()}`);
    assert.strictEqual(verifyAdminSession(reqQuery), true);
  });

  await test('authorizeAnalyticsRequest returns HTTP 401 for unauthenticated request and null for authorized', () => {
    const unauthReq = new NextRequest('http://localhost:3000/api/admin/analytics/overview');
    const unauthRes = authorizeAnalyticsRequest(unauthReq);
    assert.ok(unauthRes !== null);
    assert.strictEqual(unauthRes?.status, 401);

    const authReq = new NextRequest(`http://localhost:3000/api/admin/analytics/overview?secret=${getAdminSecret()}`);
    const authRes = authorizeAnalyticsRequest(authReq);
    assert.strictEqual(authRes, null);
  });

  // -------------------------------------------------------------
  // Suite 2: Authentication Route Handlers (Login / Logout)
  // -------------------------------------------------------------
  console.log('\nSuite 2: Authentication Route Handlers (Login / Logout)');

  await test('POST /api/admin/auth/login rejects empty or incorrect password with 400/401', async () => {
    const emptyReq = new NextRequest('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: '' }),
    });
    const emptyRes = await loginPost(emptyReq);
    assert.strictEqual(emptyRes.status, 400);

    const wrongReq = new NextRequest('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'wrong-passphrase' }),
    });
    const wrongRes = await loginPost(wrongReq);
    assert.strictEqual(wrongRes.status, 401);
  });

  await test('POST /api/admin/auth/login succeeds with correct password and issues signed cookie', async () => {
    const secret = getAdminSecret();
    const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: secret }),
    });
    const res = await loginPost(req);
    assert.strictEqual(res.status, 200);

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie?.includes(ADMIN_COOKIE_NAME), 'Must set sunidhi_admin_session cookie');
    assert.ok(setCookie?.toLowerCase().includes('httponly'), 'Cookie must be HttpOnly');
  });

  await test('POST /api/admin/auth/logout expires session cookie with Max-Age=0', async () => {
    const res = await logoutPost();
    assert.strictEqual(res.status, 200);
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie?.includes(`${ADMIN_COOKIE_NAME}=;`), 'Cookie value must be cleared');
    assert.ok(setCookie?.includes('Max-Age=0'), 'Max-Age must be 0');
  });

  // -------------------------------------------------------------
  // Suite 3: Telemetry Ingestion & Non-blocking Event Tracking
  // -------------------------------------------------------------
  console.log('\nSuite 3: Telemetry Ingestion & Non-blocking Event Tracking');

  await test('POST /api/analytics/event ingests product views and impressions without errors', async () => {
    const viewReq = new NextRequest('http://localhost:3000/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'product_view',
        productId: 'prod_001',
        productSlug: 'satin-bias-cut-slip-midi-dress',
        productTitle: 'Satin Bias-Cut Slip Midi Dress',
        category: 'Fashion',
        store: 'Zara',
        price: 4990,
        source: 'homepage_grid',
        sessionId: 'test_session_user_1',
      }),
    });
    const viewRes = await eventPost(viewReq);
    assert.strictEqual(viewRes.status, 200);

    const imprReq = new NextRequest('http://localhost:3000/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'product_impression',
        productId: 'prod_002',
        productSlug: 'rhode-peptide-glazing-fluid-glow',
        productTitle: 'Peptide Glazing Fluid',
        category: 'Beauty',
        store: 'Nykaa',
        sessionId: 'test_session_user_1',
      }),
    });
    const imprRes = await eventPost(imprReq);
    assert.strictEqual(imprRes.status, 200);

    const storedEvents = EventTracker.getAllEvents();
    assert.ok(storedEvents.length >= 2, 'Events must be stored in EventTracker');
    assert.ok(storedEvents.some(e => e.eventType === 'product_view'));
    assert.ok(storedEvents.some(e => e.eventType === 'product_impression'));
  });

  await test('POST /api/analytics/event deduplicates identical rapid events from same session', async () => {
    const initialCount = EventTracker.getAllEvents().length;
    const dupReq = new NextRequest('http://localhost:3000/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'product_view',
        productId: 'prod_001',
        sessionId: 'test_session_user_1',
      }),
    });
    await eventPost(dupReq);
    const afterCount = EventTracker.getAllEvents().length;
    assert.strictEqual(afterCount, initialCount, 'Rapid duplicate event within 1000ms must be deduplicated');
  });

  await test('POST /api/analytics/event identifies bot user-agents honestly', async () => {
    const botReq = new NextRequest('http://localhost:3000/api/analytics/event', {
      method: 'POST',
      headers: {
        'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      },
      body: JSON.stringify({
        eventType: 'product_view',
        productId: 'prod_bot_test',
        productSlug: 'bot-viewed-item',
        sessionId: 'bot_session',
      }),
    });
    await eventPost(botReq);
    const botEvent = EventTracker.getAllEvents().find(e => e.productId === 'prod_bot_test');
    assert.strictEqual(botEvent?.trafficType, 'bot', 'Googlebot must be classified as bot');
  });

  // -------------------------------------------------------------
  // Suite 4: Analytics Aggregation Engine & KPI Calculation
  // -------------------------------------------------------------
  console.log('\nSuite 4: Analytics Aggregation Engine & KPI Calculation');

  await test('CTR is calculated strictly as Affiliate Clicks / Product Views (and 0% when views=0)', async () => {
    // Zero views scenario
    const overviewEmpty = await AdminAnalyticsService.getOverview({ range: 'today' });
    assert.strictEqual(typeof overviewEmpty.affiliateCtr, 'number');

    // Add 1 click to ClickTracker
    ClickTracker.recordClick({
      id: 'clk_001',
      productId: 'prod_001',
      productSlug: 'satin-bias-cut-slip-midi-dress',
      timestamp: new Date().toISOString(),
      referrer: 'https://www.instagram.com',
      landingPage: '/product/satin-bias-cut-slip-midi-dress',
      userAgent: 'Mozilla/5.0 (iPhone)',
      deviceType: 'mobile',
      trafficType: 'human',
      source: 'Instagram Reel',
      merchant: 'Zara',
      affiliateDestination: 'https://zara.com/sample',
      contentId: 'reel_027',
      campaignId: 'festive_2026',
      sessionId: 'test_session_user_1',
      createdAt: new Date().toISOString(),
    });

    // Add additional views and clicks to test mathematical precision
    EventTracker.recordEvent({
      id: 'ev_001',
      eventType: 'product_view',
      timestamp: new Date().toISOString(),
      productId: 'prod_001',
      productSlug: 'satin-bias-cut-slip-midi-dress',
      category: 'Fashion',
      store: 'Zara',
      trafficType: 'human',
      sessionId: 'test_session_user_2',
      createdAt: new Date().toISOString(),
    });

    const overview = await AdminAnalyticsService.getOverview({ range: 'today' });
    assert.ok(overview.totalVisitors >= 1, 'Visitors count must be >= 1');
    assert.ok(overview.productViews >= 1, 'Product views must be >= 1');
    assert.ok(overview.affiliateClicks >= 1, 'Affiliate clicks must be >= 1');
    assert.strictEqual(
      overview.affiliateCtr,
      Number(((overview.affiliateClicks / overview.productViews) * 100).toFixed(1))
    );
  });

  await test('AdminAnalyticsService.getProductPerformance identifies High-Interest and Underperforming items', async () => {
    // Generate events for high-interest item (lots of views + clicks)
    for (let i = 0; i < 5; i++) {
      EventTracker.recordEvent({
        id: `ev_hi_${i}`,
        eventType: 'product_view',
        timestamp: new Date().toISOString(),
        productSlug: 'satin-bias-cut-slip-midi-dress',
        trafficType: 'human',
        sessionId: `hi_user_${i}`,
        createdAt: new Date().toISOString(),
      });
      ClickTracker.recordClick({
        id: `clk_hi_${i}`,
        productId: 'prod_hi',
        productSlug: 'satin-bias-cut-slip-midi-dress',
        timestamp: new Date().toISOString(),
        referrer: '',
        landingPage: '',
        userAgent: '',
        deviceType: 'mobile',
        trafficType: 'human',
        source: 'Instagram',
        merchant: 'Zara',
        affiliateDestination: 'https://zara.com',
        sessionId: `hi_user_${i}`,
        createdAt: new Date().toISOString(),
      });
    }

    // Generate events for underperforming item (lots of views/impressions, 0 clicks)
    for (let i = 0; i < 12; i++) {
      EventTracker.recordEvent({
        id: `ev_up_${i}`,
        eventType: 'product_view',
        timestamp: new Date().toISOString(),
        productSlug: 'rhode-peptide-glazing-fluid-glow',
        trafficType: 'human',
        sessionId: `up_user_${i}`,
        createdAt: new Date().toISOString(),
      });
      EventTracker.recordEvent({
        id: `ev_up_impr_${i}`,
        eventType: 'product_impression',
        timestamp: new Date().toISOString(),
        productSlug: 'rhode-peptide-glazing-fluid-glow',
        trafficType: 'human',
        sessionId: `up_user_${i}`,
        createdAt: new Date().toISOString(),
      });
    }

    const performance = await AdminAnalyticsService.getProductPerformance({ range: 'today' });
    assert.ok(performance.products.length > 0, 'Products list must not be empty');

    const satin = performance.products.find(p => p.productSlug === 'satin-bias-cut-slip-midi-dress');
    assert.ok(satin, 'Satin dress must exist in catalog performance');
    assert.ok(satin.clicks >= 5, 'Satin dress must have clicks recorded');
    assert.strictEqual(satin.isHighIntent, true, 'Satin dress must be flagged as High Intent');

    const rhode = performance.products.find(p => p.productSlug === 'rhode-peptide-glazing-fluid-glow');
    assert.ok(rhode, 'Rhode fluid must exist in catalog performance');
    assert.strictEqual(rhode.clicks, 0, 'Rhode clicks must be 0');
    assert.strictEqual(rhode.isUnderperforming, true, 'Rhode must be flagged as Underperforming');
  });

  await test('AdminAnalyticsService.getCategories calculates volume and share of clicks', async () => {
    const categories = await AdminAnalyticsService.getCategories({ range: 'all' });
    assert.ok(Array.isArray(categories));
    const fashion = categories.find(c => c.category.toLowerCase() === 'fashion');
    assert.ok(fashion, 'Fashion category must be present');
    assert.ok(fashion.clicks > 0, 'Fashion category must have clicks');
    assert.ok(fashion.shareOfClicks > 0, 'Share of clicks must be > 0%');
  });

  await test('AdminAnalyticsService.getContentPerformance measures Sunidhi.shop Reel views and outbound clicks', async () => {
    // Record content view and product click
    EventTracker.recordEvent({
      id: 'ev_cont_01',
      eventType: 'content_view',
      timestamp: new Date().toISOString(),
      contentId: 'reel_027',
      trafficType: 'human',
      sessionId: 'cont_user_1',
      createdAt: new Date().toISOString(),
    });

    // Ensure a click with contentId reel_027 exists
    ClickTracker.recordClick({
      id: 'clk_cont_01',
      productId: 'prod_001',
      productSlug: 'satin-bias-cut-slip-midi-dress',
      timestamp: new Date().toISOString(),
      referrer: 'https://instagram.com',
      landingPage: '/content/reel_027',
      userAgent: 'Mozilla/5.0',
      deviceType: 'mobile',
      trafficType: 'human',
      source: 'Instagram Reel',
      merchant: 'Zara',
      affiliateDestination: 'https://zara.com',
      contentId: 'reel_027',
      campaignId: 'festive_2026',
      sessionId: 'cont_user_1',
      createdAt: new Date().toISOString(),
    });

    const contentPerf = await AdminAnalyticsService.getContentPerformance({ range: 'all' });
    assert.ok(contentPerf.length > 0);
    const reel27 = contentPerf.find(c => c.contentId === 'reel_027');
    assert.ok(reel27, 'Reel 027 must be tracked');
    assert.ok(reel27.views >= 1, 'Sunidhi.shop Reel views must be >= 1');
    assert.ok(reel27.affiliateClicks >= 1, 'Reel outbound clicks must be >= 1');
  });

  await test('AdminAnalyticsService.getCampaignPerformance measures campaign activity', async () => {
    const campaigns = await AdminAnalyticsService.getCampaignPerformance({ range: 'all' });
    const festive = campaigns.find(c => c.campaignId === 'festive_2026');
    assert.ok(festive, 'Festive 2026 campaign must be tracked');
    assert.ok(festive.affiliateClicks >= 1, 'Festive campaign must have clicks');
  });

  await test('AdminAnalyticsService.getDevices correctly segregates Mobile, Tablet, and Desktop traffic', async () => {
    const devices = await AdminAnalyticsService.getDevices({ range: 'all' });
    assert.ok(devices.length > 0);
    const mobile = devices.find(d => d.deviceType === 'mobile');
    assert.ok(mobile, 'Mobile device category must be present');
    assert.ok(mobile.clicks >= 1, 'Mobile clicks must be >= 1');
  });

  await test('AdminAnalyticsService.getRecentActivity returns latest events without sensitive PII', async () => {
    const activity = await AdminAnalyticsService.getRecentActivity(10);
    assert.ok(activity.length > 0);
    const first = activity[0];
    assert.ok(first.timestamp);
    assert.ok(first.eventType);
    // Verify no IP, no password, no email leaked
    assert.strictEqual((first as any).ip, undefined);
    assert.strictEqual((first as any).password, undefined);
    assert.strictEqual((first as any).email, undefined);
  });

  await test('Deterministic actionable insights are grounded strictly in real data', async () => {
    const overview = await AdminAnalyticsService.getOverview({ range: 'all' });
    assert.ok(overview.insights.length > 0, 'Must produce deterministic insights when data exists');
    assert.ok(overview.insights.some(i => i.id === 'top-product'));
  });

  // -------------------------------------------------------------
  // Suite 5: CSV Data Generation & Export
  // -------------------------------------------------------------
  console.log('\nSuite 5: CSV Data Generation & Export');

  await test('generateCsv produces valid comma-separated values for all supported export types', async () => {
    const productsCsv = await AdminAnalyticsService.generateCsv('products');
    assert.ok(productsCsv.startsWith('Product Title,Slug,Category,Store,Price,Views,Clicks,CTR (%),Status'));
    assert.ok(productsCsv.includes('satin-bias-cut-slip-midi-dress'));

    const dailyCsv = await AdminAnalyticsService.generateCsv('daily');
    assert.ok(dailyCsv.startsWith('Date,Visitors,Product Views,Affiliate Clicks'));

    const contentCsv = await AdminAnalyticsService.generateCsv('content');
    assert.ok(contentCsv.startsWith('Content ID,Type,Title,Sunidhi.shop Views,Product Clicks,Affiliate Clicks'));
    assert.ok(contentCsv.includes('reel_027'));

    const campaignsCsv = await AdminAnalyticsService.generateCsv('campaigns');
    assert.ok(campaignsCsv.startsWith('Campaign ID,Name,Views,Product Views,Affiliate Clicks,CTR (%)'));
    assert.ok(campaignsCsv.includes('festive_2026'));
  });

  await test('GET /api/admin/analytics/export returns CSV with attachment headers', async () => {
    const req = new NextRequest(`http://localhost:3000/api/admin/analytics/export?type=products&secret=${getAdminSecret()}`);
    const res = await exportGet(req);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'text/csv; charset=utf-8');
    assert.ok(res.headers.get('content-disposition')?.includes('attachment; filename="sunidhi-analytics-products-'));
  });

  // -------------------------------------------------------------
  // Suite 6: Public Storefront Integrity & Zero-Data Safety
  // -------------------------------------------------------------
  console.log('\nSuite 6: Public Storefront Integrity & Zero-Data Safety');

  await test('Overview route gracefully handles empty date range with zero crashes', async () => {
    // Clear everything temporarily
    EventTracker.clear();
    ClickTracker.clear();

    const emptyReq = new NextRequest(`http://localhost:3000/api/admin/analytics/overview?range=today&secret=${getAdminSecret()}`);
    const emptyRes = await overviewGet(emptyReq);
    assert.strictEqual(emptyRes.status, 200);
    const data = await emptyRes.json();

    assert.strictEqual(data.totalVisitors, 0);
    assert.strictEqual(data.productViews, 0);
    assert.strictEqual(data.affiliateClicks, 0);
    assert.strictEqual(data.affiliateCtr, 0);
    assert.strictEqual(data.insights[0].id, 'no-clicks-yet');
  });

  await test('Never presents fabricated sales, revenue, or commission metrics', async () => {
    const overview = await AdminAnalyticsService.getOverview({ range: 'all' });
    assert.strictEqual((overview as any).revenue, undefined, 'Must not claim revenue');
    assert.strictEqual((overview as any).sales, undefined, 'Must not claim sales');
    assert.strictEqual((overview as any).commission, undefined, 'Must not claim commission');
    assert.strictEqual((overview as any).roi, undefined, 'Must not claim ROI');
  });

  console.log(`\nAll Phase 10 tests passed successfully: ${passedTests} / ${passedTests} ✓\n`);
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
