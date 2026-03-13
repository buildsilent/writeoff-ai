'use client';

import { Check, X } from 'lucide-react';
import { getCategoryEmoji, getConfidenceLabel, getConfidenceColor } from '@/lib/constants';

export interface LineItem {
  description: string;
  amount: number;
  irs_category: string;
  deduction_percent: number;
  is_deductible: boolean;
  confidence: number;
  explanation: string;
}

interface LineItemCardProps {
  item: LineItem;
  merchantName?: string;
  date?: string | null;
  receiptImageUrl?: string | null;
  onReceiptClick?: (url: string) => void;
}

export function LineItemCard({ item, merchantName, date, receiptImageUrl, onReceiptClick }: LineItemCardProps) {
  const emoji = getCategoryEmoji(item.irs_category);
  const confidenceLabel = getConfidenceLabel(item.confidence);
  const confidenceColor = getConfidenceColor(item.confidence);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4">
        {receiptImageUrl && (
          <button
            type="button"
            onClick={() => onReceiptClick?.(receiptImageUrl)}
            className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02] transition-opacity hover:opacity-90"
          >
            <img
              src={receiptImageUrl}
              alt="Receipt"
              className="h-full w-full object-cover"
            />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{item.description}</p>
          {merchantName && (
            <p className="mt-0.5 text-xs text-zinc-500">{merchantName}{date ? ` · ${date}` : ''}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="text-lg font-semibold text-[#FF6B00]">${item.amount.toFixed(2)}</p>
          {item.is_deductible ? (
            <span className="flex items-center gap-1 rounded-full bg-[#FF6B00]/10 px-2 py-0.5 text-xs font-medium text-[#FF6B00]">
              <Check className="h-3 w-3" />
              {item.deduction_percent}%
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
              <X className="h-3 w-3" />
              Not deductible
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-white">
          {emoji} {item.irs_category}
        </span>
        <span className={`text-xs font-medium ${confidenceColor}`}>
          {confidenceLabel} confidence
        </span>
      </div>
      {item.explanation && (
        <p className="mt-3 text-sm text-zinc-500 leading-relaxed">{item.explanation}</p>
      )}
    </div>
  );
}
