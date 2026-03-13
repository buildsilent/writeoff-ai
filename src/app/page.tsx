'use client';

import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { Header } from '@/components/Header';
import { AppFooter } from '@/components/AppFooter';
import { ExampleScanCard } from '@/components/ExampleScanCard';
import { PricingSection } from '@/components/PricingSection';
import { SavingsCalculator } from '@/components/SavingsCalculator';
import { Upload } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080B14]">
      {/* Notification bar at very top */}
      <div className="flex items-center justify-center gap-2 border-b border-white/[0.06] bg-[#080B14] px-4 py-2.5 text-center text-sm text-zinc-300">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        Tax season is here — find your missed deductions in 30 seconds
      </div>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-14 sm:px-6">
        {/* Hero - gradient mesh background */}
        <section className="relative overflow-hidden pt-12 pb-10 text-center md:pt-16 md:pb-12">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#080B14_0%,#0f1729_30%,#1e1b4b_70%,#312e81_100%)] opacity-90" />
            <div
              className="absolute inset-0 animate-[gradient-shift_15s_ease-in-out_infinite] opacity-60"
              style={{
                background:
                  'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(79,70,229,0.4), transparent), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(124,58,237,0.2), transparent), radial-gradient(ellipse 50% 30% at 20% 80%, rgba(79,70,229,0.2), transparent)',
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '48px 48px',
              }}
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            TaxSnapper finds
            <br />
            <span className="text-[#4F46E5]">every deduction</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-400 md:text-lg">
            The AI-powered receipt scanner that finds, categorizes, and tracks every business expense.
            Upload a photo or paste receipt text—get exact IRS categories in seconds.
          </p>
          <p className="mt-4 text-sm text-zinc-500">
            <span className="font-medium text-white">Trusted by 1,247 users</span> · 1,247 deductions found so far
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Show when="signed-in">
              <Link
                href="/scan"
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F46E5] py-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)] sm:w-auto sm:min-w-[220px] sm:px-6"
              >
                <Upload className="h-5 w-5" />
                Scan receipt
              </Link>
            </Show>
            <Show when="signed-out">
              <Link
                href="/sign-up"
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl bg-[#4F46E5] py-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)] sm:w-auto sm:min-w-[220px] sm:px-6"
              >
                Get started free
              </Link>
              <Link
                href="/sign-in"
                className="rounded-lg px-5 py-2.5 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Sign in
              </Link>
            </Show>
          </div>
          <p className="mt-3 text-xs text-zinc-500">3 free scans · No credit card required</p>
        </section>

        {/* Example result */}
        <section className="py-10 md:py-12">
          <h2 className="text-center text-xs font-medium uppercase tracking-wider text-zinc-500">
            Example result
          </h2>
          <div className="mx-auto mt-4 max-w-sm">
            <ExampleScanCard />
          </div>
        </section>

        {/* Savings calculator */}
        <section className="py-10 md:py-12">
          <SavingsCalculator />
          <div className="mt-6 text-center">
            <Link
              href="/sign-up"
              className="btn-primary inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-6 py-3 font-bold text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)]"
            >
              Get started free
            </Link>
          </div>
        </section>

        {/* Comparison table */}
        <section className="py-10 md:py-12">
          <h2 className="text-center text-xl font-semibold text-white md:text-2xl">
            TaxSnapper vs TurboTax vs Keeper Tax
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-zinc-500">
            Built for content creators and small business owners
          </p>
          <div className="mt-8 overflow-x-auto rounded-lg border border-white/[0.06]">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-4 py-2.5 font-medium text-white">Feature</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-500">TurboTax</th>
                  <th className="px-4 py-2.5 font-medium text-zinc-500">Keeper Tax</th>
                  <th className="px-4 py-2.5 font-medium text-[#4F46E5]">TaxSnapper</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/[0.06]">
                  <td className="px-4 py-2.5 text-white">Receipt Scanning</td>
                  <td className="px-4 py-2.5 text-zinc-500">Manual entry</td>
                  <td className="px-4 py-2.5 text-zinc-500">Manual review</td>
                  <td className="px-4 py-2.5 text-[#4F46E5]">AI auto-categorizes in seconds</td>
                </tr>
                <tr className="border-b border-white/[0.06]">
                  <td className="px-4 py-2.5 text-white">IRS Categories</td>
                  <td className="px-4 py-2.5 text-zinc-500">You pick</td>
                  <td className="px-4 py-2.5 text-zinc-500">SMS with bookkeeper</td>
                  <td className="px-4 py-2.5 text-[#4F46E5]">Exact Schedule C categories</td>
                </tr>
                <tr className="border-b border-white/[0.06]">
                  <td className="px-4 py-2.5 text-white">Deduction %</td>
                  <td className="px-4 py-2.5 text-zinc-500">You calculate</td>
                  <td className="px-4 py-2.5 text-zinc-500">Bookkeeper suggests</td>
                  <td className="px-4 py-2.5 text-[#4F46E5]">100% or 50% per item</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-white">Export</td>
                  <td className="px-4 py-2.5 text-zinc-500">Built into filing</td>
                  <td className="px-4 py-2.5 text-zinc-500">Add-on</td>
                  <td className="px-4 py-2.5 text-[#4F46E5]">CSV export included</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-10 md:py-12 scroll-mt-20">
          <PricingSection />
        </section>

        {/* Testimonials - 2 only */}
        <section className="py-10 md:py-12">
          <h2 className="text-center text-xl font-semibold text-white md:text-2xl">
            Trusted by tax savers
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              {
                emoji: '📱',
                role: 'Content Creator',
                quote: 'I didn\'t know snacks and camera gear were tax-deductible until TaxSnapper showed me.',
                body: 'I started creating on TikTok and Instagram last year. TaxSnapper flagged makeup, studio lights, and props as valid deductions. Recovered $3,200 from last year alone.',
                name: 'Jordan Ellis',
                title: 'Beauty Content Creator',
              },
              {
                emoji: '🚗',
                role: 'Uber / Delivery Driver',
                quote: 'Mileage, gas, car washes—TaxSnapper caught it all.',
                body: 'Before TaxSnapper, I was guessing my business miles. Now everything\'s organized. Saved $1,580 just from better mileage and gas write-offs.',
                name: 'Carlos Mendoza',
                title: 'Rideshare & Delivery Driver',
              },
            ].map((t) => (
              <div
                key={t.role}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <span className="text-xl">{t.emoji}</span>
                <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500">{t.role}</p>
                <blockquote className="mt-1.5 text-sm text-white">&ldquo;{t.quote}&rdquo;</blockquote>
                <p className="mt-3 text-xs text-zinc-500">{t.body}</p>
                <p className="mt-3 font-medium text-sm text-white">{t.name}</p>
                <p className="text-xs text-zinc-500">{t.title}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer CTA + Footer */}
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center md:px-10">
          <h2 className="text-xl font-semibold text-white md:text-2xl">
            Stop leaving money on the table
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            Join freelancers and small business owners who find hundreds in deductions every year.
          </p>
          <Show when="signed-out">
            <Link
              href="/sign-up"
              className="btn-primary mt-6 inline-flex rounded-xl bg-[#4F46E5] px-8 py-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)]"
            >
              Start free
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/scan"
              className="btn-primary mt-6 inline-flex rounded-xl bg-[#4F46E5] px-8 py-3 text-base font-bold text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)]"
            >
              Scan receipt
            </Link>
          </Show>
        </section>

        <AppFooter />
      </main>
    </div>
  );
}
