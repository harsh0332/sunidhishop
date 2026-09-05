import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { contentRepository } from '@/lib/data/content-repository';
import { ProductCard } from '@/components/product/ProductCard';
import { ContentViewTracker } from '@/components/content/ContentViewTracker';
import { AffiliateDisclosureBanner } from '@/components/home/AffiliateDisclosureBanner';
import { SITE_CONFIG } from '@/lib/config/site';

interface ContentPageProps {
  params: {
    contentId: string;
  };
}

export async function generateStaticParams() {
  const contents = await contentRepository.getAllContents();
  return contents.map((c) => ({
    contentId: c.id,
  }));
}

export async function generateMetadata({ params }: ContentPageProps): Promise<Metadata> {
  const content = await contentRepository.getContentById(params.contentId);

  if (!content) {
    return {
      title: `Look Not Found | ${SITE_CONFIG.name}`,
    };
  }

  const title = `Sunidhi — ${content.title} | Shop the Look`;
  const description = `Shop the exact pieces from Sunidhi's ${content.type}. Curated styling finds and merchant links with no extra cost.`;
  const canonicalUrl = `${SITE_CONFIG.url}/content/${content.id}`;
  const ogImage = content.thumbnail || SITE_CONFIG.defaultOgImage;

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
          alt: title,
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

export default async function ContentLandingPage({ params }: ContentPageProps) {
  const content = await contentRepository.getContentById(params.contentId);

  if (!content) {
    notFound();
  }

  const hasProducts = content.products.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-20">
      <ContentViewTracker
        contentId={content.id}
        campaignId={content.campaignId}
        itemCount={content.products.length}
      />

      {/* Back Navigation */}
      <nav className="mb-6 flex items-center gap-2 text-xs text-neutral-500">
        <Link
          href="/"
          className="inline-flex items-center gap-1 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to all picks</span>
        </Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium capitalize">
          {content.type} Look
        </span>
      </nav>

      {/* Compact Content Hero */}
      <section className="mb-8 p-4 sm:p-6 rounded-2xl bg-white border border-stone-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
        {content.thumbnail && (
          <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
            <Image
              src={content.thumbnail}
              alt={content.title}
              fill
              priority
              sizes="96px"
              className="object-cover object-center"
            />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 text-[11px] font-semibold">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Seen in {content.type === 'reel' ? 'Reel' : 'Look'}</span>
            </span>
            {content.campaignName && (
              <span className="text-[11px] font-medium text-stone-500">
                • {content.campaignName}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-950 leading-tight">
            {content.title}
          </h1>

          <p className="text-xs sm:text-sm text-neutral-600">
            Shop the pieces featured in this look. Browse the picks below and tap to open external retailers.
          </p>

          {content.url && (
            <div className="pt-1">
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-800 hover:text-neutral-950 underline underline-offset-4"
              >
                <span>Watch original Reel</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Grouped "Shop the Look" Products */}
      {hasProducts ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-200/80">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900">
              Shop the Look
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {content.products.length} {content.products.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {content.products.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={idx < 4}
                contentId={content.id}
                campaignId={content.campaignId}
              />
            ))}
          </div>

          <div className="pt-6">
            <AffiliateDisclosureBanner variant="compact" />
          </div>
        </section>
      ) : (
        /* Empty State when valid content has no active products */
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-stone-200/80 my-4 space-y-4">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-neutral-700 mx-auto flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-neutral-500" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900">
              Products from this look are currently unavailable
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto">
              These items may have sold out at the retailer. Explore other current picks recommended by Sunidhi.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-all shadow-sm"
          >
            Back to All Picks
          </Link>
        </div>
      )}
    </div>
  );
}
