import React from 'react';
import Link from 'next/link';
import { Instagram, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-stone-200/80 pt-10 pb-12 mt-16 text-neutral-600">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10">
          {/* Brand Column */}
          <div className="max-w-sm">
            <Link
              href="/"
              className="text-lg font-bold tracking-[0.25em] uppercase text-neutral-950 font-sans block mb-2"
            >
              SUNIDHI
            </Link>
            <p className="text-xs text-neutral-500 leading-relaxed mb-4">
              A curated destination of fashion, beauty, and lifestyle essentials personally loved and styled by creator Sunidhi.
            </p>
            <a
              href="https://instagram.com/sunidhi_singh029"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800 hover:text-neutral-950 transition-colors"
            >
              <Instagram className="w-4 h-4" />
              <span>Sunidhi on Instagram</span>
            </a>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            <div>
              <h4 className="font-semibold uppercase tracking-wider text-neutral-900 mb-3 text-[11px]">
                Explore
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/#picks" className="hover:text-neutral-900 transition-colors">
                    Latest Picks
                  </Link>
                </li>
                <li>
                  <Link href="/#as-seen-on-sunidhi" className="hover:text-neutral-900 transition-colors">
                    Seen On Sunidhi
                  </Link>
                </li>
                <li>
                  <a href="https://instagram.com/sunidhi_singh029" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-900 transition-colors">
                    Instagram Reels
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold uppercase tracking-wider text-neutral-900 mb-3 text-[11px]">
                Information
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/disclosure" className="hover:text-neutral-900 transition-colors">
                    Affiliate Disclosure
                  </Link>
                </li>
                <li>
                  <Link href="/disclosure#about" className="hover:text-neutral-900 transition-colors">
                    About Sunidhi
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-neutral-900 transition-colors">
                    Contact & Collabs
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold uppercase tracking-wider text-neutral-900 mb-3 text-[11px]">
                Legal
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="hover:text-neutral-900 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-neutral-900 transition-colors">
                    Terms of Use
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Creator Transparency Compliance Box */}
        <div className="pt-6 border-t border-stone-200/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[11px] text-neutral-500">
          <p className="max-w-2xl leading-relaxed text-left">
            <span className="font-semibold text-neutral-700">Creator Transparency:</span> Some links on Sunidhi.shop are affiliate links. When you shop through them, Sunidhi may earn a small commission from the merchant at no extra cost to you. Every single pick is personally selected and loved.{' '}
            <Link
              href="/disclosure"
              className="text-neutral-700 underline underline-offset-2 hover:text-neutral-950 transition-colors"
            >
              Read full disclosure &rarr;
            </Link>
          </p>

          <p className="shrink-0 text-left md:text-right text-[10px] text-neutral-400">
            &copy; {new Date().getFullYear()} SUNIDHI. Curated with care.
          </p>
        </div>
      </div>
    </footer>
  );
};
