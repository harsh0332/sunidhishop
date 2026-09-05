'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, AlertTriangle } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/config/site';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log sanitized error
    // eslint-disable-next-line no-console
    console.error('[Sunidhi Client Error Boundary Caught]:', error.message);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
          <span>Temporary Issue</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
            Something went momentarily wrong
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-sm mx-auto leading-relaxed">
            We experienced a brief hiccup while loading this content. Please try reloading or head back to discover Sunidhi&apos;s recommendations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-xl bg-white border border-stone-200 text-neutral-800 text-sm font-medium hover:bg-stone-50 active:scale-[0.98] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Picks</span>
          </Link>
        </div>

        <p className="text-xs text-neutral-400 pt-4 border-t border-stone-200/60">
          {SITE_CONFIG.brandName} • Curated by {SITE_CONFIG.creator.name}
        </p>
      </div>
    </div>
  );
}
