'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { CategorySummary, LookbookItem, Product } from '@/types/product';
import { CreatorHero } from './CreatorHero';
import { CategoryNav } from './CategoryNav';
import { ProductGrid } from '../product/ProductGrid';
import { SeenOnSunidhi } from './SeenOnSunidhi';
import { RecentlyViewed } from '../product/RecentlyViewed';
import { analytics } from '@/lib/analytics';
import { MerchandisingContext } from '@/lib/contextual-merchandising';
import { Sparkles, ArrowRight } from 'lucide-react';

interface StorefrontViewProps {
  initialProducts: Product[];
  categories: CategorySummary[];
  lookbooks: LookbookItem[];
  merchandisingContext?: MerchandisingContext;
}

export const StorefrontView: React.FC<StorefrontViewProps> = ({
  initialProducts,
  categories,
  lookbooks,
  merchandisingContext,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(
    merchandisingContext?.targetCategory || 'all'
  );
  const [isTrendingOnly, setIsTrendingOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');

  useEffect(() => {
    if (merchandisingContext && merchandisingContext.type !== 'default') {
      analytics.trackContextualLanding({
        source: 'homepage_context',
        contentId: merchandisingContext.contentId,
        campaignId: merchandisingContext.campaignId,
        category: merchandisingContext.targetCategory,
        productSlug: merchandisingContext.highlightedProduct?.slug,
      });
    }
  }, [merchandisingContext]);

  // Filter and sort products reactively
  const displayedProducts = useMemo(() => {
    let list: Product[] = [];

    if (
      merchandisingContext &&
      merchandisingContext.type !== 'default' &&
      activeCategory === 'all' &&
      !isTrendingOnly
    ) {
      list = [...merchandisingContext.prioritizedProducts];
    } else {
      list = [...initialProducts];
    }

    // Filter by category
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category.toLowerCase() === activeCategory.toLowerCase());
    }

    // Filter by trending if active
    if (isTrendingOnly) {
      list = list.filter((p) => p.trending);
    }

    // Sorting
    switch (sortBy) {
      case 'newest':
        list.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        break;
      case 'price-low':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'trending':
        list.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0));
        break;
      case 'featured':
      default:
        list.sort((a, b) => a.displayOrder - b.displayOrder);
        break;
    }

    return list;
  }, [initialProducts, activeCategory, isTrendingOnly, sortBy, merchandisingContext]);

  const handleReset = () => {
    setActiveCategory('all');
    setIsTrendingOnly(false);
    setSortBy('featured');
  };

  const isContextActive =
    merchandisingContext &&
    merchandisingContext.type !== 'default' &&
    activeCategory === 'all' &&
    !isTrendingOnly;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* 1. Contextual Entry Banner (when coming from Reel, Campaign, or spotlight link) */}
      {isContextActive && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-neutral-950 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-stone-200 text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{merchandisingContext.badge}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white">
              {merchandisingContext.heading}
            </h1>
            {merchandisingContext.subheading && (
              <p className="text-xs sm:text-sm text-stone-300 max-w-xl">
                {merchandisingContext.subheading}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="self-start sm:self-center text-xs text-stone-400 hover:text-white underline transition-colors shrink-0"
          >
            Show All Picks
          </button>
        </div>
      )}

      {/* 2. Creator Hero Section (Standard storefront hero) */}
      {!isContextActive && <CreatorHero />}

      {/* 3. Category Discovery Pills (Sticky Navigation) */}
      <CategoryNav
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={(slug) => {
          setActiveCategory(slug);
          analytics.trackCategoryView(slug, displayedProducts.length);
        }}
        isTrendingActive={isTrendingOnly}
        onToggleTrending={() => {
          const next = !isTrendingOnly;
          setIsTrendingOnly(next);
          analytics.trackEvent('filter_usage', {
            filterName: 'trending',
            filterValue: String(next),
          });
        }}
      />

      {/* 5. Main Product Grid */}
      <ProductGrid
        products={displayedProducts}
        title={
          isTrendingOnly
            ? 'Trending Right Now'
            : isContextActive
            ? merchandisingContext.heading
            : activeCategory === 'all'
            ? 'Latest Picks'
            : `${categories.find((c) => c.slug === activeCategory)?.name || 'Curated'} Picks`
        }
        subtitle={
          isContextActive
            ? (merchandisingContext.subheading || 'Shop the look from this link.')
            : 'Seen on Sunidhi. Worth a look.'
        }
        sortBy={sortBy}
        onSortChange={setSortBy}
        onResetFilters={handleReset}
        contentId={isContextActive ? merchandisingContext.contentId : undefined}
        campaignId={isContextActive ? merchandisingContext.campaignId : undefined}
      />

      {/* 6. Other Latest Picks (when context was active and remaining products exist) */}
      {isContextActive && merchandisingContext.remainingProducts.length > 0 && (
        <div className="mt-12 pt-8 border-t border-stone-200/80">
          <ProductGrid
            products={merchandisingContext.remainingProducts}
            title="More Curated Picks"
            subtitle="Explore other pieces recommended by Sunidhi."
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>
      )}

      {/* 7. As Seen On Sunidhi (Reels / Social Integration) */}
      <div id="as-seen-on-sunidhi">
        <SeenOnSunidhi lookbooks={lookbooks} />
      </div>

      {/* 8. Recently Viewed Section (Local storage, self-hiding when empty) */}
      <RecentlyViewed />
    </div>
  );
};
