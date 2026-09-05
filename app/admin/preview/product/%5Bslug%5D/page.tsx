import React from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Eye,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Tag,
  Store,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { productRepository } from '@/lib/data';

interface PreviewProps {
  params: { slug: string };
}

export const dynamic = 'force-dynamic';

export default async function DraftProductPreviewPage({ params }: PreviewProps) {
  const slug = params.slug;

  const product = productRepository.getProductBySlugAdmin
    ? await productRepository.getProductBySlugAdmin(slug)
    : await productRepository.getProductBySlug(slug);

  if (!product) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-[#FFF1F0] flex items-center justify-center mb-4 text-[#CF1322]">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-2xl text-[#1A1A1A] mb-2">Product Not Found</h1>
        <p className="text-xs text-[#666] max-w-md mb-6">
          No product was found in the catalog matching slug <code className="bg-white px-1 py-0.5 rounded border">{slug}</code>.
        </p>
        <Link
          href="/admin/products/health"
          className="px-4 py-2 rounded-xl bg-[#1A1A1A] text-white text-xs font-medium"
        >
          ← Return to Product Health
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-white pb-24">
      {/* Non-indexable indicator */}
      <meta name="robots" content="noindex, nofollow" />

      {/* Top Sticky Admin Preview Banner */}
      <div className="sticky top-0 z-50 bg-[#1A1A1A] text-white px-4 lg:px-8 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#E6A055] animate-pulse" />
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#E6A055]">
              Admin Preview Mode
            </span>
            <span className="text-[#666]">•</span>
            <span className="text-[#CCC]">
              {product.status === 'active' ? 'Published' : product.status === 'draft' ? 'Draft (Not Live)' : 'Archived'}
            </span>
            {product.publishAt && (
              <span className="text-[#888] text-[11px]">
                (Scheduled: {new Date(product.publishAt).toLocaleDateString()})
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/products/health"
              className="text-[#BBB] hover:text-white transition-colors flex items-center gap-1 text-[11px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Health</span>
            </Link>
            <span className="text-[#444]">|</span>
            <Link
              href="/admin/analytics"
              className="text-[#BBB] hover:text-white transition-colors text-[11px]"
            >
              Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* Product Preview Presentation */}
      <main className="max-w-5xl mx-auto px-4 lg:px-8 pt-8">
        <div className="bg-white border border-[#E8E2D9] rounded-3xl p-6 md:p-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Frame */}
            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-[#FAF8F5] border border-[#EDE7DD]">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.imageAlt || product.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-[#888]">
                  No Image Available
                </div>
              )}

              {/* Badge if present */}
              {product.badge && (
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-medium text-[#1A1A1A] shadow-sm border border-[#EDE7DD]">
                  {product.badge}
                </div>
              )}
            </div>

            {/* Product Meta & Details */}
            <div className="flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Brand & Category */}
                <div className="flex items-center justify-between text-xs text-[#8C827A]">
                  <span className="uppercase tracking-wider font-semibold">{product.brand}</span>
                  <span className="capitalize">{product.category}</span>
                </div>

                {/* Title */}
                <h1 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] leading-tight">
                  {product.title}
                </h1>

                {/* Price Row */}
                <div className="flex items-baseline gap-3 pt-1">
                  <span className="font-serif text-2xl font-semibold text-[#1A1A1A]">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <span className="text-sm text-[#999] line-through">
                      ₹{product.originalPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                  {product.discount && (
                    <span className="text-xs font-semibold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
                      {product.discount}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs md:text-sm text-[#555] leading-relaxed pt-2">
                  {product.description}
                </p>

                {/* Sunidhi's Creator Note */}
                {product.creatorNote && (
                  <div className="bg-[#FAF8F5] border-l-2 border-[#A87B43] rounded-r-xl p-4 my-3">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#A87B43] mb-1">
                      Sunidhi&apos;s Take
                    </span>
                    <p className="text-xs text-[#333] italic leading-relaxed">
                      &ldquo;{product.creatorNote}&rdquo;
                    </p>
                  </div>
                )}

                {/* Internal Operator Note (Only visible in Preview!) */}
                {product.internalNote && (
                  <div className="bg-[#FFFBE6] border border-[#FFE58F] rounded-xl p-3.5 my-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#D46B08] mb-1">
                      Internal Operator Note (Private)
                    </span>
                    <p className="text-xs text-[#7D4A00]">
                      {product.internalNote}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t border-[#F0EBE1]">
                {/* Outbound Test Button */}
                <a
                  href={`/go/${product.slug}?preview=true`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#1A1A1A] text-white hover:bg-[#333] font-medium py-3.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Test Outbound Link (Redirects to Merchant)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <div className="flex items-center justify-between text-[11px] text-[#8C827A] pt-1">
                  <span>Merchant: <strong>{product.store}</strong></span>
                  <span>Slug: <code className="font-mono">{product.slug}</code></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
