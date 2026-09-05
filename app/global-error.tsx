'use client';

import React from 'react';
import { SITE_CONFIG } from '@/lib/config/site';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAF9F6] text-neutral-900 font-sans flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-xl font-bold tracking-[0.25em] uppercase text-neutral-950">
            {SITE_CONFIG.name}
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
              We&apos;ll be right back
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-sm mx-auto">
              Our storefront experienced an unexpected loading error. Please refresh or try again in a few moments.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-all shadow-sm"
            >
              Refresh Storefront
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
