'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowDown, Instagram, Sparkles } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

export const CreatorHero: React.FC = () => {
  useEffect(() => {
    trackEvent('page_view', { source: 'homepage' });
  }, []);

  const scrollToPicks = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById('picks');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden pt-2 pb-4 sm:pt-6 sm:pb-6">
      {/* Background ambient subtle glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-stone-100/70 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-xl mx-auto text-center px-4">
        {/* Creator Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100/90 border border-stone-200/80 mb-2 sm:mb-3 shadow-xs">
          <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold">
            S
          </div>
          <span className="text-[11px] font-medium tracking-wide uppercase text-neutral-700">
            Curated by Sunidhi
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Hero Headline */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900 leading-tight">
          Things I’m Loving Right Now
        </h1>

        {/* Supporting Microcopy */}
        <p className="mt-2 text-xs sm:text-sm md:text-base text-neutral-600 leading-relaxed max-w-md mx-auto">
          Fashion, beauty & lifestyle finds curated by Sunidhi.
        </p>

        {/* Actions */}
        <div className="mt-4 sm:mt-5 flex items-center justify-center gap-3">
          <a
            href="#picks"
            onClick={scrollToPicks}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 text-white text-xs sm:text-sm font-medium hover:bg-neutral-800 active:scale-95 transition-all shadow-sm"
          >
            <span>Shop My Picks</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </a>

          <a
            href="https://instagram.com/sunidhi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-stone-200 text-neutral-700 text-xs sm:text-sm font-medium hover:bg-stone-50 hover:text-neutral-900 transition-all shadow-xs"
          >
            <Instagram className="w-3.5 h-3.5 text-neutral-500" />
            <span>@sunidhi</span>
          </a>
        </div>
      </div>
    </section>
  );
};
