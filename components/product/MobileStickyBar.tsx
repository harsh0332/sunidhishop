'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { Product } from '@/types/product';
import { getProductOutboundUrl } from '@/lib/outbound';
import { analytics } from '@/lib/analytics';
import { PriceDisplay } from './PriceDisplay';
import { recordRecentlyViewed } from '@/lib/recently-viewed';

interface MobileStickyBarProps {
  product: Product;
  contentId?: string;
  campaignId?: string;
}

export const MobileStickyBar: React.FC<MobileStickyBarProps> = ({
  product,
  contentId,
  campaignId,
}) => {
  // Track product view and store in local recently viewed on detail page mount
  useEffect(() => {
    analytics.trackProductView(product);
    recordRecentlyViewed(product);
  }, [product]);

  const handleCtaClick = () => {
    analytics.trackAffiliateClick(product, 'mobile_sticky_bar');
  };

  const ctaLabel = product.ctaText || (product.store ? `Shop at ${product.store}` : 'Shop Now');
  const outboundUrl = getProductOutboundUrl(product, { contentId, campaignId });

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 px-4 py-2.5 shadow-lg pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] animate-in fade-in slide-in-from-bottom duration-200">
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        {/* Product Quick Info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative w-10 h-12 rounded-md overflow-hidden bg-stone-100 shrink-0 border border-stone-200/60">
            <Image
              src={product.image}
              alt={product.imageAlt || product.title}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-neutral-900 truncate">
              {product.title}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <PriceDisplay
                price={product.price}
                originalPrice={product.originalPrice}
                currency={product.currency}
                discount={product.discount}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <a
          href={outboundUrl}
          target="_blank"
          rel="noopener noreferrer sponsored nofollow"
          onClick={handleCtaClick}
          className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 active:scale-95 transition-all shadow-sm"
          aria-label={`${ctaLabel} (opens merchant website)`}
        >
          <span>{ctaLabel}</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </a>
      </div>
    </div>
  );
};
