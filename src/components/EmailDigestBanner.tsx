'use client';

import { useState, useEffect } from 'react';

export function EmailDigestBanner() {
  const [preference, setPreference] = useState<'ask' | true | 'declined' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/preferences')
      .then((r) => r.json())
      .then((data) => {
        if (data?.hasResponded) setPreference(data.weeklyTaxTipEmail ? true : 'declined');
        else setPreference('ask');
      })
      .catch(() => setPreference(null));
  }, []);

  const handleOptIn = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyTaxTipEmail: true }),
      });
      if (res.ok) setPreference(true);
    } finally {
      setLoading(false);
    }
  };

  const handleOptOut = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyTaxTipEmail: false }),
      });
      if (res.ok) setPreference('declined');
    } finally {
      setLoading(false);
    }
  };

  if (preference !== 'ask') return null;

  return (
    <div className="mb-6 rounded-[12px] border border-[#4F46E5]/30 bg-[#4F46E5]/10 p-4">
      <p className="text-sm font-medium text-white">Get one actionable tax tip every Monday?</p>
      <p className="mt-1 text-xs text-zinc-400">Free. Unsubscribe anytime.</p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={handleOptIn}
          disabled={loading}
          className="min-h-[36px] cursor-pointer rounded-[8px] bg-[#4F46E5] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Yes, sign me up
        </button>
        <button
          type="button"
          onClick={handleOptOut}
          disabled={loading}
          className="min-h-[36px] cursor-pointer rounded-[8px] border border-white/[0.12] px-4 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-50"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
