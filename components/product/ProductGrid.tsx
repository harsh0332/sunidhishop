'use client';

import React from 'react';
import { Product } from '@/types/product';
import { ProductCard } from './ProductCard';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
import { analytics } from '@/lib/analytics';

interface ProductGridProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  sortBy?: string;
  onSortChange?: (value: string) => void;
  onResetFilters?: () => void;
  isLoading?: boolean;
  contentId?: string;
  campaignId?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  title = 'Latest Picks',
  subtitle = 'Seen on Sunidhi. Worth a look.',
  sortBy = 'featured',
  onSortChange,
  onResetFilters,
  isLoading = false,
  contentId,
  campaignId,
}) => {
  return (
    <section id="picks" className="w-full">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-6 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">
              {title}
            </h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {onSortChange && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs text-neutral-600">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
            <label htmlFor="sort-by" className="sr-only">Sort by</label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => {
                if (onSortChange) onSortChange(e.target.value);
                analytics.trackEvent('filter_usage', {
                  filterName: 'sort_by',
                  filterValue: e.target.value,
                });
              }}
              className="bg-transparent border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer"
            >
              <option value="featured">Featured Picks</option>
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="trending">Trending Now</option>
            </select>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse bg-stone-100 rounded-xl aspect-[4/5] w-full" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && products.length === 0 && (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-stone-200/80 my-4">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-neutral-700 mx-auto flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-neutral-500" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-neutral-900 mb-1">
            {onResetFilters ? 'No matching picks found' : 'New picks are coming soon'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto mb-4 leading-relaxed">
            {onResetFilters
              ? 'Try adjusting your category or search filters to explore Sunidhi’s recommendations.'
              : 'Sunidhi is currently curating fresh pieces. Check back soon or discover styling inspiration on Instagram.'}
          </p>
          {onResetFilters ? (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            >
              Show All Picks
            </button>
          ) : (
            <a
              href="https://instagram.com/sunidhi_singh029"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            >
              Follow on Instagram
            </a>
          )}
        </div>
      )}

      {/* 2-Column Mobile Grid / 3-4 Column Desktop Grid */}
      {!isLoading && products.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {products.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={idx < 4}
              contentId={contentId}
              campaignId={campaignId}
            />
          ))}
        </div>
      )}
    </section>
  );
};
