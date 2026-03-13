'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface UpgradeModalProps {
  onClose: () => void;
}

export function UpgradeModal({ onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to start checkout');
        setLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setError('No checkout URL received');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-6">
      <div className="w-full max-w-sm rounded-[12px] border border-white/[0.06] bg-[#080B14] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Upgrade to Pro</h2>
          <button
            onClick={onClose}
            type="button"
            className="rounded-[12px] p-1.5 text-zinc-500 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          You&apos;ve used your 3 free scans. Upgrade for unlimited receipt scans.
        </p>
        <div className="mt-6 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4">
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
        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            type="button"
            disabled={loading}
            className="flex-1 rounded-[12px] border border-white/[0.08] py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.04] disabled:opacity-50"
          >
            Maybe later
          </button>
          <button
            onClick={handleUpgrade}
            type="button"
            disabled={loading}
            className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#4F46E5] py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting...
              </>
            ) : (
              'Upgrade'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
