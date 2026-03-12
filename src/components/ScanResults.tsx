'use client';

import { LineItemCard } from './LineItemCard';

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

export function ScanResults({ result, saved }: ScanResultsProps) {
  return (
    <div className="mt-12 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{result.merchant_name}</h2>
        <p className="text-sm text-zinc-500">Total: ${result.total_amount.toFixed(2)}</p>
      </div>

      <div className="space-y-4">
        {result.line_items.map((item, idx) => (
          <LineItemCard
            key={idx}
            item={item}
            merchantName={result.merchant_name}
            date={result.date}
          />
        ))}
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <p className="text-xs text-amber-200/90 leading-relaxed">{DISCLAIMER}</p>
      </div>

      {saved && (
        <p className="text-center text-sm text-[#FF6B00]">Saved to your history</p>
      )}
    </div>
  );
}
