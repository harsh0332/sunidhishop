import { Product } from '@/types/product';

const STORAGE_KEY = 'sunidhi_recently_viewed';
const MAX_RECENT_ITEMS = 4;

export interface RecentlyViewedItem {
  id: string;
  slug: string;
  title: string;
  brand?: string;
  store?: string;
  price: number;
  currency: string;
  image: string;
  viewedAt: number;
}

export function recordRecentlyViewed(product: Product): void {
  if (typeof window === 'undefined') return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    let items: RecentlyViewedItem[] = raw ? JSON.parse(raw) : [];

    // Filter out existing instance of this product (to place it at the front)
    items = items.filter((item) => item.id !== product.id && item.slug !== product.slug);

    // Prepend fresh record
    items.unshift({
      id: product.id,
      slug: product.slug,
      title: product.title,
      brand: product.brand,
      store: product.store,
      price: product.price,
      currency: product.currency,
      image: product.image,
      viewedAt: Date.now(),
    });

    // Enforce max limit
    if (items.length > MAX_RECENT_ITEMS) {
      items = items.slice(0, MAX_RECENT_ITEMS);
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage disabled or unavailable, safely ignore
  }
}

export function getRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: RecentlyViewedItem[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_ITEMS) : [];
  } catch {
    return [];
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // safely ignore
  }
}
