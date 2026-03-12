'use client';

import { Check, X } from 'lucide-react';

export interface ScanResult {
  merchant_name: string;
  amount: number;
  date: string;
  category: string;
  is_deductible: boolean;
  irs_category: string | null;
  confidence?: number;
}

interface ScanResultCardProps {
  result: ScanResult;
  onSave?: () => void;
  saved?: boolean;
}

export function ScanResultCard({ result, onSave, saved }: ScanResultCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Scan result</span>
        {result.is_deductible ? (
          <span className="flex items-center gap-1.5 rounded-full bg-[#22c55e]/10 px-2.5 py-1 text-xs font-medium text-[#22c55e]">
            <Check className="h-3 w-3" />
            Deductible
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
            <X className="h-3 w-3" />
            Not deductible
          </span>
        )}
      </div>
      <h3 className="mt-2 text-lg font-semibold text-white">
        {result.merchant_name || 'Unknown merchant'}
      </h3>
      <p className="mt-0.5 text-2xl font-semibold text-[#22c55e]">
        ${typeof result.amount === 'number' ? result.amount.toFixed(2) : result.amount}
      </p>
      <div className="mt-4 space-y-2 text-sm">
        <p className="text-zinc-500"><span className="text-zinc-600">Date</span> {result.date || '—'}</p>
        <p className="text-zinc-500"><span className="text-zinc-600">Category</span> {result.category || '—'}</p>
        {result.irs_category && (
          <p className="text-zinc-500"><span className="text-zinc-600">IRS</span> {result.irs_category}</p>
        )}
      </div>
      {onSave && !saved && (
        <button
          onClick={onSave}
          className="btn-primary mt-4 w-full rounded-lg bg-[#22c55e] py-2.5 text-sm font-medium text-black"
        >
          Save to history
        </button>
      )}
      {saved && (
        <p className="mt-4 text-center text-xs text-[#22c55e]">Saved to your history</p>
      )}
    </div>
  );
}
