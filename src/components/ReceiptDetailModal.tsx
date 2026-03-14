'use client';

import { X } from 'lucide-react';
import { LineItemCard } from './LineItemCard';
import { formatCents } from '@/lib/format';
import { computeScanTotals } from '@/lib/deductions';

interface LineItem {
  description: string;
  amount: number;
  irs_category: string;
  deduction_percent: number;
  is_deductible: boolean;
  confidence: number;
  explanation: string;
  audit_risk_score?: number;
}

interface Scan {
  id: string;
  merchant_name: string | null;
  amount: number;
  date: string | null;
  receipt_image_url?: string | null;
  raw_data?: {
    merchant_name?: string;
    date?: string;
    total_amount?: number;
    line_items?: LineItem[];
  };
}

const DISCLAIMER = 'TaxSnapper provides estimates for informational purposes. Consult a licensed CPA for official tax advice.';

interface ReceiptDetailModalProps {
  scan: Scan;
  onClose: () => void;
}

export function ReceiptDetailModal({ scan, onClose }: ReceiptDetailModalProps) {
  const raw = scan.raw_data as Scan['raw_data'];
  const merchant = raw?.merchant_name || scan.merchant_name || 'Unknown';
  const date = raw?.date || scan.date || null;
  const { receiptTotalCents, deductibleAmountCents, taxSavingsCents } = computeScanTotals(scan);
  const lineItems = raw?.line_items ?? [{
    description: merchant,
    amount: Number(scan.amount),
    irs_category: 'Other',
    deduction_percent: 100,
    is_deductible: true,
    confidence: 0.8,
    explanation: '',
  }];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[12px] border border-white/[0.06] bg-[#080B14]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#080B14] p-4">
          <h2 className="text-lg font-semibold text-white">{merchant}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-[12px] text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          {scan.receipt_image_url && (
            <div className="mb-4 overflow-hidden rounded-[12px] border border-white/[0.08]">
              <img
                src={scan.receipt_image_url}
                alt="Receipt"
                className="w-full object-contain"
              />
            </div>
          )}
          <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-3 text-sm">
            <p className="text-zinc-500">{date || 'No date'}</p>
            <p className="mt-1">Receipt total: {formatCents(receiptTotalCents)} — Deductible amount: {formatCents(deductibleAmountCents)} — Est. tax savings: {formatCents(taxSavingsCents)}</p>
          </div>
          <div className="mt-4 space-y-4">
            {lineItems.map((item, idx) => (
              <LineItemCard
                key={idx}
                item={item}
                merchantName={merchant}
                date={date}
                receiptImageUrl={scan.receipt_image_url}
              />
            ))}
          </div>
          <div className="mt-6 rounded-[12px] border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-xs text-amber-200/90 leading-relaxed">{DISCLAIMER}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
