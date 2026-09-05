import { CategorySummary, LookbookItem, Product, ProductCategory, ProductFilterOptions } from '@/types/product';
import { IProductRepository } from './product-repository.interface';
import { MOCK_LOOKBOOKS, MOCK_PRODUCTS } from './mock-products';
import { computeRelatedProducts } from './cross-sell';

export class MockProductRepository implements IProductRepository {
  private products: Product[] = [...MOCK_PRODUCTS];
  private lookbooks: LookbookItem[] = [...MOCK_LOOKBOOKS];

  async getAllProducts(filters?: ProductFilterOptions): Promise<Product[]> {
    let result = this.products.filter(p => p.status === 'active');

    if (filters?.category && filters.category !== 'all') {
      result = result.filter(p => p.category.toLowerCase() === filters.category?.toLowerCase());
    }

    if (filters?.tag) {
      result = result.filter(p => p.tags?.some(t => t.toLowerCase() === filters.tag?.toLowerCase()));
    }

    if (filters?.featured !== undefined) {
      result = result.filter(p => p.featured === filters.featured);
    }

    if (filters?.trending !== undefined) {
      result = result.filter(p => p.trending === filters.trending);
    }

    if (filters?.isNew !== undefined) {
      result = result.filter(p => p.new === filters.isNew);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.store.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'newest':
          result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
          break;
        case 'price-low':
          result.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          result.sort((a, b) => b.price - a.price);
          break;
        case 'trending':
          result.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0));
          break;
        case 'featured':
        default:
          result.sort((a, b) => a.displayOrder - b.displayOrder);
          break;
      }
    } else {
      result.sort((a, b) => a.displayOrder - b.displayOrder);
    }

    if (filters?.offset !== undefined && filters?.limit !== undefined) {
      return result.slice(filters.offset, filters.offset + filters.limit);
    } else if (filters?.limit !== undefined) {
      return result.slice(0, filters.limit);
    }

    return result;
  }

  async getProductBySlug(slug: string): Promise<Product | null> {
    const product = this.products.find(p => p.slug === slug && p.status === 'active');
    return product || null;
  }

  async getProductById(id: string): Promise<Product | null> {
    const product = this.products.find(p => p.id === id && p.status === 'active');
    return product || null;
  }

  async getFeaturedProducts(limit: number = 8): Promise<Product[]> {
    return this.products
      .filter(p => p.status === 'active' && p.featured)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .slice(0, limit);
  }

  async getSeenOnSunidhiProducts(limit: number = 6): Promise<Product[]> {
    return this.products
      .filter(p => p.status === 'active' && (p.badge === 'Seen on Sunidhi' || p.reelUrl))
      .slice(0, limit);
  }

  async getCategories(): Promise<CategorySummary[]> {
    const activeProducts = this.products.filter(p => p.status === 'active');
    
    const categoryConfigs: { id: ProductCategory | 'all'; name: string; slug: string; description: string }[] = [
      { id: 'all', name: 'All Picks', slug: 'all', description: 'Everything curated by Sunidhi' },
      { id: 'fashion', name: 'Fashion', slug: 'fashion', description: 'Tailoring, dresses & daily wear' },
      { id: 'beauty', name: 'Beauty', slug: 'beauty', description: 'Skincare, makeup & fragrances' },
      { id: 'accessories', name: 'Accessories', slug: 'accessories', description: 'Bags, jewelry & eyewear' },
      { id: 'footwear', name: 'Footwear', slug: 'footwear', description: 'Heels, sandals & daily flats' },
      { id: 'lifestyle', name: 'Lifestyle', slug: 'lifestyle', description: 'Home decor & aesthetic essentials' },
    ];

    return categoryConfigs.map(cat => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      count: cat.id === 'all' 
        ? activeProducts.length 
        : activeProducts.filter(p => p.category === cat.id).length,
    }));
  }

  async getLookbooks(): Promise<LookbookItem[]> {
    return this.lookbooks;
  }

  async searchProducts(query: string): Promise<Product[]> {
    if (!query || query.trim().length === 0) return [];
    return this.getAllProducts({ search: query });
  }

  async getRelatedProducts(productId: string, limit: number = 4): Promise<Product[]> {
    const current = await this.getProductById(productId);
    if (!current) return this.getFeaturedProducts(limit);

    return computeRelatedProducts(current, this.products, limit);
  }

  async getAllProductsAdmin(): Promise<Product[]> {
    return this.products;
  }

  async getProductBySlugAdmin(slug: string): Promise<Product | null> {
    const product = this.products.find(p => p.slug === slug);
    return product || null;
  }
}

// Singleton repository instance export
export const mockProductRepository = new MockProductRepository();
