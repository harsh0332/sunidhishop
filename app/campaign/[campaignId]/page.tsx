import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Sparkles, Tag } from 'lucide-react';
import { contentRepository } from '@/lib/data/content-repository';
import { ProductCard } from '@/components/product/ProductCard';
import { CampaignViewTracker } from '@/components/campaign/CampaignViewTracker';
import { AffiliateDisclosureBanner } from '@/components/home/AffiliateDisclosureBanner';
import { SITE_CONFIG } from '@/lib/config/site';

interface CampaignPageProps {
  params: {
    campaignId: string;
  };
}

export async function generateStaticParams() {
  const campaigns = await contentRepository.getAllCampaigns();
  return campaigns.map((c) => ({
    campaignId: c.id,
  }));
}

export async function generateMetadata({ params }: CampaignPageProps): Promise<Metadata> {
  const campaign = await contentRepository.getCampaignById(params.campaignId);

  if (!campaign) {
    return {
      title: `Campaign Not Found | ${SITE_CONFIG.name}`,
    };
  }

  const title = `Sunidhi — ${campaign.name} | Curated Campaign`;
  const description = campaign.description || `Explore ${campaign.name} curated looks and outfit pieces handpicked by Sunidhi.`;
  const canonicalUrl = `${SITE_CONFIG.url}/campaign/${campaign.id}`;
  const ogImage = campaign.products[0]?.image || SITE_CONFIG.defaultOgImage;

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

export default async function CampaignLandingPage({ params }: CampaignPageProps) {
  const campaign = await contentRepository.getCampaignById(params.campaignId);

  if (!campaign) {
    notFound();
  }

  const hasProducts = campaign.products.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-20">
      <CampaignViewTracker
        campaignId={campaign.id}
        itemCount={campaign.products.length}
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
        <span className="text-neutral-900 font-medium">Campaign</span>
      </nav>

      {/* Campaign Hero Banner */}
      <section className="mb-10 p-6 sm:p-8 rounded-3xl bg-neutral-950 text-white shadow-xs space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-stone-200 text-xs font-semibold backdrop-blur-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Curated Campaign</span>
        </div>

        <div className="space-y-2 max-w-2xl">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            {campaign.name}
          </h1>
          {campaign.description && (
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              {campaign.description}
            </p>
          )}
        </div>

        {/* Associated Looks / Reels Pills */}
        {campaign.contents.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-400 font-medium">Featured Looks:</span>
            {campaign.contents.map((content) => (
              <Link
                key={content.id}
                href={`/content/${content.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white transition-colors"
              >
                <span>{content.title}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Campaign Highlights (if present) */}
      {campaign.featuredProducts && campaign.featuredProducts.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-200">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900">
              Featured Highlights
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
              Top Picks
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {campaign.featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                campaignId={campaign.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Campaign Products */}
      {hasProducts ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900">
              All Campaign Pieces
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {campaign.products.length} {campaign.products.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {campaign.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                campaignId={campaign.id}
              />
            ))}
          </div>

          <div className="pt-6">
            <AffiliateDisclosureBanner variant="compact" />
          </div>
        </section>
      ) : (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-stone-200/80 my-4 space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-neutral-900">
            No active pieces found in this campaign
          </h2>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition-all"
          >
            Back to All Picks
          </Link>
        </div>
      )}
    </div>
  );
}
