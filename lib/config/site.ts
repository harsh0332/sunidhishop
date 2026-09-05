/**
 * Centralized site configuration for Sunidhi.shop
 * Defines canonical domain, brand metadata, and creator social links.
 */
export const SITE_CONFIG = {
  name: 'SUNIDHI',
  brandName: 'SUNIDHI.shop',
  domain: 'sunidhi.shop',
  url: 'https://sunidhi.shop',
  title: 'Sunidhi — Fashion & Lifestyle Picks',
  description:
    'Curated fashion, beauty, and lifestyle recommendations by creator Sunidhi. Discover the latest picks and shop them directly from official retailers.',
  creator: {
    name: 'Sunidhi',
    instagram: 'https://instagram.com/sunidhi',
    instagramHandle: '@sunidhi',
  },
  defaultOgImage: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&h=630&q=85',
  themeColor: '#FAF9F6',
  locale: 'en_US',
} as const;

export type SiteConfig = typeof SITE_CONFIG;
