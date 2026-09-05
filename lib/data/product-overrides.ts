import fs from 'fs';
import path from 'path';
import { Product } from '@/types/product';
import { GoogleSheetsProductProvider } from './google-sheets-provider';
import { deleteCustomProduct, updateCustomProduct } from './custom-products-store';

const DATA_DIR = path.join(process.cwd(), 'data');
const OVERRIDES_FILE = path.join(DATA_DIR, 'product-overrides.json');

interface OverridesData {
  deletedIds: string[];
  overrides: Record<string, Partial<Product>>;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadOverrides(): OverridesData {
  try {
    ensureDataDir();
    if (!fs.existsSync(OVERRIDES_FILE)) {
      return { deletedIds: [], overrides: {} };
    }
    const raw = fs.readFileSync(OVERRIDES_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
      overrides:
        typeof parsed.overrides === 'object' && parsed.overrides !== null
          ? parsed.overrides
          : {},
    };
  } catch (err) {
    console.error('[ProductOverrides] Failed to load overrides:', err);
    return { deletedIds: [], overrides: {} };
  }
}

export function saveOverrides(data: OverridesData): void {
  ensureDataDir();
  fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(data, null, 2), 'utf-8');
  GoogleSheetsProductProvider.invalidateCache();
}

/**
 * Deletes any product by ID (both custom products and Google Sheet products)
 */
export function removeProductAny(id: string): boolean {
  // Try custom store first
  deleteCustomProduct(id);

  // Add to deletedIds in overrides so sheet products are hidden as well
  const data = loadOverrides();
  if (!data.deletedIds.includes(id)) {
    data.deletedIds.push(id);
    delete data.overrides[id];
    saveOverrides(data);
  }
  return true;
}

/**
 * Updates any product by ID (affiliate link, price, title, etc.)
 */
export function updateProductAny(id: string, updates: Partial<Product>): boolean {
  // Update custom product if it exists there
  updateCustomProduct(id, updates);

  // Also persist in overrides so any product (including Google Sheet) reflects the update
  const data = loadOverrides();
  data.overrides[id] = {
    ...(data.overrides[id] || {}),
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveOverrides(data);
  return true;
}

/**
 * Applies overrides and exclusions to any product array
 */
export function applyProductOverrides(products: Product[]): Product[] {
  const data = loadOverrides();
  const deletedSet = new Set(data.deletedIds);

  return products
    .filter((p) => !deletedSet.has(p.id))
    .map((p) => {
      const override = data.overrides[p.id];
      if (!override) return p;
      return {
        ...p,
        ...override,
        price: override.price !== undefined ? Number(override.price) : p.price,
        originalPrice:
          override.originalPrice !== undefined ? Number(override.originalPrice) : p.originalPrice,
        affiliateUrl: override.affiliateUrl || p.affiliateUrl,
        title: override.title || p.title,
      };
    });
}
