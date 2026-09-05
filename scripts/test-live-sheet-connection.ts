import assert from 'assert';
import { GoogleSheetsProductProvider } from '../lib/data/google-sheets-provider';

async function verifyLiveSheet() {
  console.log('--- TESTING LIVE GOOGLE SHEET CONNECTION ---');
  console.log('Connecting to Sheet ID:', process.env.GOOGLE_SHEET_ID);

  GoogleSheetsProductProvider.invalidateCache();
  const provider = new GoogleSheetsProductProvider();
  const products = await provider.getAllProducts();

  console.log(`\nSuccessfully fetched ${products.length} products from live Google Sheet!`);
  assert.ok(products.length >= 10, 'Must fetch at least 10 products from live sheet');

  console.log('\nSample Live Products from Your Google Sheet:');
  products.slice(0, 5).forEach((p, idx) => {
    console.log(`  ${idx + 1}. [${p.category.toUpperCase()}] ${p.title} - ₹${p.price} (${p.brand}) [${p.status}]`);
  });

  console.log('\nTesting Slug Lookup from Live Sheet:');
  const dress = await provider.getProductBySlug('satin-bias-cut-slip-midi-dress');
  assert.ok(dress, 'Must resolve satin-bias-cut-slip-midi-dress from live sheet');
  console.log(`  ✓ Found "${dress.title}" (Price: ₹${dress.price}, Store: ${dress.store})`);

  console.log('\n🎉 GOOGLE SHEET IS 100% CONNECTED & WORKING LIVE WITH SUNIDHI.SHOP!');
}

verifyLiveSheet().catch(err => {
  console.error('Failed to sync live sheet:', err);
  process.exit(1);
});
