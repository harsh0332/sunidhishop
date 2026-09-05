'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Product } from '@/types/product';
import { getProductOutboundUrl } from '@/lib/outbound';
import { analytics } from '@/lib/analytics';

interface ProductOutboundCTAProps {
  product: Product;
  contentId?: string;
  campaignId?: string;
}

export const ProductOutboundCTA: React.FC<ProductOutboundCTAProps> = ({
  product,
  contentId,
  campaignId,
}) => {
  const handleCtaClick = () => {
    analytics.trackAffiliateClick(product, 'product_main_cta');
  };

  const ctaLabel = product.ctaText || (product.store ? `Shop at ${product.store}` : 'Shop Now');
  const outboundUrl = getProductOutboundUrl(product, { contentId, campaignId });

  return (
    <div className="space-y-2.5">
      <a
        href={outboundUrl}
        target="_blank"
        rel="noopener noreferrer sponsored nofollow"
        onClick={handleCtaClick}
        className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-neutral-950 text-white text-sm sm:text-base font-medium hover:bg-neutral-800 active:scale-[0.98] transition-all duration-150 shadow-sm group"
        aria-label={`${ctaLabel} (opens merchant checkout in a new window)`}
      >
        <span>{ctaLabel}</span>
        <ExternalLink className="w-4 h-4 opacity-75 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </a>

      {/* Merchant Destination Explainer */}
      <p className="text-[11px] text-center text-neutral-400">
        You will be directed to {product.store ? `${product.store}'s official store` : 'the merchant website'} to complete your purchase.
      </p>
    </div>
  );
};
