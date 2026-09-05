/**
 * Phase 7 Production Hardening & Launch Readiness Test Suite
 * Tests security headers, rate limiting, legal routes, product data resilience,
 * error boundaries, image fallbacks, and launch assets.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { checkRateLimit, getRateLimitHeaders, resetRateLimits } from '../lib/rate-limiter';
import { normalizeProductRow, sanitizeText, sanitizeUrl, slugify } from '../lib/data/product-validator';
import { SITE_CONFIG } from '../lib/config/site';

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

async function main() {
  console.log('--- PHASE 7: PRODUCTION HARDENING & LAUNCH READINESS ---');

  // Group 1: Legal & Compliance Routes
  console.log('\n[1] Legal & Compliance Pages:');

  runTest('Privacy policy page exists and commits to privacy & zero sensitive data storage', () => {
    const filePath = path.join(process.cwd(), 'app/privacy/page.tsx');
    assert.ok(fs.existsSync(filePath), 'app/privacy/page.tsx must exist');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('Privacy Policy'), 'Must have Privacy Policy title');
    assert.ok(content.includes('Information We Do NOT Collect'), 'Must outline data not collected');
    assert.ok(content.includes('without recording or storing raw IP addresses'), 'Must clarify IP address handling');
    assert.ok(content.includes('Third-Party Merchants & Affiliate Links'), 'Must explain affiliate merchant links');
  });

  runTest('Terms of Service page exists and clarifies affiliate nature', () => {
    const filePath = path.join(process.cwd(), 'app/terms/page.tsx');
    assert.ok(fs.existsSync(filePath), 'app/terms/page.tsx must exist');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('Terms of Use'), 'Must have Terms of Use title');
    assert.ok(content.includes('Nature of the Storefront'), 'Must explain nature of storefront');
    assert.ok(content.includes('Orders & Customer Service'), 'Must clarify orders handled by merchant');
    assert.ok(content.includes('Intellectual Property'), 'Must protect creator IP');
  });

  runTest('Contact page exists with brand partnerships info', () => {
    const filePath = path.join(process.cwd(), 'app/contact/page.tsx');
    assert.ok(fs.existsSync(filePath), 'app/contact/page.tsx must exist');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('Get in Touch'), 'Must have Get in Touch title');
    assert.ok(content.includes('Instagram (Fastest Response)'), 'Must offer Instagram direct');
    assert.ok(content.includes('Brand Collaborations & Press'), 'Must explain collaboration guidelines');
    assert.ok(content.includes('Shopping & Order Inquiries'), 'Must guide shopping inquiries to merchant');
  });

  runTest('FTC/ASCI Disclosure page exists and informs consumer clearly', () => {
    const filePath = path.join(process.cwd(), 'app/disclosure/page.tsx');
    assert.ok(fs.existsSync(filePath), 'app/disclosure/page.tsx must exist');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('Affiliate Disclosure'), 'Must have Affiliate Disclosure heading');
    assert.ok(content.includes('Zero extra cost to you'), 'Must clarify no extra cost to user');
    assert.ok(content.includes('ASCI'), 'Must reference ASCI standards');
  });

  // Group 2: Security & Next.js Configuration
  console.log('\n[2] Next.js Security Configuration:');

  runTest('next.config.mjs defines enterprise security headers', () => {
    const filePath = path.join(process.cwd(), 'next.config.mjs');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('Strict-Transport-Security'), 'Must include HSTS');
    assert.ok(content.includes('X-Frame-Options'), 'Must include X-Frame-Options');
    assert.ok(content.includes('X-Content-Type-Options'), 'Must include X-Content-Type-Options');
    assert.ok(content.includes('Referrer-Policy'), 'Must include Referrer-Policy');
    assert.ok(content.includes('Permissions-Policy'), 'Must include Permissions-Policy');
  });

  runTest('next.config.mjs redirects /affiliate-disclosure to /disclosure', () => {
    const filePath = path.join(process.cwd(), 'next.config.mjs');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("source: '/affiliate-disclosure'"), 'Must redirect /affiliate-disclosure');
    assert.ok(content.includes("destination: '/disclosure'"), 'Must point to /disclosure');
  });

  runTest('next.config.mjs allows universal HTTPS image loading for merchant CDNs', () => {
    const filePath = path.join(process.cwd(), 'next.config.mjs');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("protocol: 'https'"), 'Must configure https images');
    assert.ok(content.includes("hostname: '**'"), 'Must configure universal wildcard hostname');
  });

  // Group 3: Rate Limiting & Denial of Service Protection
  console.log('\n[3] In-Memory Rate Limiter:');

  runTest('Rate limiter allows requests within quota', () => {
    resetRateLimits();
    const result1 = checkRateLimit('client-ip-1', 3, 60000);
    assert.strictEqual(result1.allowed, true);
    assert.strictEqual(result1.remaining, 2);

    const result2 = checkRateLimit('client-ip-1', 3, 60000);
    assert.strictEqual(result2.allowed, true);
    assert.strictEqual(result2.remaining, 1);
  });

  runTest('Rate limiter blocks requests exceeding quota', () => {
    resetRateLimits();
    checkRateLimit('client-ip-burst', 2, 60000);
    checkRateLimit('client-ip-burst', 2, 60000);
    const blocked = checkRateLimit('client-ip-burst', 2, 60000);

    assert.strictEqual(blocked.allowed, false);
    assert.strictEqual(blocked.remaining, 0);

    const headers = getRateLimitHeaders(blocked, 2);
    assert.strictEqual(headers['X-RateLimit-Limit'], '2');
    assert.strictEqual(headers['X-RateLimit-Remaining'], '0');
    assert.ok(Number(headers['Retry-After']) > 0, 'Retry-After must be > 0');
  });

  runTest('Rate limiter isolates distinct IPs', () => {
    resetRateLimits();
    checkRateLimit('ip-a', 1, 60000);
    const blockedA = checkRateLimit('ip-a', 1, 60000);
    assert.strictEqual(blockedA.allowed, false);

    // IP B has fresh quota
    const allowedB = checkRateLimit('ip-b', 1, 60000);
    assert.strictEqual(allowedB.allowed, true);
  });

  // Group 4: Data Edge Cases & Resilience
  console.log('\n[4] Data Validation Edge Cases:');

  runTest('Validator handles multilingual & Unicode text (Hindi, Accents, Emoji)', () => {
    const raw = {
      title: '✨ हैंडमेड जरदोजी Kurta Set (Café au Lait)',
      image: 'https://images.unsplash.com/photo-test',
      price: '4500',
      currency: 'INR',
      affiliateUrl: 'https://example.com/item',
      status: 'active',
      category: 'fashion',
      description: 'सुंदर हाथ की कढ़ाई वाला कुर्ता सेट with luxury silk drape & pearls.',
      creatorNote: 'Styled with gold jhumkas for festivities! 🌟',
    };

    const { product, validation } = normalizeProductRow(raw, 0);
    assert.strictEqual(validation.isValid, true);
    assert.ok(product.title?.includes('जरदोजी'));
    assert.ok(product.title?.includes('Café au Lait'));
    assert.ok(product.description?.includes('सुंदर हाथ की'));
  });

  runTest('Validator flags missing or non-positive price as invalid according to specification', () => {
    const raw = {
      title: 'Missing Price Item',
      image: 'https://images.unsplash.com/sample',
      price: '0',
      currency: 'INR',
      affiliateUrl: 'https://merchant.com/sample',
      status: 'active',
    };

    const { validation } = normalizeProductRow(raw, 0);
    assert.strictEqual(validation.isValid, false);
    assert.ok(validation.errors.some(e => e.includes('price')));
  });

  runTest('Validator sanitizes script tags and HTML injection safely', () => {
    const unclean = '<script>alert("xss")</script>Satin Dress<b>Bold</b>';
    const clean = sanitizeText(unclean);
    assert.ok(!clean.includes('<script>'), 'Must strip script tags');
    assert.ok(clean.includes('Satin Dress'), 'Must retain core text');
    assert.ok(!clean.includes('<b>'), 'Must strip b tags');
  });

  runTest('Validator defaults missing category to "fashion" and currency to "INR"', () => {
    const raw = {
      title: 'Minimal Gold Ring',
      image: 'https://images.unsplash.com/ring',
      price: '1299',
      affiliateUrl: 'https://jeweler.com/ring',
      status: 'active',
    };

    const { product, validation } = normalizeProductRow(raw, 0);
    assert.strictEqual(validation.isValid, true);
    assert.strictEqual(product.category, 'fashion');
    assert.strictEqual(product.currency, 'INR');
  });

  runTest('Validator rejects unsafe url schemes like javascript: and data:', () => {
    assert.strictEqual(sanitizeUrl('javascript:alert(1)'), undefined);
    assert.strictEqual(sanitizeUrl('data:text/html,<script>alert(1)</script>'), undefined);
    assert.strictEqual(sanitizeUrl('https://zara.com/in/item'), 'https://zara.com/in/item');
  });

  // Group 5: UI Resilience & Error Boundaries
  console.log('\n[5] UI Resilience & Fallbacks:');

  runTest('Root error boundary exists with retry mechanism', () => {
    const filePath = path.join(process.cwd(), 'app/error.tsx');
    assert.ok(fs.existsSync(filePath), 'app/error.tsx must exist');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("'use client'"), 'Must be client component');
    assert.ok(content.includes('reset'), 'Must include reset function');
    assert.ok(content.includes('Something went momentarily wrong'), 'Must render graceful error message');
    assert.ok(content.includes('Try Again'), 'Must have retry CTA');
  });

  runTest('Global error boundary exists for catastrophic layout failures', () => {
    const filePath = path.join(process.cwd(), 'app/global-error.tsx');
    assert.ok(fs.existsSync(filePath), 'app/global-error.tsx must exist');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("'use client'"), 'Must be client component');
    assert.ok(content.includes('<html'), 'Must wrap html tag');
    assert.ok(content.includes('Refresh Storefront'), 'Must have refresh CTA');
  });

  runTest('ProductCard implements image fallback on error', () => {
    const filePath = path.join(process.cwd(), 'components/product/ProductCard.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('onError'), 'Must handle onError on image');
    assert.ok(content.includes('imgSrc'), 'Must use stateful image source for fallback');
    assert.ok(content.includes('defaultOgImage'), 'Must fall back to defaultOgImage');
  });

  runTest('ProductGrid handles empty catalog gracefully', () => {
    const filePath = path.join(process.cwd(), 'components/product/ProductGrid.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('No matching picks found'), 'Must have empty catalog fallback title');
    assert.ok(content.includes('Show All Picks'), 'Must have reset filter CTA button');
  });

  // Group 6: Brand Favicons & App Assets
  console.log('\n[6] Favicons & Touch Assets:');

  runTest('SVG favicon and Apple touch icon exist with valid markup', () => {
    const iconPath = path.join(process.cwd(), 'app/icon.svg');
    const appleIconPath = path.join(process.cwd(), 'app/apple-icon.svg');

    assert.ok(fs.existsSync(iconPath), 'app/icon.svg must exist');
    assert.ok(fs.existsSync(appleIconPath), 'app/apple-icon.svg must exist');

    const iconContent = fs.readFileSync(iconPath, 'utf-8');
    assert.ok(iconContent.includes('<svg') && iconContent.includes('</svg>'), 'icon.svg must be valid SVG');

    const appleIconContent = fs.readFileSync(appleIconPath, 'utf-8');
    assert.ok(appleIconContent.includes('<svg') && appleIconContent.includes('</svg>'), 'apple-icon.svg must be valid SVG');
  });

  runTest('Root layout registers favicons and mobile viewport', () => {
    const filePath = path.join(process.cwd(), 'app/layout.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert.ok(content.includes("icon: '/icon.svg'"), 'Must link icon.svg');
    assert.ok(content.includes("apple: '/apple-icon.svg'"), 'Must link apple-icon.svg');
    assert.ok(content.includes('viewport: Viewport'), 'Must export responsive viewport');
  });

  console.log(`\n========================================`);
  console.log(`Phase 7 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
