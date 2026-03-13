'use client';

import { Check, X, AlertTriangle } from 'lucide-react';
import { getCategoryEmoji, getConfidenceLabel, getConfidenceColor } from '@/lib/constants';
import { formatCents } from '@/lib/format';

export interface LineItem {
  description: string;
  amount: number;
  irs_category: string;
  deduction_percent: number;
  is_deductible: boolean;
  confidence: number;
  explanation: string;
  audit_risk_score?: number;
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
    <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-5">
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
          <p className="text-lg font-semibold text-[#4F46E5]">{formatCents(item.amount)}</p>
          {item.is_deductible ? (
            <span className="flex items-center gap-1 rounded-full bg-[#4F46E5]/20 px-2 py-0.5 text-xs font-medium text-[#4F46E5]">
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
      {item.is_deductible && item.audit_risk_score != null && item.audit_risk_score >= 50 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-200/90">
            This deduction is valid but the IRS scrutinizes this category — make sure you have documentation.
          </p>
        </div>
      )}
    </div>
  );
}
