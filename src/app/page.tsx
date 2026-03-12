'use client';

import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { Header } from '@/components/Header';
import { ExampleScanCard } from '@/components/ExampleScanCard';
import { PricingSection } from '@/components/PricingSection';
import { SavingsCalculator } from '@/components/SavingsCalculator';
import {
  Upload,
  FileText,
  Check,
  Receipt,
  BarChart3,
  Calendar,
  Shield,
  Zap,
  Download,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <main className="mx-auto max-w-5xl px-6 pb-24">
        {/* Hero */}
        <section className="pt-24 pb-20 text-center md:pt-32 md:pb-28">
          <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            TaxSnapper finds
            <br />
            <span className="text-[#FF6B00]">every deduction</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400">
            The AI-powered receipt scanner that finds, categorizes, and tracks every business expense.
            Upload a photo or paste receipt text—get exact IRS categories in seconds.
          </p>
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Show when="signed-in">
              <Link
                href="/scan"
                className="btn-primary flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#FF6B00] py-4 text-base font-bold text-black shadow-[0_0_24px_rgba(255,107,0,0.35)] sm:w-auto sm:min-w-[240px] sm:px-8 md:py-5 md:text-lg"
              >
                <Upload className="h-5 w-5" />
                Scan receipt
              </Link>
            </Show>
            <Show when="signed-out">
              <Link
                href="/sign-up"
                className="btn-primary flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#FF6B00] py-4 text-base font-bold text-black shadow-[0_0_24px_rgba(255,107,0,0.35)] sm:w-auto sm:min-w-[240px] sm:px-8 md:py-5 md:text-lg"
              >
                Get started free
              </Link>
              <Link
                href="/sign-in"
                className="rounded-lg px-6 py-3.5 text-sm text-zinc-400 transition-colors hover:text-white"
              >
                Sign in
              </Link>
            </Show>
          </div>
          <p className="mt-6 text-sm text-zinc-500">3 free scans · No credit card required</p>
        </section>

        {/* Problem section - 4 pain points */}
        <section className="py-20 md:py-28">
          <p className="text-center text-sm font-medium uppercase tracking-wider text-zinc-500">
            Stop overpaying taxes
          </p>
          <h2 className="mx-auto mt-4 max-w-2xl text-center text-2xl font-semibold text-white md:text-3xl">
            Most people overpay taxes because traditional tools only show up in April—when it&apos;s too late.
          </h2>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Receipt,
                title: 'Forgotten Deductions',
                desc: 'You miss everyday expenses—software, subscriptions, travel—simply because you didn\'t track them in real time.',
              },
              {
                icon: BarChart3,
                title: 'Spreadsheet Hell',
                desc: 'You waste hours sorting receipts, guessing categories, and organizing expenses... just to hand it off to your CPA.',
              },
              {
                icon: Calendar,
                title: 'The April Rush',
                desc: 'Tax time hits and you\'re stuck digging for invoices, donation receipts, and deduction records.',
              },
              {
                icon: Zap,
                title: 'Overpaying The IRS',
                desc: 'Every year, most people miss eligible write-offs—leaving thousands on the table.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF6B00]/10">
                  <Icon className="h-5 w-5 text-[#FF6B00]" />
                </div>
                <h3 className="mt-4 font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features grid */}
        <section className="py-20 md:py-28">
          <h2 className="text-center text-2xl font-semibold text-white md:text-3xl">
            Everything you need for tax success
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
            Built for side hustlers. Trusted by creators. Designed to feel like magic.
          </p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Upload, title: 'Upload or Paste', desc: 'Photo or text—we support both. Scan any receipt in seconds.' },
              { icon: Zap, title: 'AI-Powered Analysis', desc: 'GPT-4o extracts every line item and identifies deductible expenses instantly.' },
              { icon: BarChart3, title: 'Real-Time Dashboard', desc: 'Watch your estimated deductions grow. See totals by IRS category.' },
              { icon: Download, title: 'Export to CSV', desc: 'Clean export for your CPA or tax software. Audit-ready.' },
              { icon: Shield, title: 'IRS Categories', desc: 'Exact Schedule C categories for each deduction. Confidence scores included.' },
              { icon: FileText, title: 'Plain English Explanations', desc: 'Understand why each item is or isn\'t deductible.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6"
              >
                <Icon className="h-8 w-8 text-[#FF6B00]" />
                <h3 className="mt-4 font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Example result */}
        <section className="py-20 md:py-28">
          <h2 className="text-center text-sm font-medium uppercase tracking-wider text-zinc-500">
            Example result
          </h2>
          <div className="mx-auto mt-6 max-w-sm">
            <ExampleScanCard />
          </div>
        </section>

        {/* Comparison table */}
        <section className="py-20 md:py-28">
          <h2 className="text-center text-2xl font-semibold text-white md:text-3xl">
            TaxSnapper vs TurboTax vs Keeper Tax
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
            Built for content creators and small business owners who need smarter tax tools
          </p>
          <div className="mt-12 overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-6 py-4 text-sm font-medium text-white">Feature</th>
                  <th className="px-6 py-4 text-sm font-medium text-zinc-500">TurboTax</th>
                  <th className="px-6 py-4 text-sm font-medium text-zinc-500">Keeper Tax</th>
                  <th className="px-6 py-4 text-sm font-medium text-[#FF6B00]">TaxSnapper</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-white/[0.06]">
                  <td className="px-6 py-4 text-white">Receipt Scanning</td>
                  <td className="px-6 py-4 text-zinc-500">Manual entry</td>
                  <td className="px-6 py-4 text-zinc-500">Manual review</td>
                  <td className="px-6 py-4 text-[#FF6B00]">AI auto-categorizes in seconds</td>
                </tr>
                <tr className="border-b border-white/[0.06]">
                  <td className="px-6 py-4 text-white">IRS Categories</td>
                  <td className="px-6 py-4 text-zinc-500">You pick</td>
                  <td className="px-6 py-4 text-zinc-500">SMS with bookkeeper</td>
                  <td className="px-6 py-4 text-[#FF6B00]">Exact Schedule C categories</td>
                </tr>
                <tr className="border-b border-white/[0.06]">
                  <td className="px-6 py-4 text-white">Deduction %</td>
                  <td className="px-6 py-4 text-zinc-500">You calculate</td>
                  <td className="px-6 py-4 text-zinc-500">Bookkeeper suggests</td>
                  <td className="px-6 py-4 text-[#FF6B00]">100% or 50% per item</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-white">Export</td>
                  <td className="px-6 py-4 text-zinc-500">Built into filing</td>
                  <td className="px-6 py-4 text-zinc-500">Add-on</td>
                  <td className="px-6 py-4 text-[#FF6B00]">CSV export included</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* How it works - 3 steps */}
        <section className="py-20 md:py-28">
          <h2 className="text-center text-2xl font-semibold text-white md:text-3xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
            Three simple steps from receipt to tax-ready
          </p>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Upload or Paste',
                desc: 'Snap a photo of your receipt or paste the text. We support both—no scanning apps required.',
                bullets: ['Photo or text input', 'Works on any device', 'Seconds to process'],
              },
              {
                step: '02',
                title: 'AI Analyzes',
                desc: 'GPT-4o acts as a senior CPA: extracts every line item, assigns IRS categories, and explains each deduction.',
                bullets: ['Every line item extracted', 'Exact IRS categories', 'Plain English explanations'],
              },
              {
                step: '03',
                title: 'Save & Export',
                desc: 'Results auto-save to your dashboard. Export to CSV when you\'re ready for your CPA or tax software.',
                bullets: ['Auto-saved history', 'Dashboard totals', 'CSV export (Pro)'],
              },
            ].map(({ step, title, desc, bullets }) => (
              <div key={step} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                <span className="text-3xl font-bold text-[#FF6B00]/30">{step}</span>
                <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm text-zinc-500">{desc}</p>
                <ul className="mt-4 space-y-2">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm text-zinc-400">
                      <Check className="h-4 w-4 text-[#FF6B00]" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Savings calculator */}
        <section className="py-20 md:py-28">
          <SavingsCalculator />
          <div className="mt-8 text-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B00] px-8 py-3.5 font-bold text-black"
            >
              Get started free
            </Link>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-20 md:py-28 scroll-mt-24">
          <PricingSection />
        </section>

        {/* Testimonials */}
        <section className="py-20 md:py-28">
          <h2 className="text-center text-2xl font-semibold text-white md:text-3xl">
            Trusted by tax savers everywhere
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
            See how TaxSnapper helps people across different industries maximize their deductions.
          </p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2">
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
              {
                emoji: '💼',
                role: 'Small Business Owner',
                quote: 'I run my business, not a spreadsheet—TaxSnapper does the rest.',
                body: 'I was drowning in receipts. TaxSnapper automatically tracks expenses, flags write-offs I didn\'t know existed. Saved me $4,100 and 40 hours of busywork.',
                name: 'Lila Freeman',
                title: 'Owner of Bloom & Bark Studios',
              },
              {
                emoji: '👔',
                role: 'W-2 with Side Hustle',
                quote: 'I thought I couldn\'t deduct anything with a W-2 job—I was wrong.',
                body: 'I work full-time but freelance on the side. TaxSnapper helped me find write-offs for my laptop, Wi-Fi, and software. Saved $2,200 I didn\'t expect.',
                name: 'Ashley Kim',
                title: 'Marketing Analyst & Side Hustler',
              },
            ].map((t) => (
              <div
                key={t.role}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6"
              >
                <span className="text-2xl">{t.emoji}</span>
                <p className="mt-2 text-xs font-medium uppercase tracking-wider text-zinc-500">{t.role}</p>
                <blockquote className="mt-2 text-white">&ldquo;{t.quote}&rdquo;</blockquote>
                <p className="mt-4 text-sm text-zinc-500">{t.body}</p>
                <p className="mt-4 font-medium text-white">{t.name}</p>
                <p className="text-xs text-zinc-500">{t.title}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer CTA + Footer */}
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-8 py-16 text-center md:px-16">
          <h2 className="text-2xl font-semibold text-white md:text-3xl">
            Stop leaving money on the table
          </h2>
          <p className="mx-auto mt-3 max-w-md text-zinc-500">
            Join freelancers and small business owners who find hundreds in deductions every year.
          </p>
          <Show when="signed-out">
            <Link
              href="/sign-up"
              className="btn-primary mt-8 inline-flex rounded-xl bg-[#FF6B00] px-10 py-4 text-base font-bold text-black shadow-[0_0_24px_rgba(255,107,0,0.35)]"
            >
              Start free
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/scan"
              className="btn-primary mt-8 inline-flex rounded-xl bg-[#FF6B00] px-10 py-4 text-base font-bold text-black shadow-[0_0_24px_rgba(255,107,0,0.35)]"
            >
              Scan receipt
            </Link>
          </Show>
        </section>

        {/* Footer */}
        <footer className="mt-24 border-t border-white/[0.06] py-12">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Link href="/" className="font-medium text-white hover:opacity-80">
              TaxSnapper
            </Link>
            <nav className="flex flex-wrap items-center justify-center gap-6">
              <Link href="/" className="text-sm text-zinc-500 hover:text-white">Home</Link>
              <Link href="/sign-in" className="text-sm text-zinc-500 hover:text-white">Sign in</Link>
              <Link href="/sign-up" className="text-sm text-zinc-500 hover:text-white">Sign up</Link>
              <Link href="/scan" className="text-sm text-zinc-500 hover:text-white">Scan</Link>
              <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-white">Dashboard</Link>
            </nav>
          </div>
          <p className="mt-8 text-center text-xs text-zinc-600">
            TaxSnapper provides estimates for informational purposes. Consult a licensed CPA for official tax advice.
          </p>
        </footer>
      </main>
    </div>
  );
}
