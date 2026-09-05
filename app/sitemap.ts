import { MetadataRoute } from 'next';
import { productRepository } from '@/lib/data';
import { contentRepository } from '@/lib/data/content-repository';
import { SITE_CONFIG } from '@/lib/config/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_CONFIG.url;
  const [products, categories, contents, campaigns] = await Promise.all([
    productRepository.getAllProducts(),
    productRepository.getCategories(),
    contentRepository.getAllContents(),
    contentRepository.getAllCampaigns(),
  ]);

  // Strictly include only active/published products (exclude draft, archived, invalid)
  const activeProducts = products.filter((p) => p.status === 'active');

  const productUrls = activeProducts.map((product) => ({
    url: `${baseUrl}/product/${product.slug}`,
    lastModified: new Date(product.updatedAt || product.publishedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categoryUrls = categories
    .filter((c) => c.slug !== 'all')
    .map((cat) => ({
      url: `${baseUrl}/category/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  const contentUrls = contents.map((c) => ({
    url: `${baseUrl}/content/${c.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  const campaignUrls = campaigns.map((camp) => ({
    url: `${baseUrl}/campaign/${camp.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.75,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/disclosure`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...categoryUrls,
    ...contentUrls,
    ...campaignUrls,
    ...productUrls,
  ];
}
