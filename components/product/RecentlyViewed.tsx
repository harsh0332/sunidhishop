'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { History } from 'lucide-react';
import { getRecentlyViewed, RecentlyViewedItem } from '@/lib/recently-viewed';
import { PriceDisplay } from './PriceDisplay';

export const RecentlyViewed: React.FC = () => {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setItems(getRecentlyViewed());
  }, []);

  if (!isMounted || items.length === 0) {
    return null; // Self-hiding when nothing viewed
  }

  return (
    <section className="w-full pt-10 sm:pt-14 mt-10 border-t border-stone-200/80">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-stone-100 text-neutral-700">
          <History className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900">
          Recently Viewed
        </h2>
        <span className="text-xs text-neutral-400">
          ({items.length})
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/product/${item.slug}`}
            className="group flex flex-col bg-white rounded-xl overflow-hidden border border-stone-200/80 hover:border-stone-400/80 transition-all p-2.5 sm:p-3"
          >
            <div className="relative aspect-square w-full rounded-lg bg-stone-100 overflow-hidden mb-2">
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 45vw, 20vw"
                className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              {item.brand && (
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium truncate">
                  {item.brand}
                </span>
              )}
              <h3 className="text-xs font-medium text-neutral-900 line-clamp-1 group-hover:text-neutral-600 transition-colors">
                {item.title}
              </h3>
              <div className="mt-1 pt-1 border-t border-stone-100">
                <PriceDisplay price={item.price} currency={item.currency} size="sm" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
