'use client';

import Link from 'next/link';
import { UserButton, Show } from '@clerk/nextjs';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-sm font-medium text-white transition-opacity hover:opacity-80"
        >
          TaxSnapper
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/#pricing"
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Pricing
          </Link>
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="ml-2 rounded-lg bg-[#FF6B00] px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
            >
              Get started
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href="/scan"
              className="relative z-10 ml-2 cursor-pointer rounded-lg bg-[#FF6B00] px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
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
