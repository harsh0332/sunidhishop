'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Instagram, Play } from 'lucide-react';
import { LookbookItem } from '@/types/product';
import { formatPrice } from '@/lib/utils';
import { analytics } from '@/lib/analytics';
import { getProductOutboundUrl } from '@/lib/outbound';

interface SeenOnSunidhiProps {
  lookbooks: LookbookItem[];
}

export const SeenOnSunidhi: React.FC<SeenOnSunidhiProps> = ({ lookbooks }) => {
  if (!lookbooks || lookbooks.length === 0) return null;

  return (
    <section className="my-10 sm:my-14 pt-8 border-t border-stone-200/80">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 text-[11px] font-semibold mb-1.5">
            <Instagram className="w-3 h-3" />
            <span>From Instagram & Reels</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
            As Seen On Sunidhi
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Shop the exact pieces styled in recent videos and stories.
          </p>
        </div>

        <a
          href="https://instagram.com/sunidhi_singh029"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-neutral-700 hover:text-neutral-900 underline underline-offset-4 mt-2 sm:mt-0 inline-flex items-center gap-1"
        >
          <span>Watch all on @sunidhi_singh029</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {lookbooks.map((look) => (
          <div
            key={look.id}
            className="flex flex-col bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs hover:border-stone-400 transition-all duration-200"
          >
            {/* Reel / Social Thumbnail */}
            <div className="relative aspect-[4/5] sm:aspect-[3/4] w-full bg-stone-100 overflow-hidden group">
              <Image
                src={look.thumbnailUrl}
                alt={look.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

              {/* Video Indicator */}
              <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-medium tracking-wide">
                <Play className="w-2.5 h-2.5 fill-white" />
                <span>Reel Edit</span>
              </div>

              {/* Title & Creator Note on Thumbnail */}
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <h3 className="text-sm font-semibold tracking-tight line-clamp-1 mb-1">
                  {look.title}
                </h3>
                <p className="text-xs text-white/80 line-clamp-2 leading-relaxed italic">
                  &ldquo;{look.creatorNote}&rdquo;
                </p>
              </div>
            </div>

            {/* Tagged Products in this Look */}
            <div className="p-3 sm:p-4 bg-white flex flex-col gap-2.5 flex-grow">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Tagged In This Look ({look.taggedProducts.length})
              </span>

              <div className="space-y-2">
                {look.taggedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-50 border border-stone-200/60 hover:bg-stone-100/70 transition-colors"
                  >
                    <Link
                      href={`/product/${product.slug}`}
                      className="relative w-12 h-14 rounded-lg overflow-hidden shrink-0 bg-stone-200"
                    >
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </Link>

                    <div className="flex flex-col min-w-0 flex-grow">
                      <span className="text-[10px] uppercase font-semibold text-neutral-500 truncate">
                        {product.brand}
                      </span>
                      <Link
                        href={`/product/${product.slug}`}
                        className="text-xs font-medium text-neutral-900 truncate hover:underline"
                      >
                        {product.title}
                      </Link>
                      <span className="text-xs font-semibold text-neutral-800">
                        {formatPrice(product.price, product.currency)}
                      </span>
                    </div>

                    <a
                      href={getProductOutboundUrl(product)}
                      target="_blank"
                      rel="noopener noreferrer sponsored nofollow"
                      onClick={() => analytics.trackAffiliateClick(product, 'seen_on_sunidhi_look')}
                      className="shrink-0 p-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors text-xs flex items-center justify-center"
                      title={`Shop at ${product.store}`}
                      aria-label={`Shop ${product.title} at ${product.store}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
