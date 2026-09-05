import React from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';

interface AffiliateDisclosureBannerProps {
  className?: string;
  variant?: 'inline' | 'compact';
}

export const AffiliateDisclosureBanner: React.FC<AffiliateDisclosureBannerProps> = ({
  className = '',
  variant = 'inline',
}) => {
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] text-neutral-500 py-2 ${className}`}>
        <Info className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
        <p>
          Affiliate disclosure: Sunidhi earns a small commission on qualifying purchases at no extra cost to you.{' '}
          <Link href="/disclosure" className="underline hover:text-neutral-800 transition-colors">
            Learn more
          </Link>
        </p>
      </div>
    );
  }

  return (
    <aside
      aria-label="Affiliate Disclosure Notice"
      className={`bg-stone-50/80 border border-stone-200/90 rounded-xl p-3 sm:p-4 my-6 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Info className="w-4 h-4 text-neutral-600 shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-600 leading-relaxed">
          <span className="font-semibold text-neutral-800">Creator Transparency: </span>
          Some links on Sunidhi.shop are affiliate links. When you shop through them, Sunidhi may earn a small commission from the merchant at no extra cost to you. Every single pick is personally selected and loved.{' '}
          <Link
            href="/disclosure"
            className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-600 transition-colors ml-1"
          >
            Read full disclosure →
          </Link>
        </div>
      </div>
    </aside>
  );
};
