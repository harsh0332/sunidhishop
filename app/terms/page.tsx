import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/config/site';

export const metadata: Metadata = {
  title: `Terms of Use | ${SITE_CONFIG.name}`,
  description: `Terms of use for ${SITE_CONFIG.name} creator storefront.`,
  alternates: {
    canonical: `${SITE_CONFIG.url}/terms`,
  },
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Navigation */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-neutral-500">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-neutral-900 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to picks</span>
        </Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium">Terms of Use</span>
      </nav>

      {/* Header */}
      <div className="border-b border-stone-200 pb-6 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-neutral-800 text-xs font-semibold mb-3">
          <FileText className="w-3.5 h-3.5 text-neutral-700" />
          <span>Legal Terms</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
          Terms of Use
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Last updated: September 2026 • {SITE_CONFIG.brandName}
        </p>
      </div>

      {/* Content */}
      <div className="space-y-6 text-sm text-neutral-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">1. Acceptance of Terms</h2>
          <p>
            By visiting or browsing {SITE_CONFIG.brandName}, you agree to these Terms of Use. If you do not agree, please discontinue using this website.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">2. Nature of the Storefront</h2>
          <p>
            {SITE_CONFIG.brandName} is a personal curation showcase curated by {SITE_CONFIG.creator.name}. We do not operate an online store, warehouse inventory, collect customer payments, or deliver physical goods.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">3. Pricing & Retailer Availability</h2>
          <p>
            Prices, discounts, promotions, and product stock displayed on {SITE_CONFIG.brandName} reflect the retailer&apos;s information at the time of curation. Third-party retailers may alter pricing, shipping terms, or stock levels at their sole discretion. The official merchant site controls final checkout pricing.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">4. Orders & Customer Service</h2>
          <p>
            All purchase agreements, cancellations, returns, and customer service inquiries must be addressed directly to the merchant from whom the product was purchased. {SITE_CONFIG.brandName} is not a party to transactions between visitors and retailers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">5. Intellectual Property</h2>
          <p>
            All creator editorial content, photography, branding, and curation design on {SITE_CONFIG.brandName} are the intellectual property of {SITE_CONFIG.creator.name} or their respective licensors.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">6. Contact</h2>
          <p>
            Questions about these terms can be directed via our <Link href="/contact" className="font-medium text-neutral-900 underline">Contact page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
