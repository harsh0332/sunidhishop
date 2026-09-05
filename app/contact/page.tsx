import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Instagram, Mail, Sparkles } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/config/site';

export const metadata: Metadata = {
  title: `Contact & Collaborations | ${SITE_CONFIG.name}`,
  description: `Get in touch with ${SITE_CONFIG.creator.name} for brand collaborations, styling inquiries, and press.`,
  alternates: {
    canonical: `${SITE_CONFIG.url}/contact`,
  },
};

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Navigation */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-neutral-500">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-neutral-900 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to picks</span>
        </Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium">Contact</span>
      </nav>

      {/* Header */}
      <div className="border-b border-stone-200 pb-6 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-neutral-800 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
          <span>Connect & Collaborate</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
          Get in Touch
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Direct communication channels for brand partnerships, styling, and press.
        </p>
      </div>

      {/* Main Contact Channels */}
      <div className="space-y-6">
        {/* Instagram Direct */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-400/80 transition-all shadow-xs">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-stone-100 text-neutral-900 shrink-0">
              <Instagram className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-neutral-900">Instagram (Fastest Response)</h2>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">
                For daily updates, lookbook inquiries, and direct messages, connect with Sunidhi on Instagram.
              </p>
              <a
                href={SITE_CONFIG.creator.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold px-4 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
              >
                <span>Message {SITE_CONFIG.creator.instagramHandle}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Brand & Partnership Inquiries */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-stone-100 text-neutral-900 shrink-0">
              <Mail className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-neutral-900">Brand Collaborations & Press</h2>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1 leading-relaxed">
                We partner selectively with fashion, beauty, and lifestyle brands that match Sunidhi&apos;s personal aesthetic and quality standards.
              </p>
              <p className="text-xs text-neutral-500 mt-2">
                Direct partnership proposals can be sent via Instagram Direct ({SITE_CONFIG.creator.instagramHandle}) or through verified management representatives.
              </p>
            </div>
          </div>
        </div>

        {/* Customer Order Notice */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-neutral-600 leading-relaxed">
          <strong className="text-neutral-800 font-semibold">Shopping & Order Inquiries: </strong>
          Please note that {SITE_CONFIG.brandName} does not process customer orders or shipments directly. If you have an inquiry regarding a purchase, please reach out to the original retailer where you completed checkout.
        </div>
      </div>
    </div>
  );
}
