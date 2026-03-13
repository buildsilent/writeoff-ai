'use client';

import { useState, useEffect } from 'react';

function formatDollars(cents: number): string {
  const n = cents / 100;
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function LiveStatsCounter() {
  const [totalCents, setTotalCents] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => setTotalCents(data?.totalDeductionsCents ?? 0))
      .catch(() => setTotalCents(0));
  }, []);

  if (totalCents === null) {
    return (
      <p className="mt-4 text-sm text-zinc-500">
        <span className="font-medium text-white">TaxSnapper users</span> · Finding deductions...
      </p>
    );
  }

  if (totalCents === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-500">
        <span className="font-medium text-white">Be the first to find your deductions</span>
      </p>
    );
  }

  return (
    <p className="mt-4 text-sm text-zinc-500">
      <span className="font-medium text-white">
        TaxSnapper users have found {formatDollars(totalCents)} in deductions
      </span>
    </p>
  );
}
