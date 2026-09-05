import fs from 'fs';
import path from 'path';
import { Product } from '@/types/product';
import { GoogleSheetsProductProvider } from './google-sheets-provider';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'custom-products.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getCustomProducts(): Product[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(FILE_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[CustomProductsStore] Failed to read custom products:', err);
    return [];
  }
}

export function saveCustomProduct(productData: Partial<Product> & { title: string; affiliateUrl: string }): Product {
  ensureDataDir();
  const existing = getCustomProducts();

  // Create clean slug
  const baseSlug = (productData.slug || productData.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60);

  const id = productData.id || `custom-${Date.now()}`;
  const slug = productData.slug || `${baseSlug}-${id.slice(-4)}`;

  const now = new Date().toISOString();

  const product: Product = {
    id,
    slug,
    title: productData.title.trim(),
    brand: productData.brand || 'Curated Brand',
    store: productData.store || 'Official Retailer',
    category: productData.category || 'fashion',
    subcategory: productData.subcategory,
    image: productData.image || '',
    imageAlt: productData.title,
    price: Number(productData.price || 0),
    originalPrice: productData.originalPrice ? Number(productData.originalPrice) : undefined,
    currency: 'INR',
    discount: productData.discount,
    description: productData.description || `Curated pick styled by Sunidhi.`,
    creatorNote: productData.creatorNote,
    badge: productData.badge || 'Curator Pick',
    ctaText: productData.ctaText || `Shop at ${productData.store || 'Store'}`,
    affiliateUrl: productData.affiliateUrl.trim(),
    source: 'manual',
    status: 'active',
    featured: true,
    trending: true,
    new: true,
    displayOrder: 0, // High priority (shows at top of latest picks)
    tags: ['Curated', productData.category || 'Fashion'],
    reelUrl: productData.reelUrl,
    publishedAt: now,
    updatedAt: now,
  };

  // Prepend so newest appears first
  const updated = [product, ...existing.filter((p) => p.id !== product.id && p.slug !== product.slug)];
  fs.writeFileSync(FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');

  // Immediately invalidate cache so website shows it
  GoogleSheetsProductProvider.invalidateCache();

  return product;
}

export function deleteCustomProduct(id: string): boolean {
  try {
    ensureDataDir();
    const existing = getCustomProducts();
    const updated = existing.filter((p) => p.id !== id);
    fs.writeFileSync(FILE_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    GoogleSheetsProductProvider.invalidateCache();
    return true;
  } catch (err) {
    console.error('[CustomProductsStore] Failed to delete custom product:', err);
    return false;
  }
}
