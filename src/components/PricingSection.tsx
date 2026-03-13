'use client';

import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { Check } from 'lucide-react';
import { ProCheckoutButton } from './ProCheckoutButton';

export function PricingSection() {
  return (
    <section className="mx-auto max-w-4xl">
      <h2 className="text-center text-2xl font-semibold text-white md:text-3xl">Simple, transparent pricing</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-zinc-500">
        Start free. Upgrade when you need more scans.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-6">
        {/* Free Tier */}
        <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-5 md:p-6">
          <h3 className="text-lg font-semibold text-white">Free</h3>
          <p className="mt-1.5 text-2xl font-bold text-white">$0</p>
          <p className="text-xs text-zinc-500">Forever free</p>
          <ul className="mt-4 space-y-2.5">
            {[
              '3 receipt scans per month',
              'Basic IRS categories',
              'Email support',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="h-4 w-4 shrink-0 text-[#4F46E5]" />
                {item}
              </li>
            ))}
          </ul>
          <Show when="signed-out" fallback={
            <Link
              href="/scan"
              className="btn-primary mt-6 flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-white/[0.12] bg-white/[0.04] py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
            >
              Scan receipt
            </Link>
          }>
            <Link
              href="/sign-up"
              className="btn-primary mt-6 flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-white/[0.12] bg-white/[0.04] py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
            >
              Start Free
            </Link>
          </Show>
        </div>

        {/* Pro Tier */}
        <div className="relative rounded-[12px] border-2 border-[#4F46E5] bg-white/[0.02] p-5 md:p-6">
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#4F46E5] px-3 py-0.5 text-xs font-bold text-black">
            Most Popular
          </div>
          <h3 className="text-lg font-semibold text-white">Pro</h3>
          <p className="mt-1.5 text-2xl font-bold text-white">$9.99<span className="text-sm font-normal text-zinc-500">/month</span></p>
          <p className="text-xs text-zinc-500">Cancel anytime</p>
          <ul className="mt-4 space-y-2.5">
            {[
              'Unlimited receipt scans',
              'All IRS categories with confidence scores',
              'Priority support',
              'Annual deduction dashboard',
              'Export to CSV',
              'Cancel anytime',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                <Check className="h-4 w-4 shrink-0 text-[#4F46E5]" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <ProCheckoutButton variant="primary" className="w-full py-3">
              Go Pro Now
            </ProCheckoutButton>
          </div>
        </div>
      </div>
    </section>
  );
}
