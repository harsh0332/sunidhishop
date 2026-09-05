'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Product } from '@/types/product';
import { PriceDisplay } from './PriceDisplay';
import { analytics } from '@/lib/analytics';
import { getProductOutboundUrl } from '@/lib/outbound';
import { SITE_CONFIG } from '@/lib/config/site';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  contentId?: string;
  campaignId?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  priority = false,
  contentId,
  campaignId,
}) => {
  const cardRef = useRef<HTMLElement>(null);
  const [imgSrc, setImgSrc] = useState(product.image || SITE_CONFIG.defaultOgImage);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            analytics.trackProductImpression(product);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [product]);

  const handleOutboundClick = (e: React.MouseEvent) => {
    // Prevent navigating to internal product page when clicking direct outbound CTA
    e.stopPropagation();
    analytics.trackAffiliateClick(product, 'card_cta');
  };

  const handleProductLinkClick = () => {
    if (contentId) {
      analytics.trackContentProductClick(contentId, product);
    }
  };

  const getBadgeClass = (badge: string) => {
    if (badge === 'Seen on Sunidhi') {
      return 'bg-neutral-900 text-white border-neutral-900';
    }
    if (badge === 'Trending') {
      return 'bg-amber-100 text-amber-900 border-amber-200';
    }
    if (badge === 'Curator Pick' || badge === 'Sunidhi Favorite') {
      return 'bg-rose-50 text-rose-900 border-rose-200';
    }
    return 'bg-stone-100 text-stone-800 border-stone-200';
  };

  const ctaLabel = product.ctaText || (product.store ? `Shop at ${product.store}` : 'Shop Now');

  const productHrefParams = new URLSearchParams();
  if (contentId) productHrefParams.set('contentId', contentId);
  if (campaignId) productHrefParams.set('campaignId', campaignId);
  const productQuery = productHrefParams.toString();
  const productHref = productQuery ? `/product/${product.slug}?${productQuery}` : `/product/${product.slug}`;

  const outboundUrl = getProductOutboundUrl(product, { contentId, campaignId });

  return (
    <article
      ref={cardRef}
      className="group flex flex-col h-full bg-white rounded-xl overflow-hidden border border-stone-200/80 hover:border-stone-400/80 hover:shadow-soft transition-all duration-200"
    >
      {/* Product Image & Badges */}
      <Link
        href={productHref}
        onClick={handleProductLinkClick}
        className="relative block w-full aspect-[4/5] bg-stone-100 overflow-hidden"
      >
        <Image
          src={imgSrc}
          alt={product.imageAlt || product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
          className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          onError={() => {
            if (!hasError) {
              setHasError(true);
              setImgSrc(SITE_CONFIG.defaultOgImage);
            }
          }}
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {product.badge && (
            <span
              className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border shadow-sm backdrop-blur-sm ${getBadgeClass(
                product.badge
              )}`}
            >
              {product.badge}
            </span>
          )}
          {product.new && !product.badge && (
            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-900 text-white">
              New
            </span>
          )}
        </div>

        {/* Store pill top-right */}
        {product.store && (
          <div className="absolute top-2 right-2 z-10">
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 bg-white/90 backdrop-blur-sm text-neutral-700 rounded-md border border-stone-200/60 shadow-xs">
              {product.store}
            </span>
          </div>
        )}
      </Link>

      {/* Card Body */}
      <div className="flex flex-col flex-grow p-3 sm:p-4">
        {/* Brand */}
        {product.brand && (
          <p className="text-[11px] uppercase tracking-wider font-semibold text-neutral-500 mb-1">
            {product.brand}
          </p>
        )}

        {/* Title */}
        <Link
          href={productHref}
          onClick={handleProductLinkClick}
          className="group-hover:text-neutral-600 transition-colors"
        >
          <h3 className="text-xs sm:text-sm font-medium text-neutral-900 line-clamp-2 leading-snug mb-2">
            {product.title}
          </h3>
        </Link>

        {/* Price Information */}
        <div className="mt-auto pt-1 mb-3">
          <PriceDisplay
            price={product.price}
            originalPrice={product.originalPrice}
            currency={product.currency}
            discount={product.discount}
            size="sm"
          />
        </div>

        {/* Outbound CTA: Goes straight to merchant */}
        <a
          href={outboundUrl}
          target="_blank"
          rel="noopener noreferrer sponsored nofollow"
          onClick={handleOutboundClick}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs sm:text-sm font-medium rounded-lg bg-stone-900 text-white hover:bg-neutral-800 active:scale-[0.98] transition-all duration-150 group/btn"
          aria-label={`${ctaLabel} (opens merchant website in new window)`}
        >
          <span className="truncate">{ctaLabel}</span>
          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
        </a>
      </div>
    </article>
  );
};
