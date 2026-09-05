import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { productRepository } from '@/lib/data';
import { ProductGrid } from '@/components/product/ProductGrid';
import { AffiliateDisclosureBanner } from '@/components/home/AffiliateDisclosureBanner';

import { SITE_CONFIG } from '@/lib/config/site';

interface CategoryPageProps {
  params: {
    category: string;
  };
}

export async function generateStaticParams() {
  const categories = await productRepository.getCategories();
  return categories
    .filter((c) => c.slug !== 'all')
    .map((c) => ({
      category: c.slug,
    }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const categories = await productRepository.getCategories();
  const cat = categories.find((c) => c.slug.toLowerCase() === params.category.toLowerCase());

  const categoryName = cat ? cat.name : params.category.charAt(0).toUpperCase() + params.category.slice(1);
  const title = `${categoryName} Picks | ${SITE_CONFIG.creator.name}`;
  const description =
    cat?.description ||
    `Explore curated ${categoryName.toLowerCase()} recommendations hand-picked by ${SITE_CONFIG.creator.name}.`;

  const canonicalUrl = `${SITE_CONFIG.url}/category/${params.category.toLowerCase()}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.brandName,
      type: 'website',
      images: [
        {
          url: SITE_CONFIG.defaultOgImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [SITE_CONFIG.defaultOgImage],
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const categorySlug = params.category.toLowerCase();
  const [categories, products] = await Promise.all([
    productRepository.getCategories(),
    productRepository.getAllProducts({ category: categorySlug }),
  ]);

  const currentCategory = categories.find((c) => c.slug.toLowerCase() === categorySlug);
  const categoryName = currentCategory ? currentCategory.name : categorySlug;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Breadcrumb Navigation */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-neutral-500">
        <Link
          href="/"
          className="inline-flex items-center gap-1 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Picks</span>
        </Link>
        <span>/</span>
        <span className="text-neutral-900 font-semibold capitalize">{categoryName}</span>
      </nav>

      {/* Category Header */}
      <div className="border-b border-stone-200/80 pb-6 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-neutral-800 text-[11px] font-semibold mb-2">
          <Sparkles className="w-3 h-3 text-neutral-700" />
          <span>Curated Category</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 capitalize">
          {categoryName} Picks
        </h1>
        {currentCategory?.description && (
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            {currentCategory.description}
          </p>
        )}

        {/* Other Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-4">
          <Link
            href="/"
            className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium bg-white text-neutral-700 border border-stone-200 hover:border-stone-400 transition-colors"
          >
            All Picks
          </Link>
          {categories
            .filter((c) => c.slug !== 'all')
            .map((cat) => {
              const isCurrent = cat.slug === categorySlug;
              return (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white text-neutral-700 border border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {cat.name} ({cat.count})
                </Link>
              );
            })}
        </div>
      </div>

      {/* Product Grid */}
      <ProductGrid
        products={products}
        title={`${categoryName} (${products.length})`}
        subtitle="Hand-picked items styled and approved by Sunidhi."
      />

      {/* In-feed affiliate disclosure */}
      <AffiliateDisclosureBanner className="mt-12" />
    </div>
  );
}
