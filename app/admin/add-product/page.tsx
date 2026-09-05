'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Trash2,
  Edit3,
  Search,
  Save,
  X,
  ArrowLeft,
  ShoppingBag,
  Image as ImageIcon,
  Upload,
  Camera,
  ClipboardPaste,
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

interface ManagedProduct {
  id: string;
  slug: string;
  title: string;
  brand: string;
  store: string;
  price: number;
  originalPrice?: number;
  image: string;
  affiliateUrl: string;
  category: string;
  status: string;
  isCustom: boolean;
}

const CATEGORIES: { label: string; value: ProductCategory }[] = [
  { label: 'Fashion & Outfits', value: 'fashion' },
  { label: 'Beauty & Skincare', value: 'beauty' },
  { label: 'Bags & Accessories', value: 'accessories' },
  { label: 'Shoes & Footwear', value: 'footwear' },
  { label: 'Home & Lifestyle', value: 'lifestyle' },
];

export default function QuickAddProductPage() {
  const [activeTab, setActiveTab] = useState<'add' | 'manage'>('add');
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

  // Image Upload & Paste States
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const editFileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageUploadMsg, setImageUploadMsg] = useState<string | null>(null);

  // Manage Tab States
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<ManagedProduct | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editImage, setEditImage] = useState('');
  const [isUploadingEditImage, setIsUploadingEditImage] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sheetNotice, setSheetNotice] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch('/api/admin/products/manage');
      if (res.ok) {
        const json = await res.json();
        setProducts(json.products || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
      loadProducts();
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

  const uploadImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WEBP).');
      return;
    }
    setIsUploadingImage(true);
    setImageUploadMsg('Uploading photo...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setForm((prev) => ({ ...prev, image: data.url }));
      setImageUploadMsg('Photo uploaded successfully! ✅');
      setTimeout(() => setImageUploadMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Image upload failed. Please try again.');
      setImageUploadMsg(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const uploadEditImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WEBP).');
      return;
    }
    setIsUploadingEditImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setEditImage(data.url);
    } catch (err: any) {
      alert(err.message || 'Image upload failed. Please try again.');
    } finally {
      setIsUploadingEditImage(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const file = new File([blob], `clipboard_${Date.now()}.png`, { type });
              await uploadImageFile(file);
              return;
            }
          }
        }
      }
      alert('Clipboard mein image nahi mili! Pehle screenshot/photo copy karein, ya upar "Choose Photo" dabayein.');
    } catch {
      alert('Photo paste karne ke liye keyboard se Ctrl+V (ya Mac par Cmd+V) dabayein.');
    }
  };

  // Global Ctrl+V / Cmd+V paste listener for Quick Add form
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (activeTab !== 'add' || !hasExtracted) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            uploadImageFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [activeTab, hasExtracted]);

  const startEdit = (p: ManagedProduct) => {
    setEditingProduct(p);
    setEditPrice(String(p.price));
    setEditLink(p.affiliateUrl);
    setEditTitle(p.title);
    setEditImage(p.image || '');
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setIsSavingEdit(true);

    try {
      const res = await fetch('/api/admin/products/manage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingProduct.id,
          title: editTitle,
          price: Number(editPrice),
          affiliateUrl: editLink,
          image: editImage,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      setEditingProduct(null);
      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Could not save changes');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async (p: ManagedProduct) => {
    if (!confirm(`Are you sure you want to delete "${p.title}" from the website?`)) {
      return;
    }

    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/admin/products/manage?id=${encodeURIComponent(p.id)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      loadProducts();
    } catch (err: any) {
      alert(err.message || 'Could not delete product');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.store.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20 font-sans">
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
              <span>Product Manager</span>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-stone-200/80 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'add'
                ? 'bg-neutral-950 text-white shadow-sm'
                : 'bg-white border border-stone-200 text-neutral-600 hover:text-neutral-900'
            }`}
          >
            + Add Product via Link
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manage');
              loadProducts();
            }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'manage'
                ? 'bg-neutral-950 text-white shadow-sm'
                : 'bg-white border border-stone-200 text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Manage Products ({products.length})</span>
          </button>
        </div>

        {sheetNotice && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-xs text-amber-900 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{sheetNotice}</span>
            </div>
            <button
              onClick={() => setSheetNotice(null)}
              className="text-amber-700 hover:text-amber-950 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ================= TAB 1: ADD PRODUCT VIA LINK ================= */}
        {activeTab === 'add' && (
          <div>
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
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                        Product Photo *
                      </label>
                      {imageUploadMsg && (
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {imageUploadMsg}
                        </span>
                      )}
                    </div>

                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadImageFile(file);
                        e.target.value = '';
                      }}
                    />

                    {/* Dropzone & Preview Box */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) uploadImageFile(file);
                      }}
                      onClick={() => {
                        if (!form.image && !isUploadingImage) {
                          fileInputRef.current?.click();
                        }
                      }}
                      className={`w-full aspect-[3/4] rounded-2xl border-2 transition-all relative flex flex-col items-center justify-center overflow-hidden ${
                        isDragOver
                          ? 'border-neutral-900 bg-neutral-100 scale-[1.01]'
                          : form.image
                          ? 'border-stone-200 bg-stone-100'
                          : 'border-dashed border-stone-300 bg-[#FAF8F5] hover:border-stone-400 hover:bg-stone-50 cursor-pointer'
                      }`}
                    >
                      {isUploadingImage ? (
                        <div className="p-4 text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-neutral-900 mx-auto mb-2" />
                          <span className="text-xs font-semibold text-neutral-700">Uploading photo...</span>
                        </div>
                      ) : form.image ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={form.image}
                            alt={form.title || 'Product Preview'}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-neutral-900 text-[11px] font-semibold hover:bg-white shadow-xs flex items-center gap-1"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Change</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setForm((prev) => ({ ...prev, image: '' }));
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/90 text-white text-[11px] font-medium hover:bg-rose-600 shadow-xs"
                            >
                              Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-4 text-center">
                          <div className="w-12 h-12 rounded-full bg-stone-200/80 flex items-center justify-center mx-auto mb-2.5 text-neutral-700">
                            <Upload className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-semibold text-neutral-800">
                            Upload Photo from Device / Gallery
                          </p>
                          <p className="text-[11px] text-neutral-400 mt-1">
                            Click karke photo select karein ya yahan drag karein
                          </p>
                          <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-200/60 text-[10px] font-mono text-neutral-600">
                            <span>or press Ctrl+V / Cmd+V to paste</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Quick Buttons for Phone and Laptop */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isUploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Choose Photo</span>
                      </button>

                      <button
                        type="button"
                        disabled={isUploadingImage}
                        onClick={handlePasteFromClipboard}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 bg-white text-neutral-800 text-xs font-semibold hover:bg-stone-50 disabled:opacity-50 transition-colors shadow-xs"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>Paste Image</span>
                      </button>
                    </div>

                    {/* Image URL fallback */}
                    <div className="pt-2 border-t border-stone-200/80">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-medium text-neutral-600">
                          Or Image Link (HTTPS)
                        </label>
                        {form.affiliateUrl && (
                          <a
                            href={form.affiliateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-medium text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            <span>Open {form.store || 'Store'} ↗</span>
                          </a>
                        )}
                      </div>
                      <input
                        type="url"
                        value={form.image}
                        onChange={(e) => setForm({ ...form, image: e.target.value })}
                        placeholder="https://... or uploaded image path"
                        className="w-full text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg p-2 text-neutral-800 font-mono"
                      />
                      {!form.image && (form.store === 'Ajio' || form.store === 'Nykaa Fashion' || form.store === 'Nykaa') && (
                        <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg p-2.5 mt-2 leading-relaxed">
                          🛡️ <strong>{form.store} Notice</strong>: {form.store} direct photo downloads block karta hai. Kripya upar <strong>&apos;Choose Photo&apos;</strong> se photo select karein ya screenshot copy karke <strong>&apos;Paste Image&apos;</strong> dabayein!
                        </p>
                      )}
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
                          placeholder="e.g. 1999"
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
                          placeholder="e.g. 4999"
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
          </div>
        )}

        {/* ================= TAB 2: MANAGE & EDIT PRODUCTS ================= */}
        {activeTab === 'manage' && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <Search className="w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by title, store, or brand..."
                className="w-full text-xs sm:text-sm bg-transparent outline-none text-neutral-900 placeholder-neutral-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-neutral-400 hover:text-neutral-700"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Products List */}
            {isLoadingProducts ? (
              <div className="p-12 text-center text-neutral-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <span className="text-xs">Loading products...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 bg-white rounded-2xl border border-stone-200 text-center text-neutral-500 text-xs">
                No products found matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-stone-400 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-14 h-18 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-neutral-700">
                            {p.store}
                          </span>
                          {p.isCustom ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                              ⚡ Quick Add
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                              Google Sheet
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-semibold text-neutral-950 mt-1 line-clamp-1">
                          {p.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                          <span className="font-semibold text-neutral-900">₹{p.price}</span>
                          {p.originalPrice && (
                            <span className="line-through text-neutral-400 text-[11px]">
                              ₹{p.originalPrice}
                            </span>
                          )}
                          <span>•</span>
                          <span className="capitalize">{p.category}</span>
                        </div>
                        <p className="text-[11px] text-neutral-400 font-mono line-clamp-1 mt-1 max-w-md">
                          {p.affiliateUrl}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <Link
                        href={`/product/${p.slug}`}
                        target="_blank"
                        className="p-2 rounded-xl border border-stone-200 text-neutral-600 hover:text-neutral-950 hover:bg-stone-50 transition-colors"
                        title="View product on site"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-semibold text-neutral-800 hover:bg-stone-50 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === p.id}
                        onClick={() => handleDelete(p)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors disabled:opacity-50"
                      >
                        {deletingId === p.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal: Edit Link & Price */}
        {editingProduct && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-stone-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <h3 className="text-base font-bold text-neutral-950 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-neutral-700" />
                  <span>Edit Product Link & Details</span>
                </h3>
                <button
                  onClick={() => setEditingProduct(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Product Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-sm bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Product Photo
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-18 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {editImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={editImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        ref={editFileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadEditImageFile(file);
                          e.target.value = '';
                        }}
                      />
                      <input
                        type="url"
                        value={editImage}
                        onChange={(e) => setEditImage(e.target.value)}
                        placeholder="https://... or uploaded image path"
                        className="w-full text-xs bg-[#FAF8F5] border border-stone-200 rounded-lg p-2 text-neutral-900 font-mono"
                      />
                      <button
                        type="button"
                        disabled={isUploadingEditImage}
                        onClick={() => editFileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-[11px] font-semibold text-neutral-800 hover:bg-stone-50"
                      >
                        {isUploadingEditImage ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Upload className="w-3 h-3" />
                        )}
                        <span>Upload New Photo</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full text-sm bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 text-neutral-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-neutral-700 mb-1">
                    Affiliate Redirect Link (Naya Link Yahan Daalein)
                  </label>
                  <input
                    type="url"
                    value={editLink}
                    onChange={(e) => setEditLink(e.target.value)}
                    placeholder="https://..."
                    className="w-full text-xs bg-[#FAF8F5] border border-stone-200 rounded-xl p-3 text-neutral-900 font-mono"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Customer click karne par is naye link par redirect hoga.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-neutral-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={handleSaveEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-neutral-950 text-white text-xs font-semibold hover:bg-neutral-800 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
