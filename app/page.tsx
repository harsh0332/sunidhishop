import { Metadata } from 'next';
import { productRepository } from '@/lib/data';
import { StorefrontView } from '@/components/home/StorefrontView';
import { EntryContextParams, resolveMerchandisingContext } from '@/lib/contextual-merchandising';

export const metadata: Metadata = {
  title: 'SUNIDHI | Curated Fashion, Beauty & Lifestyle Storefront',
  description:
    'Browse fashion, beauty, and lifestyle recommendations curated by creator Sunidhi. Discover the latest picks and shop them directly from original retailers.',
  alternates: {
    canonical: 'https://sunidhi.shop',
  },
  openGraph: {
    title: 'SUNIDHI | Curated Fashion & Lifestyle Storefront',
    description:
      'Things I’m Loving Right Now. Curated fashion, beauty & lifestyle finds by Sunidhi.',
    url: 'https://sunidhi.shop',
    siteName: 'SUNIDHI',
    type: 'website',
  },
};

interface HomePageProps {
  searchParams?: EntryContextParams;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const [products, categories, lookbooks] = await Promise.all([
    productRepository.getAllProducts(),
    productRepository.getCategories(),
    productRepository.getLookbooks(),
  ]);

  const merchandisingContext = resolveMerchandisingContext(searchParams || {}, products);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SUNIDHI Storefront',
    url: 'https://sunidhi.shop',
    description: 'Things I’m Loving Right Now. Curated fashion, beauty & lifestyle finds by Sunidhi.',
    author: {
      '@type': 'Person',
      name: 'Sunidhi',
      url: 'https://instagram.com/sunidhi',
      jobTitle: 'Fashion & Lifestyle Content Creator',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StorefrontView
        initialProducts={products}
        categories={categories}
        lookbooks={lookbooks}
        merchandisingContext={merchandisingContext}
      />
    </>
  );
}
