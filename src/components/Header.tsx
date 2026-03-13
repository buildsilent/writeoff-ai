'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, Show } from '@clerk/nextjs';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const NAV_TABS = [
  { href: '/', label: 'Home' },
  { href: '/scan', label: 'Scan' },
  { href: '/receipts', label: 'My Receipts' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/account', label: 'Account' },
] as const;

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080B14]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold text-white transition-opacity hover:opacity-90"
          onClick={() => setMobileOpen(false)}
        >
          TaxSnapper
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_TABS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`min-h-[44px] min-w-[44px] cursor-pointer rounded-[12px] px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/[0.06] ${
                isActive(href) ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* CTA + User */}
        <div className="flex min-h-[44px] items-center gap-2">
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="hidden cursor-pointer rounded-[12px] px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:text-white sm:inline-block"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="btn-primary cursor-pointer rounded-[12px] bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white shadow-[0_2px_12px_rgba(79,70,229,0.4)] transition-all hover:shadow-[0_4px_20px_rgba(79,70,229,0.5)]"
            >
              Start Free
            </Link>
          </Show>
          <Show when="signed-in">
            <Link
              href="/scan"
              className="btn-primary hidden cursor-pointer rounded-[12px] bg-[#4F46E5] px-4 py-2.5 text-sm font-medium text-white shadow-[0_2px_12px_rgba(79,70,229,0.4)] transition-all hover:shadow-[0_4px_20px_rgba(79,70,229,0.5)] sm:inline-block"
            >
              Start Free
            </Link>
            <UserButton />
          </Show>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[12px] text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/[0.06] bg-[#080B14] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_TABS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`min-h-[44px] cursor-pointer rounded-[12px] px-4 py-3 text-base font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
