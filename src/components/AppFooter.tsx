'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-[#080B14] py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/" className="text-sm font-medium text-white transition-opacity hover:opacity-80">
              TaxSnapper
            </Link>
            <Link href="/" className="text-sm text-zinc-500 transition-colors hover:text-white">
              Home
            </Link>
            <Link href="/scan" className="text-sm text-zinc-500 transition-colors hover:text-white">
              Scan
            </Link>
            <Link href="/receipts" className="text-sm text-zinc-500 transition-colors hover:text-white">
              My Receipts
            </Link>
            <Link href="/dashboard" className="text-sm text-zinc-500 transition-colors hover:text-white">
              Dashboard
            </Link>
            <Link href="/account" className="text-sm text-zinc-500 transition-colors hover:text-white">
              Account
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Lock className="h-4 w-4 shrink-0" />
            Bank-grade encryption
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-zinc-600">
          TaxSnapper provides estimates for informational purposes. Consult a licensed CPA for official tax advice.
        </p>
      </div>
    </footer>
  );
}
