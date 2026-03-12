'use client';

import { X } from 'lucide-react';

interface UpgradeModalProps {
  onClose: () => void;
}

export function UpgradeModal({ onClose }: UpgradeModalProps) {
  const handleUpgrade = async () => {
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
      <div className="w-full max-w-sm rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Upgrade to Pro</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          You&apos;ve used your 3 free scans. Upgrade for unlimited receipt scans.
        </p>
        <div className="mt-6 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xl font-semibold text-white">
            $9.99<span className="text-sm font-normal text-zinc-500">/month</span>
          </p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-500">
            <li>Unlimited receipt scans</li>
            <li>Full scan history</li>
            <li>Export for tax prep</li>
            <li>Cancel anytime</li>
          </ul>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/[0.08] py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.04]"
          >
            Maybe later
          </button>
          <button
            onClick={handleUpgrade}
            className="btn-primary flex-1 rounded-lg bg-[#22c55e] py-2.5 text-sm font-medium text-black"
          >
            Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
