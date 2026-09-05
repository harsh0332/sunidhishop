import { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Sparkles, Heart, HelpCircle, ArrowLeft, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Affiliate Disclosure & Transparency | SUNIDHI.shop',
  description:
    'Full transparency and affiliate disclosure policy for sunidhi.shop. Learn how creator recommendations and merchant links work.',
  alternates: {
    canonical: 'https://sunidhi.shop/disclosure',
  },
};

export default function DisclosurePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Sunidhi&apos;s Storefront</span>
      </Link>

      <div className="border-b border-stone-200 pb-6 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Transparency & FTC / ASCI Compliance</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-neutral-950">
          Affiliate Disclosure & Creator Policy
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-neutral-500">
          Last updated: May 2025 • How Sunidhi.shop works and why honesty is our standard.
        </p>
      </div>

      <div className="prose prose-stone max-w-none text-xs sm:text-sm leading-relaxed space-y-6 text-neutral-700">
        <section>
          <h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-2">
            1. What is Sunidhi.shop?
          </h2>
          <p>
            <strong>Sunidhi.shop</strong> is a digital shopping showroom and link-in-bio hub curated by fashion and lifestyle creator <strong>Sunidhi</strong>. It is designed to answer the community&apos;s most requested question: <em>&ldquo;Where is that from?&rdquo;</em>
          </p>
          <p className="mt-2">
            <strong>Important notice:</strong> Sunidhi.shop is <u>not</u> an online store or merchant. There are no shopping carts, no checkouts, and no payments processed on this website. When you click on any product recommendation, you are redirected directly to the retailer&apos;s official website (such as Zara, Mango, Nykaa, H&M, or Sephora) where your transaction is completed.
          </p>
        </section>

        <section className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-4 sm:p-5">
          <h2 className="text-base font-semibold text-neutral-900 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-700" />
            2. Affiliate Links & Commission Disclosure
          </h2>
          <p>
            In compliance with the Federal Trade Commission (FTC) guidelines and Advertising Standards Council of India (ASCI) social media disclosure standards:
          </p>
          <p className="mt-2 font-medium text-neutral-900">
            Some links on Sunidhi.shop are affiliate links. This means that if you click on a link and make a purchase from the merchant, Sunidhi may receive a small affiliate commission.
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-neutral-600">
            <li><strong>Zero extra cost to you:</strong> The price you pay is identical (or lower if an exclusive creator discount applies).</li>
            <li><strong>Paid by retailers:</strong> Commissions are paid directly by the brand out of their promotional budget.</li>
            <li><strong>Independent curation:</strong> We only recommend products Sunidhi genuinely wears, tests, or stands behind. A retailer cannot buy their way onto this storefront without Sunidhi&apos;s styling approval.</li>
          </ul>
        </section>

        <section id="about">
          <h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-2">
            3. About Sunidhi
          </h2>
          <p>
            Sunidhi is a digital fashion, beauty, and lifestyle creator based between Mumbai and New Delhi. With a focus on quiet luxury, high-low styling, and capsule wardrobe curation, she shares daily outfit inspirations, beauty regimens, and honest product reviews across Instagram and Reels.
          </p>
        </section>

        <section id="contact">
          <h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-2">
            4. Brand Partnerships & PR Inquiries
          </h2>
          <p>
            For official PR samples, gifting, brand collaborations, or styling inquiries, please reach out to our management team at:
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100 text-neutral-800 font-mono text-xs">
            <Mail className="w-3.5 h-3.5 text-neutral-500" />
            <span>hello@sunidhi.shop</span>
          </div>
        </section>

        <section id="privacy" className="pt-4 border-t border-stone-200">
          <h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-2">
            5. Privacy & Tracking Notice
          </h2>
          <p>
            Sunidhi.shop does not collect credit cards, personal addresses, or sensitive payment details. Outbound clicks utilize privacy-respecting link tracking parameters (UTMs and affiliate network cookies) strictly to attribute creator referral credit when you make a purchase on the merchant&apos;s site.
          </p>
        </section>

        <section id="terms">
          <h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-2">
            6. Pricing & Availability Disclaimer
          </h2>
          <p>
            Retailers frequently update stock levels, discounts, and prices without notice. While we strive to maintain accurate pricing, the price and availability displayed on the merchant&apos;s official website at the moment of purchase always takes precedence.
          </p>
        </section>
      </div>
    </div>
  );
}
