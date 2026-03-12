'use client';

import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { Check } from 'lucide-react';
import { ProCheckoutButton } from './ProCheckoutButton';

export function PricingSection() {
  return (
    <section className="mx-auto max-w-4xl">
      <h2 className="text-center text-3xl font-semibold text-white md:text-4xl">Simple, transparent pricing</h2>
      <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
        Start free. Upgrade when you need more scans.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-2 md:gap-8">
        {/* Free Tier */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8">
          <h3 className="text-xl font-semibold text-white">Free</h3>
          <p className="mt-2 text-3xl font-bold text-white">$0</p>
          <p className="text-sm text-zinc-500">Forever free</p>
          <ul className="mt-6 space-y-4">
            {[
              '3 receipt scans per month',
              'Basic IRS categories',
              'Email support',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                <Check className="h-5 w-5 shrink-0 text-[#FF6B00]" />
                {item}
              </li>
            ))}
          </ul>
          <Show when="signed-out" fallback={
            <Link
              href="/scan"
              className="btn-primary mt-8 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-white/[0.12] bg-white/[0.04] py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/[0.08]"
            >
              Scan receipt
            </Link>
          }>
            <Link
              href="/sign-up"
              className="btn-primary mt-8 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-white/[0.12] bg-white/[0.04] py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/[0.08]"
            >
              Start Free
            </Link>
          </Show>
        </div>

        {/* Pro Tier */}
        <div className="relative rounded-2xl border-2 border-[#FF6B00] bg-white/[0.02] p-6 md:p-8">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#FF6B00] px-4 py-1 text-xs font-bold text-black">
            Most Popular
          </div>
          <h3 className="text-xl font-semibold text-white">Pro</h3>
          <p className="mt-2 text-3xl font-bold text-white">$9.99<span className="text-base font-normal text-zinc-500">/month</span></p>
          <p className="text-sm text-zinc-500">Cancel anytime</p>
          <ul className="mt-6 space-y-4">
            {[
              'Unlimited receipt scans',
              'All IRS categories with confidence scores',
              'Priority support',
              'Annual deduction dashboard',
              'Export to CSV',
              'Cancel anytime',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                <Check className="h-5 w-5 shrink-0 text-[#FF6B00]" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-8 space-y-3">
            <ProCheckoutButton variant="primary" className="w-full py-4">
              Upgrade to Pro
            </ProCheckoutButton>
            <ProCheckoutButton variant="secondary" className="w-full">
              Go Pro Now
            </ProCheckoutButton>
          </div>
          <p className="mt-3 text-center text-xs text-zinc-500">Go Pro Now skips free scans and goes straight to checkout</p>
        </div>
      </div>
    </section>
  );
}
