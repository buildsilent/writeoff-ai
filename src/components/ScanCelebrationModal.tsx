'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { BarChart3, CheckCircle2, Loader2, Receipt, Share2 } from 'lucide-react';
import { formatCents } from '@/lib/format';

interface ScanTotals {
  receiptTotalCents: number;
  deductibleAmountCents: number;
  taxSavingsCents: number;
}

interface ScanCelebrationModalProps {
  scanId: string;
  /** Fallback if fetch fails */
  fallbackTotals?: ScanTotals;
  onScanAnother: () => void;
  onClose: () => void;
}

export function ScanCelebrationModal({
  scanId,
  fallbackTotals = { receiptTotalCents: 0, deductibleAmountCents: 0, taxSavingsCents: 0 },
  onScanAnother,
  onClose,
}: ScanCelebrationModalProps) {
  const [totals, setTotals] = useState<ScanTotals | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/scans/${scanId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setTotals({
            receiptTotalCents: data.receipt_total_cents ?? 0,
            deductibleAmountCents: data.deductible_amount_cents ?? 0,
            taxSavingsCents: data.tax_savings_cents ?? 0,
          });
        }
      } catch {
        if (!cancelled) setTotals(fallbackTotals);
      }
    })();
    return () => { cancelled = true; };
  }, [scanId]);

  const t = totals ?? fallbackTotals;
  useEffect(() => {
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#4F46E5', '#22c55e', '#fbbf24'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#4F46E5', '#22c55e', '#fbbf24'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  const shareText = `I just found ${formatCents(t.taxSavingsCents)} in estimated tax savings in 30 seconds using TaxSnapper 🔒 taxsnapper.com`;
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TaxSnapper',
          text: shareText,
          url: 'https://taxsnapper.com',
        });
      } catch {
        await navigator.clipboard.writeText(shareText);
      }
    } else {
      await navigator.clipboard.writeText(shareText);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-[16px] border border-emerald-500/30 bg-[#0f1729] p-6 shadow-2xl">
        {totals === null && (
          <div className="absolute inset-0 flex items-center justify-center rounded-[16px] bg-[#0f1729]/90">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        )}
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="h-6 w-6 shrink-0" />
          <h2 className="text-xl font-semibold">Receipt saved!</h2>
        </div>
        <p className="mt-2 text-zinc-400">Receipt total: {formatCents(t.receiptTotalCents)} — Deductible amount: {formatCents(t.deductibleAmountCents)} — Estimated tax savings: {formatCents(t.taxSavingsCents)}</p>
        <div className="mt-4 rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">Summary</p>
          <p className="mt-1 text-sm text-zinc-300">Receipt total: {formatCents(t.receiptTotalCents)}</p>
          <p className="mt-0.5 text-sm text-zinc-300">Deductible amount: {formatCents(t.deductibleAmountCents)}</p>
          <p className="mt-0.5 text-base font-bold text-emerald-400">Estimated tax savings: {formatCents(t.taxSavingsCents)}</p>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => { onClose(); onScanAnother(); }}
            className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#4F46E5] py-3 font-semibold text-white transition-all hover:bg-[#4338ca]"
          >
            Scan another receipt
          </button>
          <Link
            href="/receipts"
            onClick={onClose}
            className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-white/[0.12] bg-white/[0.04] py-3 font-medium text-white transition-all hover:bg-white/[0.08]"
          >
            <Receipt className="h-5 w-5" />
            View My Receipts
          </Link>
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-white/[0.12] bg-white/[0.04] py-3 font-medium text-white transition-all hover:bg-white/[0.08]"
          >
            <BarChart3 className="h-5 w-5" />
            View Dashboard
          </Link>
          <button
            type="button"
            onClick={handleShare}
            className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-white/[0.12] bg-white/[0.04] py-3 font-medium text-white transition-all hover:bg-white/[0.08]"
          >
            <Share2 className="h-5 w-5" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

/** Build fallback totals from API result for celebration modal */
export function getFallbackTotalsFromResult(result: {
  total_amount?: number;
  receipt_total_cents?: number;
  deductible_amount_cents?: number;
  tax_savings_cents?: number;
  line_items?: Array<{ amount?: number; deduction_percent?: number; is_deductible?: boolean; deductible_amount_cents?: number }>;
}): { receiptTotalCents: number; deductibleAmountCents: number; taxSavingsCents: number } {
  if (typeof result.receipt_total_cents === 'number' && typeof result.deductible_amount_cents === 'number' && typeof result.tax_savings_cents === 'number') {
    return {
      receiptTotalCents: result.receipt_total_cents,
      deductibleAmountCents: result.deductible_amount_cents,
      taxSavingsCents: result.tax_savings_cents,
    };
  }
  const receiptTotalCents = result.receipt_total_cents ?? result.total_amount ?? 0;
  const items = result.line_items ?? [];
  const deductibleAmountCents = items.reduce((s, li) => {
    if (typeof li.deductible_amount_cents === 'number') return s + li.deductible_amount_cents;
    if (!li.is_deductible) return s;
    const amt = Math.round(Number(li.amount ?? 0));
    const pct = li.deduction_percent ?? 100;
    const safePct = pct >= 75 ? 100 : pct >= 25 ? 50 : 0;
    return s + Math.round(amt * safePct / 100);
  }, 0);
  const taxSavingsCents = Math.round(deductibleAmountCents * 25 / 100);
  return { receiptTotalCents, deductibleAmountCents, taxSavingsCents };
}
