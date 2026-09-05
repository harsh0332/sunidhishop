import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/config/site';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5 text-stone-500" />
          <span>404 • Page Not Found</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
            This pick isn&apos;t here anymore.
          </h1>
          <p className="text-sm text-neutral-500 leading-relaxed max-w-sm mx-auto">
            The page you are looking for might have been moved, retired, or never existed. Discover Sunidhi&apos;s latest active recommendations below.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 active:scale-[0.98] transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Picks</span>
          </Link>

          <Link
            href="/#picks"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-stone-200 text-neutral-800 text-sm font-medium hover:bg-stone-50 active:scale-[0.98] transition-all"
          >
            Browse Categories
          </Link>
        </div>

        <p className="text-xs text-neutral-400 pt-4 border-t border-stone-200/60">
          Curated by {SITE_CONFIG.creator.name} • {SITE_CONFIG.brandName}
        </p>
      </div>
    </div>
  );
}
