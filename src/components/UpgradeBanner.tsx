'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { Sparkles } from 'lucide-react';

export function UpgradeBanner() {
  const { isSignedIn, isLoaded } = useUser();
  const [usage, setUsage] = useState<{ hasSubscription: boolean; remaining: number } | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch('/api/usage')
      .then((r) => r.json())
      .then((data) => {
        if (data?.hasOwnProperty('hasSubscription')) {
          setUsage({
            hasSubscription: data.hasSubscription,
            remaining: data.remaining ?? 0,
          });
        }
      })
      .catch(() => {});
  }, [isLoaded, isSignedIn]);

  const showBanner = isLoaded && isSignedIn && usage && !usage.hasSubscription;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (showBanner) {
      document.body.classList.add('pb-16');
    } else {
      document.body.classList.remove('pb-16');
    }
    return () => document.body.classList.remove('pb-16');
  }, [showBanner]);

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#080B14]/98 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="text-sm text-zinc-400">
          You have <span className="font-medium text-white">{usage.remaining}</span> scan{usage.remaining === 1 ? '' : 's'} left this month — Upgrade to Pro for unlimited
        </p>
        <Link
          href="/go-pro"
          className="btn-primary shrink-0 rounded-[12px] bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(79,70,229,0.4)] transition-all hover:shadow-[0_4px_20px_rgba(79,70,229,0.5)]"
        >
          <Sparkles className="mr-1.5 inline-block h-4 w-4" />
          Upgrade
        </Link>
      </div>
    </div>
  );
}
