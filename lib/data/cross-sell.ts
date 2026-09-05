import { Product } from '@/types/product';

const COMPLEMENTARY_CATEGORIES: Record<string, string[]> = {
  fashion: ['accessories', 'footwear'],
  beauty: ['lifestyle', 'accessories'],
  accessories: ['fashion', 'footwear'],
  footwear: ['fashion', 'accessories'],
  lifestyle: ['beauty', 'fashion'],
};

/**
 * Contextual Cross-Selling Engine for Sunidhi.shop
 * Evaluates candidates by category, subcategory, brand, shared style tags,
 * and complementary lifestyle pairings (e.g., dress + handbag/sandals).
 */
export function computeRelatedProducts(
  current: Product,
  allProducts: Product[],
  limit: number = 4
): Product[] {
  const activeCandidates = allProducts.filter(
    (p) => p.status === 'active' && p.id !== current.id
  );

  const complementary = COMPLEMENTARY_CATEGORIES[current.category] || [];
  const currentTags = new Set((current.tags || []).map((t) => t.toLowerCase()));

  const scored = activeCandidates.map((candidate) => {
    let score = 0;

    // 1. Same Subcategory (highest specificity)
    if (
      current.subcategory &&
      candidate.subcategory &&
      current.subcategory.toLowerCase() === candidate.subcategory.toLowerCase()
    ) {
      score += 6;
    }

    // 2. Same Brand & Store
    if (
      current.brand &&
      candidate.brand &&
      current.brand.toLowerCase() === candidate.brand.toLowerCase()
    ) {
      score += 4;
    }
    if (
      current.store &&
      candidate.store &&
      current.store.toLowerCase() === candidate.store.toLowerCase()
    ) {
      score += 2;
    }

    // 3. Same Creator Content (Pieces styled in the same Reel/Look)
    if (
      current.contentId &&
      candidate.contentId &&
      current.contentId.toLowerCase() === candidate.contentId.toLowerCase()
    ) {
      score += 5;
    }

    // 4. Same Category
    if (candidate.category === current.category) {
      score += 3;
    } else if (complementary.includes(candidate.category)) {
      // Complementary Category pairing (e.g. dress + bag/heels)
      score += 2;
    }

    // 5. Shared tags
    if (candidate.tags && candidate.tags.length > 0) {
      const matchCount = candidate.tags.filter((t) =>
        currentTags.has(t.toLowerCase())
      ).length;
      score += matchCount * 3;
    }

    // 6. Editorial priority bonus
    if (candidate.badge === 'Seen on Sunidhi' || candidate.reelUrl) score += 1;
    if (candidate.featured) score += 1;

    return { product: candidate, score };
  });

  // Sort descending by score, then displayOrder
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.product.displayOrder - b.product.displayOrder;
  });

  const selected = scored
    .filter((s) => s.score > 0)
    .slice(0, limit)
    .map((s) => s.product);

  // If we still need more to meet limit, append other active items
  if (selected.length < limit) {
    const selectedIds = new Set(selected.map((p) => p.id));
    selectedIds.add(current.id);

    const fallbacks = activeCandidates
      .filter((p) => !selectedIds.has(p.id))
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
      .slice(0, limit - selected.length);

    selected.push(...fallbacks);
  }

  return selected;
}
