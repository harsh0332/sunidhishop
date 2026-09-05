'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/admin/analytics';

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your admin password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please verify your credentials.');
        setIsLoading(false);
        return;
      }

      // Success: redirect to target admin page
      router.push(nextPath);
      router.refresh();
    } catch {
      setError('Network connection error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#E8E2D9] rounded-2xl p-7 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-wider text-[#555] mb-2"
          >
            Admin Passphrase
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter administrator password"
              autoFocus
              required
              className="w-full bg-[#FAF8F5] border border-[#DDD7CD] rounded-xl px-4 py-3.5 text-sm text-[#1A1A1A] placeholder-[#999] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/20 focus:border-[#1A1A1A] transition-all pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#222] transition-colors p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-[#FFF1F0] border border-[#FFCCC7] p-3 text-xs text-[#CF1322] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#CF1322] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#1A1A1A] text-white hover:bg-[#333] active:scale-[0.99] font-medium py-3.5 px-4 rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying credentials...</span>
            </>
          ) : (
            <>
              <span>Enter Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Privacy & Guard Notice */}
      <div className="mt-6 pt-5 border-t border-[#F0EBE1] flex items-center justify-center gap-2 text-xs text-[#8C827A]">
        <ShieldCheck className="w-4 h-4 text-[#8C827A]" />
        <span>Encrypted HttpOnly Session • Zero PII</span>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] flex flex-col justify-center items-center px-4 py-12 selection:bg-[#1A1A1A] selection:text-white">
      {/* Brand & Editorial Shield Header */}
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#EAE5DE] text-[#2C2A29] mb-4 shadow-sm border border-[#DDD7CD]">
            <Lock className="w-5 h-5 text-[#333]" />
          </div>
          <span className="block text-xs font-semibold tracking-[0.25em] text-[#8C827A] uppercase mb-1">
            Protected Area
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-normal tracking-tight text-[#1A1A1A]">
            SUNIDHI
          </h1>
          <p className="text-sm text-[#666] mt-2 font-sans">
            Internal Creator & Affiliate Intelligence
          </p>
        </div>

        {/* Card Form inside Suspense Boundary */}
        <Suspense
          fallback={
            <div className="bg-white border border-[#E8E2D9] rounded-2xl p-8 shadow-sm flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#888]" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Back link */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-xs text-[#888] hover:text-[#111] transition-colors underline-offset-4 hover:underline"
          >
            ← Return to Sunidhi Storefront
          </a>
        </div>
      </div>
    </div>
  );
}
