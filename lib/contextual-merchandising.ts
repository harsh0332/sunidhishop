import { Product, ProductCategory } from '@/types/product';
import { sanitizeText } from './data/product-validator';

export interface EntryContextParams {
  content?: string;
  contentId?: string;
  campaign?: string;
  campaignId?: string;
  category?: string;
  product?: string;
  utm_source?: string;
  utm_campaign?: string;
}

export interface MerchandisingContext {
  type: 'content' | 'campaign' | 'category' | 'product' | 'default';
  badge?: string;
  heading: string;
  subheading?: string;
  prioritizedProducts: Product[];
  remainingProducts: Product[];
  targetCategory?: ProductCategory;
  highlightedProduct?: Product;
  contentId?: string;
  campaignId?: string;
  contentTitle?: string;
  campaignName?: string;
  contentThumbnail?: string;
}

const VALID_CATEGORIES: ProductCategory[] = ['fashion', 'beauty', 'accessories', 'footwear', 'lifestyle'];

/**
 * Resolves entry parameters to produce presentation-level personalization
 * on the homepage without altering the canonical database or creating redirect loops.
 */
export function resolveMerchandisingContext(
  params: EntryContextParams,
  allProducts: Product[]
): MerchandisingContext {
  // Only operate on active products
  const activeProducts = allProducts.filter((p) => p.status === 'active');

  // 1. Content Context (Instagram Reel / Look)
  const rawContent = sanitizeText(params.contentId || params.content);
  if (rawContent && rawContent.length > 0) {
    const cleanContentId = rawContent.toLowerCase();
    const matched = activeProducts.filter((p) => {
      if (p.contentId && p.contentId.toLowerCase() === cleanContentId) return true;
      if (p.contentIds && p.contentIds.some((id) => id.toLowerCase() === cleanContentId)) return true;
      return false;
    });

    if (matched.length > 0) {
      matched.sort((a, b) => {
        const orderA = a.contentOrder ?? a.displayOrder ?? 999;
        const orderB = b.contentOrder ?? b.displayOrder ?? 999;
        return orderA - orderB;
      });

      const meta = matched.find((p) => p.contentTitle) || matched[0];
      const contentTitle = meta.contentTitle || 'From this Reel';
      const matchedIds = new Set(matched.map((p) => p.id));
      const remaining = activeProducts.filter((p) => !matchedIds.has(p.id));

      return {
        type: 'content',
        badge: 'Shop This Reel',
        heading: contentTitle,
        subheading: 'Shop the exact pieces Sunidhi wore in this look.',
        prioritizedProducts: matched,
        remainingProducts: remaining,
        contentId: meta.contentId || cleanContentId,
        contentTitle,
        contentThumbnail: meta.contentThumbnail || matched[0].image,
        campaignId: meta.campaignId,
        campaignName: meta.campaignName,
      };
    }
  }

  // 2. Campaign Context (e.g. Festive 2026, Summer Capsule)
  const rawCampaign = sanitizeText(params.campaignId || params.campaign || params.utm_campaign);
  if (rawCampaign && rawCampaign.length > 0) {
    const cleanCampaignId = rawCampaign.toLowerCase();
    const matched = activeProducts.filter(
      (p) => p.campaignId && p.campaignId.toLowerCase() === cleanCampaignId
    );

    if (matched.length > 0) {
      matched.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
      const meta = matched.find((p) => p.campaignName) || matched[0];
      const campaignName = meta.campaignName || cleanCampaignId.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const matchedIds = new Set(matched.map((p) => p.id));
      const remaining = activeProducts.filter((p) => !matchedIds.has(p.id));

      return {
        type: 'campaign',
        badge: 'Curated Campaign',
        heading: campaignName,
        subheading: 'Curated seasonal collection handpicked by Sunidhi.',
        prioritizedProducts: matched,
        remainingProducts: remaining,
        campaignId: meta.campaignId || cleanCampaignId,
        campaignName,
      };
    }
  }

  // 3. Product Context (Direct item link)
  const rawProduct = sanitizeText(params.product);
  if (rawProduct && rawProduct.length > 0) {
    const cleanProduct = rawProduct.toLowerCase();
    const matched = activeProducts.find(
      (p) => p.slug.toLowerCase() === cleanProduct || p.id.toLowerCase() === cleanProduct
    );

    if (matched) {
      const remaining = activeProducts.filter((p) => p.id !== matched.id);

      return {
        type: 'product',
        badge: 'Featured Link',
        heading: 'Featured from your link',
        subheading: `Browsing recommendation: ${matched.title}`,
        highlightedProduct: matched,
        prioritizedProducts: [matched],
        remainingProducts: remaining,
      };
    }
  }

  // 4. Category Context (e.g. /?category=beauty)
  const rawCategory = sanitizeText(params.category).toLowerCase();
  if (rawCategory && rawCategory.length > 0) {
    let targetCategory: ProductCategory | undefined = undefined;

    if (VALID_CATEGORIES.includes(rawCategory as ProductCategory)) {
      targetCategory = rawCategory as ProductCategory;
    } else if (rawCategory.includes('saree') || rawCategory.includes('cloth') || rawCategory.includes('dress')) {
      targetCategory = 'fashion';
    } else if (rawCategory.includes('skin') || rawCategory.includes('makeup')) {
      targetCategory = 'beauty';
    } else if (rawCategory.includes('bag') || rawCategory.includes('jewel')) {
      targetCategory = 'accessories';
    } else if (rawCategory.includes('shoe') || rawCategory.includes('heel')) {
      targetCategory = 'footwear';
    }

    if (targetCategory) {
      const matched = activeProducts.filter((p) => p.category === targetCategory);
      const remaining = activeProducts.filter((p) => p.category !== targetCategory);
      const categoryName = targetCategory.charAt(0).toUpperCase() + targetCategory.slice(1);

      return {
        type: 'category',
        badge: `${categoryName} Picks`,
        heading: `${categoryName} Curation`,
        subheading: `Sunidhi’s handpicked ${targetCategory} essentials.`,
        targetCategory,
        prioritizedProducts: matched,
        remainingProducts: remaining,
      };
    }
  }

  // 5. Default Curated Storefront (No special context or invalid parameters)
  return {
    type: 'default',
    heading: "Sunidhi's Latest Picks",
    subheading: 'Seen on Sunidhi. Worth a look.',
    prioritizedProducts: activeProducts,
    remainingProducts: [],
  };
}
