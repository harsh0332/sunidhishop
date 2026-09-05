'use client';

import React from 'react';
import { CategorySummary } from '@/types/product';
import { Sparkles } from 'lucide-react';

interface CategoryNavProps {
  categories: CategorySummary[];
  activeCategory: string;
  onSelectCategory: (categorySlug: string) => void;
  showTrendingPill?: boolean;
  isTrendingActive?: boolean;
  onToggleTrending?: () => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  showTrendingPill = true,
  isTrendingActive = false,
  onToggleTrending,
}) => {
  return (
    <div className="sticky top-14 z-20 py-2.5 bg-[#FAF9F6]/90 backdrop-blur-md border-y border-stone-200/60 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 transition-all">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {/* All / Standard Categories */}
        {categories.map((cat) => {
          const isActive = activeCategory === cat.slug && !isTrendingActive;
          return (
            <button
              key={cat.id}
              onClick={() => {
                if (isTrendingActive && onToggleTrending) {
                  onToggleTrending();
                }
                onSelectCategory(cat.slug);
              }}
              className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white text-neutral-700 border border-stone-200 hover:border-stone-400 hover:text-neutral-900'
              }`}
            >
              {cat.name}
              {cat.count > 0 && (
                <span
                  className={`ml-1.5 text-[10px] ${
                    isActive ? 'text-neutral-300' : 'text-neutral-400'
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Trending Filter Pill */}
        {showTrendingPill && onToggleTrending && (
          <button
            onClick={onToggleTrending}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 flex items-center gap-1 ${
              isTrendingActive
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50/70 text-amber-900 border border-amber-200/80 hover:bg-amber-100/60'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Trending Now</span>
          </button>
        )}
      </div>
    </div>
  );
};
