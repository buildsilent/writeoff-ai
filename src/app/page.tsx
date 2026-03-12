'use client';

import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { Header } from '@/components/Header';
import { ExampleScanCard } from '@/components/ExampleScanCard';
import { PricingSection } from '@/components/PricingSection';
import { SavingsCalculator } from '@/components/SavingsCalculator';
import { Upload } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-14 sm:px-6">
        {/* Hero */}
        <section className="pt-12 pb-10 text-center md:pt-16 md:pb-12">
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            TaxSnapper finds
            <br />
            <span className="text-[#FF6B00]">every deduction</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-zinc-400 md:text-lg">
            The AI-powered receipt scanner that finds, categorizes, and tracks every business expense.
            Upload a photo or paste receipt text—get exact IRS categories in seconds.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Show when="signed-in">
              <Link
                href="/scan"
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B00] py-3 text-base font-bold text-black shadow-[0_0_24px_rgba(255,107,0,0.35)] sm:w-auto sm:min-w-[220px] sm:px-6"
              >
                <Upload className="h-5 w-5" />
                Scan receipt
              </Link>
            </Show>
            <Show when="signed-out">
              <Link
                href="/sign-up"
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B00] py-3 text-base font-bold text-black shadow-[0_0_24px_rgba(255,107,0,0.35)] sm:w-auto sm:min-w-[220px] sm:px-6"
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
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-6 py-3 font-bold text-black"
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
                  <th className="px-4 py-2.5 font-medium text-[#FF6B00]">TaxSnapper</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/[0.06]">
                  <td className="px-4 py-2.5 text-white">Receipt Scanning</td>
                  <td className="px-4 py-2.5 text-zinc-500">Manual entry</td>
                  <td className="px-4 py-2.5 text-zinc-500">Manual review</td>
                  <td className="px-4 py-2.5 text-[#FF6B00]">AI auto-categorizes in seconds</td>
                </tr>
                <tr className="border-b border-white/[0.06]">
                  <td className="px-4 py-2.5 text-white">IRS Categories</td>
                  <td className="px-4 py-2.5 text-zinc-500">You pick</td>
                  <td className="px-4 py-2.5 text-zinc-500">SMS with bookkeeper</td>
                  <td className="px-4 py-2.5 text-[#FF6B00]">Exact Schedule C categories</td>
                </tr>
                <tr className="border-b border-white/[0.06]">
                  <td className="px-4 py-2.5 text-white">Deduction %</td>
                  <td className="px-4 py-2.5 text-zinc-500">You calculate</td>
                  <td className="px-4 py-2.5 text-zinc-500">Bookkeeper suggests</td>
                  <td className="px-4 py-2.5 text-[#FF6B00]">100% or 50% per item</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-white">Export</td>
                  <td className="px-4 py-2.5 text-zinc-500">Built into filing</td>
                  <td className="px-4 py-2.5 text-zinc-500">Add-on</td>
                  <td className="px-4 py-2.5 text-[#FF6B00]">CSV export included</td>
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
              className="btn-primary mt-6 inline-flex rounded-xl bg-[#FF6B00] px-8 py-3 text-base font-bold text-black shadow-[0_0_24px_rgba(255,107,0,0.35)]"
            >
              Start free
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/scan"
              className="btn-primary mt-6 inline-flex rounded-xl bg-[#FF6B00] px-8 py-3 text-base font-bold text-black shadow-[0_0_24px_rgba(255,107,0,0.35)]"
            >
              Scan receipt
            </Link>
          </Show>
        </section>

        {/* Footer */}
        <footer className="mt-14 border-t border-white/[0.06] py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <Link href="/" className="font-medium text-white hover:opacity-80">
              TaxSnapper
            </Link>
            <nav className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/" className="text-sm text-zinc-500 hover:text-white">Home</Link>
              <Link href="/sign-in" className="text-sm text-zinc-500 hover:text-white">Sign in</Link>
              <Link href="/sign-up" className="text-sm text-zinc-500 hover:text-white">Sign up</Link>
              <Link href="/scan" className="text-sm text-zinc-500 hover:text-white">Scan</Link>
              <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">Dashboard</Link>
            </nav>
          </div>
          <p className="mt-6 text-center text-xs text-zinc-600">
            TaxSnapper provides estimates for informational purposes. Consult a licensed CPA for official tax advice.
          </p>
        </footer>
      </main>
    </div>
  );
}
