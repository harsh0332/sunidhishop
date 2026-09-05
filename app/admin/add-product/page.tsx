'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Link2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Plus,
  ExternalLink,
  Tag,
  DollarSign,
  Image as ImageIcon,
  Building2,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { ProductCategory } from '@/types/product';

interface FormState {
  title: string;
  brand: string;
  store: string;
  category: ProductCategory;
  subcategory: string;
  price: string;
  originalPrice: string;
  image: string;
  affiliateUrl: string;
  description: string;
  creatorNote: string;
  badge: string;
}

const CATEGORIES: { label: string; value: ProductCategory }[] = [
  { label: 'Fashion & Outfits', value: 'fashion' },
  { label: 'Beauty & Skincare', value: 'beauty' },
  { label: 'Bags & Accessories', value: 'accessories' },
  { label: 'Shoes & Footwear', value: 'footwear' },
  { label: 'Home & Lifestyle', value: 'lifestyle' },
];

export default function QuickAddProductPage() {
  const [inputUrl, setInputUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<{ slug: string; title: string } | null>(null);

  const [form, setForm] = useState<FormState>({
    title: '',
    brand: '',
    store: '',
    category: 'fashion',
    subcategory: '',
    price: '',
    originalPrice: '',
    image: '',
    affiliateUrl: '',
    description: '',
    creatorNote: '',
    badge: 'Curator Pick',
  });

  const [hasExtracted, setHasExtracted] = useState(false);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setIsExtracting(true);
    setExtractError(null);
    setPublishSuccess(null);

    try {
      const res = await fetch('/api/admin/products/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Extraction failed');
      }

      const d = json.data;
      setForm({
        title: d.title || '',
        brand: d.brand || '',
        store: d.store || 'Online Retailer',
        category: d.category || 'fashion',
        subcategory: d.subcategory || '',
        price: d.price ? String(d.price) : '',
        originalPrice: d.originalPrice ? String(d.originalPrice) : '',
        image: d.image || '',
        affiliateUrl: d.affiliateUrl || inputUrl.trim(),
        description: d.description || `Curated pick styled by Sunidhi.`,
        creatorNote: '',
        badge: 'Curator Pick',
      });

      setHasExtracted(true);
    } catch (err: any) {
      setExtractError(err.message || 'Could not auto-fetch. You can still fill details below.');
      // Fill affiliate link at least
      setForm((prev) => ({ ...prev, affiliateUrl: inputUrl.trim() }));
      setHasExtracted(true);
    } finally {
      setIsExtracting(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.affiliateUrl.trim()) {
      alert('Please provide Title and Affiliate Link.');
      return;
    }

    setIsPublishing(true);
    try {
      const res = await fetch('/api/admin/products/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: Number(form.price) || 0,
          originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to publish');

      setPublishSuccess({ slug: json.product.slug, title: json.product.title });
    } catch (err: any) {
      alert(err.message || 'Publishing failed. Please retry.');
    } finally {
      setIsPublishing(false);
    }
  };

  const resetForNext = () => {
    setInputUrl('');
    setHasExtracted(false);
    setPublishSuccess(null);
    setExtractError(null);
    setForm({
      title: '',
      brand: '',
      store: '',
      category: 'fashion',
      subcategory: '',
      price: '',
      originalPrice: '',
      image: '',
      affiliateUrl: '',
      description: '',
      creatorNote: '',
      badge: 'Curator Pick',
    });
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20">
      {/* Top Header */}
      <header className="border-b border-stone-200/80 bg-white sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/analytics"
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span className="text-stone-300">/</span>
            <h1 className="text-sm font-semibold tracking-tight text-neutral-950 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Quick Add Product via Link</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/system"
              className="text-xs font-medium text-neutral-600 hover:text-neutral-950 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-white"
            >
              System
            </Link>
            <Link
              href="/"
              target="_blank"
              className="text-xs font-medium text-neutral-900 hover:underline flex items-center gap-1"
            >
              <span>Live Store</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        {/* Banner */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-6 mb-8 shadow-xs">
          <h2 className="text-lg font-bold tracking-tight text-neutral-950">
            Paste Any Shopping / Affiliate Link
          </h2>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Sirf product ya affiliate link daaliye (Myntra, Zara, Amazon, Nykaa, Ajio, etc.). System photo, title, price aur store automatically fetch karke product ko website par live kar dega!
          </p>

          {/* Paste URL Form */}
          <form onSubmit={handleExtract} className="mt-5 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                required
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://myntr.it/... ya koi bhi shopping link paste karein"
                className="w-full bg-[#FAF8F5] border border-stone-200 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isExtracting || !inputUrl.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-neutral-950 text-white text-xs sm:text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 active:scale-98 shadow-sm"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                  <span>Fetching Details...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Auto-Fetch Product</span>
                </>
              )}
            </button>
          </form>

          {extractError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{extractError}</span>
            </div>
          )}
        </div>

        {/* Success Banner */}
        {publishSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8 text-center animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-emerald-950">
              🎉 Product is LIVE on Sunidhi.shop!
            </h3>
            <p className="text-xs text-emerald-800 mt-1">
              &ldquo;{publishSuccess.title}&rdquo; is now visible to all visitors.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                href={`/product/${publishSuccess.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-xs"
              >
                <span>View on Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={resetForNext}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-900 text-xs font-semibold hover:bg-emerald-100/50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Product</span>
              </button>
            </div>
          </div>
        )}

        {/* Auto-Extracted Preview & Publishing Form */}
        {hasExtracted && !publishSuccess && (
          <form onSubmit={handlePublish} className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-neutral-950 flex items-center gap-2">
                  <span>Product Preview & Details</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-neutral-600">
                    Auto-Filled
                  </span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Sabhi details auto-fill ho chuki hain. Agar koi change karna ho toh edit kar sakte hain, warna direct Publish karein.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Product Photo Preview Column */}
              <div className="md:col-span-1 space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                  Product Image
                </label>
                <div className="w-full aspect-[3/4] rounded-xl bg-stone-100 border border-stone-200 overflow-hidden relative flex items-center justify-center">
                  {form.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.image}
                      alt={form.title || 'Product Preview'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4 text-neutral-400">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <span className="text-xs">Paste Image URL below</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                    Image Link (HTTPS)
                  </label>
                  <input
                    type="url"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    placeholder="https://..."
                    className="w-full text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg p-2.5 text-neutral-800 font-mono"
                  />
                </div>
              </div>

              {/* Editable Fields Column */}
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full text-sm bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 text-neutral-900 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                      Selling Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="1720"
                      className="w-full text-sm bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 text-neutral-900 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                      Original MRP (₹) (Optional)
                    </label>
                    <input
                      type="number"
                      value={form.originalPrice}
                      onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
                      placeholder="4999"
                      className="w-full text-sm bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 text-neutral-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      className="w-full text-xs sm:text-sm bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 text-neutral-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                      Store (Retailer)
                    </label>
                    <input
                      type="text"
                      value={form.store}
                      onChange={(e) => setForm({ ...form, store: e.target.value })}
                      className="w-full text-xs sm:text-sm bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 text-neutral-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                      Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
                      className="w-full text-xs sm:text-sm bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 text-neutral-900"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                      Card Badge
                    </label>
                    <input
                      type="text"
                      value={form.badge}
                      onChange={(e) => setForm({ ...form, badge: e.target.value })}
                      placeholder="Seen on Sunidhi / Trending / Curator Pick"
                      className="w-full text-xs sm:text-sm bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 text-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Affiliate Redirect Link *
                  </label>
                  <input
                    type="url"
                    required
                    value={form.affiliateUrl}
                    onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })}
                    className="w-full text-xs bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 text-neutral-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Sunidhi&apos;s Styling Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.creatorNote}
                    onChange={(e) => setForm({ ...form, creatorNote: e.target.value })}
                    placeholder="e.g. Wore this in my recent Reel! Fabric feels ultra luxurious."
                    className="w-full text-xs sm:text-sm bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 text-neutral-900"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-stone-200/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetForNext}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-medium text-neutral-600 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPublishing}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-neutral-950 text-white text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-all active:scale-98 shadow-sm"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <span>🚀 Make Product Live on Website</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
