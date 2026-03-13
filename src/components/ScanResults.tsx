'use client';

import { LineItemCard } from './LineItemCard';
import { formatCents } from '@/lib/format';

export interface LineItem {
  description: string;
  amount: number;
  irs_category: string;
  deduction_percent: number;
  is_deductible: boolean;
  confidence: number;
  explanation: string;
}

export interface ReceiptAnalysis {
  merchant_name: string;
  date: string | null;
  total_amount: number;
  line_items: LineItem[];
}

interface ScanResultsProps {
  result: ReceiptAnalysis;
  saved?: boolean;
}

const DISCLAIMER = 'TaxSnapper provides estimates for informational purposes. Consult a licensed CPA for official tax advice.';

// Normalize amounts to cents (OpenAI returns dollars)
function toCents(dollars: number): number {
  return Math.round((dollars ?? 0) * 100);
}

export function ScanResults({ result, saved }: ScanResultsProps) {
  const totalCents = toCents(result.total_amount);
  const lineItemsCents = result.line_items.map((li) => ({ ...li, amount: toCents(li.amount) }));

  return (
    <div className="mt-12 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{result.merchant_name}</h2>
        <p className="text-sm text-zinc-500">Total: {formatCents(totalCents)}</p>
      </div>

      <div className="space-y-4">
        {lineItemsCents.map((item, idx) => (
          <LineItemCard
            key={idx}
            item={item}
            merchantName={result.merchant_name}
            date={result.date}
          />
        ))}
      </div>

      <div className="rounded-[12px] border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <p className="text-xs text-amber-200/90 leading-relaxed">{DISCLAIMER}</p>
      </div>

      {saved && (
        <p className="text-center text-sm text-[#4F46E5]">Saved to your history</p>
      )}
    </div>
  );
}
