import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Sparkles, Tag, ArrowRight } from 'lucide-react';
import { productRepository } from '@/lib/data';
import { PriceDisplay } from '@/components/product/PriceDisplay';
import { CreatorNote } from '@/components/product/CreatorNote';
import { AffiliateDisclosureBanner } from '@/components/home/AffiliateDisclosureBanner';
import { ProductCard } from '@/components/product/ProductCard';
import { MobileStickyBar } from '@/components/product/MobileStickyBar';
import { ProductOutboundCTA } from '@/components/product/ProductOutboundCTA';

import { SITE_CONFIG } from '@/lib/config/site';

interface ProductPageProps {
  params: {
    slug: string;
  };
  searchParams?: {
    from?: string;
    contentId?: string;
    campaignId?: string;
  };
}

export async function generateStaticParams() {
  const products = await productRepository.getAllProducts();
  return products.map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await productRepository.getProductBySlug(params.slug);

  if (!product) {
    return {
      title: `Product Not Found | ${SITE_CONFIG.name}`,
    };
  }

  const title = `${product.title} | ${SITE_CONFIG.creator.name}`;
  const description =
    product.creatorNote ||
    product.description ||
    `${product.title}${product.brand ? ` by ${product.brand}` : ''}${
      product.store ? ` available at ${product.store}` : ''
    }. Curated by Sunidhi.`;

  const ogImage = product.image || SITE_CONFIG.defaultOgImage;
  const imageAlt = product.imageAlt || product.title;
  const canonicalUrl = `${SITE_CONFIG.url}/product/${product.slug}`;

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
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProductDetailPage({ params, searchParams }: ProductPageProps) {
  const product = await productRepository.getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const contentId = searchParams?.contentId || product.contentId;
  const campaignId = searchParams?.campaignId || product.campaignId;

  const relatedProducts = await productRepository.getRelatedProducts(product.id, 4);
  const canonicalUrl = `${SITE_CONFIG.url}/product/${product.slug}`;
  const description =
    product.creatorNote ||
    product.description ||
    `${product.title}${product.brand ? ` by ${product.brand}` : ''}. Curated by Sunidhi.`;

  // Structured Data (JSON-LD) for SEO: strictly real fields only, zero fabrication
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: [product.image || SITE_CONFIG.defaultOgImage],
    description,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability:
        product.availability === 'out_of_stock'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      url: canonicalUrl,
      ...(product.store ? { seller: { '@type': 'Organization', name: product.store } } : {}),
    },
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10">
      {/* Product JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Back to Navigation (Context-aware: Returns to Reel Look when arrived from content) */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-neutral-500">
        {contentId ? (
          <Link
            href={`/content/${contentId}`}
            className="inline-flex items-center gap-1 hover:text-neutral-900 transition-colors font-medium text-neutral-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Reel Look</span>
          </Link>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to all picks</span>
          </Link>
        )}
        <span>/</span>
        <span className="capitalize">{product.category}</span>
        {product.brand && (
          <>
            <span>/</span>
            <span className="text-neutral-900 font-medium truncate max-w-[200px]">
              {product.brand}
            </span>
          </>
        )}
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
        {/* Left Column: Product Photography */}
        <div className="md:col-span-6 lg:col-span-7">
          <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/80 shadow-xs">
            <Image
              src={product.image}
              alt={product.imageAlt || product.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center"
            />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
              {product.badge && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-neutral-900 text-white shadow-sm">
                  {product.badge}
                </span>
              )}
            </div>

            {/* Available At Merchant Pill */}
            {product.store && (
              <div className="absolute bottom-3 right-3 z-10">
                <span className="text-xs font-medium px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-neutral-800 border border-stone-200 shadow-sm">
                  Available at {product.store}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Editorial Details & Outbound CTA */}
        <div className="md:col-span-6 lg:col-span-5 flex flex-col">
          {/* Brand & Store */}
          {(product.brand || product.store) && (
            <div className="flex items-center justify-between gap-2 mb-1.5">
              {product.brand ? (
                <p className="text-xs uppercase tracking-widest font-bold text-neutral-500">
                  {product.brand}
                </p>
              ) : <div />}
              {product.store && (
                <span className="text-[11px] font-medium text-neutral-400">
                  Retailer: {product.store}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-neutral-900 leading-snug mb-3">
            {product.title}
          </h1>

          {/* Pricing */}
          <div className="pb-4 mb-4 border-b border-stone-200">
            <PriceDisplay
              price={product.price}
              originalPrice={product.originalPrice}
              currency={product.currency}
              discount={product.discount}
              size="lg"
            />
          </div>

          {/* Instagram Reel Reference Badge */}
          {product.reelUrl && (
            <a
              href={product.reelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-900 text-xs font-medium hover:bg-rose-100 transition-colors mb-5 w-fit"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Seen in Sunidhi&apos;s Reel</span>
              <ArrowRight className="w-3 h-3 text-rose-500 ml-0.5" />
            </a>
          )}

          {/* Creator Note ("Sunidhi's Take") */}
          {product.creatorNote && (
            <div className="mb-6">
              <CreatorNote
                note={product.creatorNote}
                creatorName="Sunidhi"
                variant="expanded"
              />
            </div>
          )}

          {/* Primary Outbound CTA Button (Client Component with Tracking) */}
          <div className="mb-6">
            <ProductOutboundCTA
              product={product}
              contentId={contentId}
              campaignId={campaignId}
            />
          </div>

          {/* Product Description */}
          <div className="mb-6 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Product Details
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 mb-2">
                Style Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-stone-100 text-neutral-700"
                  >
                    <Tag className="w-3 h-3 text-neutral-400" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Affiliate Disclosure Note */}
          <AffiliateDisclosureBanner variant="compact" />
        </div>
      </div>

      {/* Recommended Picks Carousel/Grid */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-10 border-t border-stone-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900">
                More Picks Curated by Sunidhi
              </h2>
              <p className="text-xs text-neutral-500">
                Similar items and styling pairings you might love.
              </p>
            </div>
            <Link
              href="/#picks"
              className="text-xs font-semibold text-neutral-800 hover:text-neutral-950 inline-flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Sticky Bar for Instant Outbound Checkout CTA */}
      <MobileStickyBar
        product={product}
        contentId={contentId}
        campaignId={campaignId}
      />
    </div>
  );
}
