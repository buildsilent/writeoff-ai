'use client';

import Link from 'next/link';
import { UserButton, Show } from '@clerk/nextjs';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080B14]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-medium text-white transition-opacity hover:opacity-80"
        >
          TaxSnapper
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/#pricing"
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Pricing
          </Link>
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="btn-primary ml-1.5 rounded-lg bg-[#4F46E5] px-3 py-1.5 text-sm font-medium text-white shadow-[0_2px_8px_rgba(79,70,229,0.3)] transition-opacity hover:opacity-95"
            >
              Start Free
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href="/scan"
              className="btn-primary relative z-10 ml-1.5 cursor-pointer rounded-lg bg-[#4F46E5] px-3 py-1.5 text-sm font-medium text-white shadow-[0_2px_8px_rgba(79,70,229,0.3)] transition-opacity hover:opacity-95"
            >
              Scan receipt
            </Link>
            <UserButton />
          </Show>
        </nav>
      </div>
    </header>
  );
}
