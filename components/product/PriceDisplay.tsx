import React from 'react';
import { calculateDiscountPercentage, formatPrice } from '@/lib/utils';

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  discount?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  currency = 'INR',
  discount,
  size = 'md',
  className = '',
}) => {
  const calculatedDiscount = discount || calculateDiscountPercentage(price, originalPrice);

  const priceStyles = {
    sm: 'text-sm font-semibold text-neutral-900',
    md: 'text-base font-semibold text-neutral-900',
    lg: 'text-2xl font-bold text-neutral-900 tracking-tight',
  };

  const originalPriceStyles = {
    sm: 'text-xs text-neutral-400 line-through',
    md: 'text-xs md:text-sm text-neutral-400 line-through',
    lg: 'text-base text-neutral-400 line-through',
  };

  const badgeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 font-medium bg-emerald-50 text-emerald-700 rounded',
    md: 'text-xs px-1.5 py-0.5 font-medium bg-emerald-50 text-emerald-700 rounded',
    lg: 'text-xs px-2 py-1 font-semibold bg-emerald-50 text-emerald-800 rounded-md',
  };

  return (
    <div className={`flex flex-wrap items-baseline gap-1.5 ${className}`}>
      <span className={priceStyles[size]}>
        {formatPrice(price, currency)}
      </span>

      {originalPrice && originalPrice > price && (
        <span className={originalPriceStyles[size]}>
          {formatPrice(originalPrice, currency)}
        </span>
      )}

      {calculatedDiscount && (
        <span className={badgeStyles[size]}>
          {calculatedDiscount}
        </span>
      )}
    </div>
  );
};
