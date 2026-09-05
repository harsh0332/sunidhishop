import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowLeft, Sparkles, ShoppingBag } from 'lucide-react';
import { productRepository } from '@/lib/data';
import { ProductCard } from '@/components/product/ProductCard';

export const metadata: Metadata = {
  title: 'Product Unavailable | SUNIDHI',
  description: 'The requested product is currently unavailable or out of stock.',
  robots: {
    index: false,
    follow: false,
  },
};

interface UnavailablePageProps {
  searchParams: {
    item?: string;
  };
}

export default async function ProductUnavailablePage({ searchParams }: UnavailablePageProps) {
  const featuredProducts = await productRepository.getFeaturedProducts(4);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
      {/* Icon */}
      <div className="w-14 h-14 rounded-full bg-stone-100 text-neutral-800 mx-auto flex items-center justify-center mb-4">
        <ShoppingBag className="w-6 h-6 text-neutral-600" />
      </div>

      {/* Message */}
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-950 mb-2">
        Sorry, this pick is currently unavailable
      </h1>
      <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto mb-6 leading-relaxed">
        This item may have sold out at the retailer or is currently being restyled. Sunidhi updates recommendations regularly.
      </p>

      {/* Return to Storefront CTA */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 text-white text-xs sm:text-sm font-medium hover:bg-neutral-800 transition-colors shadow-xs mb-14"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Sunidhi&apos;s Storefront</span>
      </Link>

      {/* Alternative Recommendations */}
      {featuredProducts.length > 0 && (
        <div className="border-t border-stone-200/80 pt-10 text-left">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-neutral-800" />
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900">
              Other Picks You Might Love
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
