import { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/lib/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/go/', '/api/', '/admin/', '/admin', '/product-unavailable'],
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
  };
}
