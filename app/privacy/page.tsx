import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/config/site';

export const metadata: Metadata = {
  title: `Privacy Policy | ${SITE_CONFIG.name}`,
  description: `Privacy policy and data transparency for ${SITE_CONFIG.name} creator storefront.`,
  alternates: {
    canonical: `${SITE_CONFIG.url}/privacy`,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Navigation */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-neutral-500">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-neutral-900 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to picks</span>
        </Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium">Privacy Policy</span>
      </nav>

      {/* Header */}
      <div className="border-b border-stone-200 pb-6 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-neutral-800 text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
          <span>Privacy & Data Transparency</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Last updated: September 2026 • {SITE_CONFIG.brandName}
        </p>
      </div>

      {/* Content */}
      <div className="space-y-6 text-sm text-neutral-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">1. Introduction</h2>
          <p>
            Welcome to {SITE_CONFIG.brandName} (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;storefront&rdquo;). This website is a curated fashion, beauty, and lifestyle creator discovery platform operated by {SITE_CONFIG.creator.name}.
          </p>
          <p>
            We are committed to user privacy. We do not sell user information, we do not require visitor accounts, and we do not collect personal financial data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">2. Information We Do NOT Collect</h2>
          <p>
            {SITE_CONFIG.brandName} is an editorial discovery destination, not a direct retailer. As such:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-600">
            <li>We do <strong>not</strong> collect names, home addresses, or phone numbers.</li>
            <li>We do <strong>not</strong> collect or process credit card, debit card, or payment data.</li>
            <li>We do <strong>not</strong> require you to register, create accounts, or store passwords.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">3. Non-Personal Analytics & Telemetry</h2>
          <p>
            To understand which recommendations are helpful, we capture anonymous, aggregated telemetry including:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-600">
            <li>Product impressions and clicks on outbound merchant links.</li>
            <li>Anonymous device classification (e.g. mobile, tablet, or desktop).</li>
            <li>Referring platforms (e.g. Instagram Reels, Google Search, or direct visits).</li>
            <li>Campaign attribution tags (e.g. UTM parameters) to gauge recommendation interest.</li>
          </ul>
          <p className="text-xs text-neutral-500">
            We derive privacy-preserving anonymous session identifiers without recording or storing raw IP addresses.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">4. Third-Party Merchants & Affiliate Links</h2>
          <p>
            When you click &ldquo;Shop Now&rdquo; on an item, you are redirected to the official external retailer (e.g. Zara, Mango, Nykaa, Massimo Dutti, etc.). Once you land on an external merchant website, their respective privacy policy and terms of service govern your purchase, order fulfillment, and customer data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-neutral-900">5. Contact Us</h2>
          <p>
            If you have any questions regarding this Privacy Policy, please reach out via our official Instagram handle{' '}
            <a href={SITE_CONFIG.creator.instagram} target="_blank" rel="noopener noreferrer" className="font-medium text-neutral-900 underline">
              {SITE_CONFIG.creator.instagramHandle}
            </a>{' '}
            or visit our <Link href="/contact" className="font-medium text-neutral-900 underline">Contact page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
