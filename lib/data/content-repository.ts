import { Product } from '@/types/product';
import { Campaign, CreatorContent } from '@/types/content';
import { productRepository } from './index';

export class ContentRepository {
  /**
   * Retrieves a single Creator Content / Reel by its identifier.
   * Strictly includes only active/published products.
   * Orders products by contentOrder then displayOrder.
   * Returns null if content does not exist or is marked draft/archived.
   */
  async getContentById(contentId: string): Promise<CreatorContent | null> {
    if (!contentId || typeof contentId !== 'string') return null;
    const cleanId = contentId.trim().toLowerCase();

    const allProducts = await productRepository.getAllProducts();

    // Find any product that references this contentId (case-insensitive)
    const matchingProducts = allProducts.filter((p) => {
      if (p.contentId && p.contentId.toLowerCase() === cleanId) return true;
      if (p.contentIds && p.contentIds.some((id) => id.toLowerCase() === cleanId)) return true;
      return false;
    });

    if (matchingProducts.length === 0) {
      return null;
    }

    // Extract content metadata from the first product that defines it
    const metaProduct = matchingProducts.find((p) => p.contentTitle || p.contentThumbnail) || matchingProducts[0];
    const contentStatus = metaProduct.contentStatus || 'published';

    // Draft or archived content is unavailable to public
    if (contentStatus === 'draft' || contentStatus === 'archived') {
      return null;
    }

    // Strictly filter products to active only
    const activeProducts = matchingProducts.filter((p) => p.status === 'active');

    // Sort products by contentOrder (if defined), then by displayOrder
    activeProducts.sort((a, b) => {
      const orderA = a.contentOrder ?? a.displayOrder ?? 999;
      const orderB = b.contentOrder ?? b.displayOrder ?? 999;
      return orderA - orderB;
    });

    const contentTitle =
      metaProduct.contentTitle ||
      `Sunidhi's ${metaProduct.contentType === 'reel' ? 'Reel' : 'Look'} #${cleanId.replace(/[^a-zA-Z0-9]/g, '')}`;

    return {
      id: metaProduct.contentId || cleanId,
      type: metaProduct.contentType || 'reel',
      title: contentTitle,
      url: metaProduct.contentUrl || metaProduct.reelUrl || metaProduct.instagramUrl,
      thumbnail: metaProduct.contentThumbnail || (activeProducts[0]?.image ?? undefined),
      campaignId: metaProduct.campaignId,
      campaignName: metaProduct.campaignName,
      status: contentStatus,
      products: activeProducts,
      publishedAt: metaProduct.publishedAt,
    };
  }

  /**
   * Retrieves all unique published creator contents.
   */
  async getAllContents(): Promise<CreatorContent[]> {
    const allProducts = await productRepository.getAllProducts();
    const contentMap = new Map<string, Product[]>();

    allProducts.forEach((product) => {
      const ids: string[] = [];
      if (product.contentId) ids.push(product.contentId.toLowerCase());
      if (product.contentIds) {
        product.contentIds.forEach((id) => ids.push(id.toLowerCase()));
      }

      ids.forEach((id) => {
        if (!contentMap.has(id)) {
          contentMap.set(id, []);
        }
        contentMap.get(id)!.push(product);
      });
    });

    const contents: CreatorContent[] = [];

    for (const [id, products] of contentMap.entries()) {
      const meta = products.find((p) => p.contentTitle || p.contentThumbnail) || products[0];
      if (meta.contentStatus === 'draft' || meta.contentStatus === 'archived') {
        continue;
      }

      const activeProducts = products.filter((p) => p.status === 'active');
      activeProducts.sort((a, b) => {
        const orderA = a.contentOrder ?? a.displayOrder ?? 999;
        const orderB = b.contentOrder ?? b.displayOrder ?? 999;
        return orderA - orderB;
      });

      contents.push({
        id: meta.contentId || id,
        type: meta.contentType || 'reel',
        title: meta.contentTitle || `Sunidhi's Look #${id}`,
        url: meta.contentUrl || meta.reelUrl || meta.instagramUrl,
        thumbnail: meta.contentThumbnail || (activeProducts[0]?.image ?? undefined),
        campaignId: meta.campaignId,
        campaignName: meta.campaignName,
        status: meta.contentStatus || 'published',
        products: activeProducts,
        publishedAt: meta.publishedAt,
      });
    }

    return contents;
  }

  /**
   * Retrieves a Campaign by its identifier, including its associated products and looks.
   */
  async getCampaignById(campaignId: string): Promise<Campaign | null> {
    if (!campaignId || typeof campaignId !== 'string') return null;
    const cleanId = campaignId.trim().toLowerCase();

    const allProducts = await productRepository.getAllProducts();

    // Matching products for this campaign
    const matchingProducts = allProducts.filter(
      (p) => p.campaignId && p.campaignId.toLowerCase() === cleanId
    );

    if (matchingProducts.length === 0) {
      return null;
    }

    const meta = matchingProducts.find((p) => p.campaignName) || matchingProducts[0];
    const campaignName = meta.campaignName || cleanId.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    const activeProducts = matchingProducts.filter((p) => p.status === 'active');
    activeProducts.sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

    // Resolve associated contents
    const contentIds = new Set<string>();
    activeProducts.forEach((p) => {
      if (p.contentId) contentIds.add(p.contentId.toLowerCase());
      if (p.contentIds) p.contentIds.forEach((id) => contentIds.add(id.toLowerCase()));
    });

    const contents: CreatorContent[] = [];
    for (const cId of Array.from(contentIds)) {
      const content = await this.getContentById(cId);
      if (content) contents.push(content);
    }

    const featuredProducts = activeProducts.filter((p) => p.featured);

    return {
      id: meta.campaignId || cleanId,
      name: campaignName,
      description: `Curated ${campaignName} collection handpicked by Sunidhi. Browse the editorial looks and shop each piece directly from official retailers.`,
      status: 'published',
      contents,
      products: activeProducts,
      featuredProducts: featuredProducts.length > 0 ? featuredProducts : undefined,
    };
  }

  /**
   * Retrieves all active campaigns.
   */
  async getAllCampaigns(): Promise<Campaign[]> {
    const allProducts = await productRepository.getAllProducts();
    const campaignIds = new Set<string>();

    allProducts.forEach((p) => {
      if (p.campaignId && p.status === 'active') {
        campaignIds.add(p.campaignId.toLowerCase());
      }
    });

    const campaigns: Campaign[] = [];
    for (const id of Array.from(campaignIds)) {
      const camp = await this.getCampaignById(id);
      if (camp) campaigns.push(camp);
    }

    return campaigns;
  }
}

export const contentRepository = new ContentRepository();
