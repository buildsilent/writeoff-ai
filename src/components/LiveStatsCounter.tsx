'use client';

import { useState, useEffect } from 'react';
import { formatCents } from '@/lib/format';

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
        TaxSnapper users have found {formatCents(totalCents)} in deductions
      </span>
    </p>
  );
}
