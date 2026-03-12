import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { Header } from '@/components/Header';
import { ExampleScanCard } from '@/components/ExampleScanCard';
import { Upload, FileText } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <main className="mx-auto max-w-3xl px-6 pb-32 pt-24 md:pt-32">
        {/* Hero */}
        <section className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
            Find hidden tax deductions
            <br />
            in your receipts instantly
          </h1>
          <p className="mx-auto mt-8 max-w-xl text-lg text-zinc-400">
            Upload a photo or paste receipt text. AI analyzes it in seconds and tells you
            exactly what&apos;s deductible—with the IRS category to back it up.
          </p>

          <div className="mt-12 flex w-full flex-col items-stretch gap-4 sm:flex-row sm:justify-center sm:items-center">
            <Show when="signed-in">
              <Link
                href="/scan"
                className="btn-primary flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#22c55e] py-4 text-base font-bold text-black shadow-[0_0_24px_rgba(34,197,94,0.35)] sm:w-auto sm:min-w-[240px] sm:px-8 md:py-5 md:text-lg"
              >
                <Upload className="h-5 w-5" />
                Scan receipt
              </Link>
            </Show>
            <Show when="signed-out">
              <Link
                href="/sign-up"
                className="btn-primary flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#22c55e] py-4 text-base font-bold text-black shadow-[0_0_24px_rgba(34,197,94,0.35)] sm:w-auto sm:min-w-[240px] sm:px-8 md:py-5 md:text-lg"
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

        {/* Example result */}
        <section className="mt-24 md:mt-32">
          <h2 className="text-center text-sm font-medium uppercase tracking-wider text-zinc-500">
            Example result
          </h2>
          <div className="mx-auto mt-6 max-w-sm">
            <ExampleScanCard />
          </div>
        </section>

        {/* Features */}
        <section className="mt-32 grid gap-12 md:grid-cols-3">
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <Upload className="h-5 w-5 text-zinc-500" />
            </div>
            <h3 className="text-sm font-medium text-white">Upload or paste</h3>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              Photo or text—we support both. Scan any receipt in seconds.
            </p>
          </div>
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <FileText className="h-5 w-5 text-zinc-500" />
            </div>
            <h3 className="text-sm font-medium text-white">AI analysis</h3>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              GPT-4o extracts data and identifies deductible expenses instantly.
            </p>
          </div>
          <div>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <span className="text-sm font-medium text-zinc-500">✓</span>
            </div>
            <h3 className="text-sm font-medium text-white">IRS categories</h3>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              Get the exact IRS category for each deduction. Audit-ready.
            </p>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="mt-32 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-8 py-16 text-center md:px-16">
          <h2 className="text-2xl font-semibold text-white md:text-3xl">
            Stop leaving money on the table
          </h2>
          <p className="mx-auto mt-3 max-w-md text-zinc-500">
            Join freelancers and small business owners who find hundreds in deductions every year.
          </p>
          <Show when="signed-out">
            <Link
              href="/sign-up"
              className="btn-primary mt-8 inline-flex rounded-xl bg-[#22c55e] px-10 py-4 text-base font-bold text-black shadow-[0_0_24px_rgba(34,197,94,0.35)]"
            >
              Start free
            </Link>
          </Show>
        </section>
      </main>
    </div>
  );
}
