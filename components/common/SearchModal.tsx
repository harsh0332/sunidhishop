'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, X, ExternalLink, ArrowRight } from 'lucide-react';
import { Product } from '@/types/product';
import { formatPrice } from '@/lib/utils';
import { analytics } from '@/lib/analytics';
import { getProductOutboundUrl } from '@/lib/outbound';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredProducts = query.trim()
    ? products.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.brand.toLowerCase().includes(query.toLowerCase()) ||
          p.store.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase()) ||
          p.tags?.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      analytics.trackSearch(query.trim(), filteredProducts.length);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-elevated border border-stone-200 overflow-hidden mt-6 sm:mt-12 flex flex-col max-h-[85vh] cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-200 bg-stone-50/50"
        >
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search picks by item, brand, or store (e.g. Zara, blazer, linen)..."
            className="w-full bg-transparent text-sm sm:text-base text-neutral-900 placeholder-neutral-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-800 px-2 py-1 rounded-md bg-stone-200/60"
          >
            Esc
          </button>
        </form>

        {/* Search Results Area */}
        <div className="p-4 overflow-y-auto flex-grow space-y-3">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-neutral-400 text-xs sm:text-sm">
              <p className="font-medium text-neutral-600 mb-1">Popular searches</p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                {['Zara', 'Linen Blazer', 'Slip Dress', 'Lip Glow', 'Rhode', 'Mango'].map(
                  (tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setQuery(tag)}
                      className="px-2.5 py-1 rounded-full bg-stone-100 text-neutral-700 text-xs hover:bg-stone-200 transition-colors"
                    >
                      {tag}
                    </button>
                  )
                )}
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-8 text-center text-neutral-500 text-sm">
              <p className="mb-2">No picks found matching &ldquo;{query}&rdquo;.</p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-neutral-800 underline font-medium hover:text-neutral-950"
              >
                Clear search and view popular picks
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
                {filteredProducts.length} Results
              </p>
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-200"
                >
                  <Link
                    href={`/product/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0 flex-grow"
                  >
                    <div className="relative w-12 h-14 rounded-lg overflow-hidden shrink-0 bg-stone-100">
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-grow">
                      <span className="text-[10px] font-bold uppercase text-neutral-400">
                        {product.brand} • {product.store}
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-neutral-900 truncate">
                        {product.title}
                      </p>
                      <p className="text-xs font-semibold text-neutral-800">
                        {formatPrice(product.price, product.currency)}
                      </p>
                    </div>
                  </Link>

                  <a
                    href={getProductOutboundUrl(product)}
                    target="_blank"
                    rel="noopener noreferrer sponsored nofollow"
                    onClick={() => {
                      analytics.trackAffiliateClick(product, 'search_result_cta');
                      onClose();
                    }}
                    className="ml-2 shrink-0 p-2 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors flex items-center gap-1"
                    title={`Shop at ${product.store}`}
                  >
                    <span>Shop</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
