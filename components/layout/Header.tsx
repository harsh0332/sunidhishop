'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, Instagram, Menu, X } from 'lucide-react';
import { SearchModal } from '../common/SearchModal';
import { Product } from '@/types/product';

interface HeaderProps {
  products?: Product[];
}

export const Header: React.FC<HeaderProps> = ({ products = [] }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 w-full bg-[#FAF9F6]/95 backdrop-blur-md border-b border-stone-200/70 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Brand Wordmark */}
          <Link
            href="/"
            className="flex items-center gap-1.5 focus:outline-none"
            aria-label="SUNIDHI Home"
          >
            <span className="text-lg sm:text-xl font-bold tracking-[0.25em] uppercase text-neutral-950 font-sans">
              SUNIDHI
            </span>
            <span className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider hidden sm:inline-block">
              .shop
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest font-medium text-neutral-600">
            <Link
              href="/#picks"
              className="hover:text-neutral-950 transition-colors"
            >
              Shop Picks
            </Link>
            <Link
              href="/#picks"
              className="hover:text-neutral-950 transition-colors"
            >
              Categories
            </Link>
            <Link
              href="/#as-seen-on-sunidhi"
              className="hover:text-neutral-950 transition-colors"
            >
              As Seen On Me
            </Link>
            <Link
              href="/disclosure"
              className="hover:text-neutral-950 transition-colors"
            >
              Affiliate Disclosure
            </Link>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="p-2 rounded-full text-neutral-600 hover:text-neutral-900 hover:bg-stone-200/60 transition-colors"
              aria-label="Search picks"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Instagram Link (Desktop) */}
            <a
              href="https://instagram.com/sunidhi"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 p-2 rounded-full text-neutral-600 hover:text-neutral-900 hover:bg-stone-200/60 transition-colors"
              aria-label="Sunidhi on Instagram"
            >
              <Instagram className="w-4 h-4" />
            </a>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-full text-neutral-700 hover:bg-stone-200/60 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-b border-stone-200 bg-[#FAF9F6] px-5 py-4 space-y-3 animate-in slide-in-from-top duration-150">
            <Link
              href="/#picks"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-1"
            >
              Shop Latest Picks
            </Link>
            <Link
              href="/#as-seen-on-sunidhi"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-1"
            >
              As Seen On Sunidhi (Reels)
            </Link>
            <Link
              href="/disclosure"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-sm font-medium text-neutral-800 hover:text-neutral-950 py-1"
            >
              Affiliate Disclosure
            </Link>
            <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
              <a
                href="https://instagram.com/sunidhi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-950"
              >
                <Instagram className="w-4 h-4" />
                <span>Follow @sunidhi on Instagram</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Global Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        products={products}
      />
    </>
  );
};
