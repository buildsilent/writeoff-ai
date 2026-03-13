'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { CheckCircle2, Receipt, Share2 } from 'lucide-react';
import { formatCents } from '@/lib/format';
import { getDeductionStatsFromLineItems } from '@/lib/deductions';

interface LineItem {
  amount: number;
  is_deductible: boolean;
  deduction_percent?: number;
}

interface ScanCelebrationModalProps {
  deductionCount: number;
  estimatedSavingsCents: number;
  onScanAnother: () => void;
  onClose: () => void;
}

export function ScanCelebrationModal({
  deductionCount,
  estimatedSavingsCents,
  onScanAnother,
  onClose,
}: ScanCelebrationModalProps) {
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

  const shareText = `I just found $${(estimatedSavingsCents / 100).toFixed(0)} in tax deductions in 30 seconds using TaxSnapper 🔒 taxsnapper.com`;
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
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="h-6 w-6 shrink-0" />
          <h2 className="text-xl font-semibold">Receipt saved!</h2>
        </div>
        <p className="mt-2 text-zinc-400">Here&apos;s your summary:</p>
        <p className="mt-1 text-sm text-zinc-500">
          {deductionCount === 1 ? '1 deduction found' : `${deductionCount} deductions found`}
        </p>
        <div className="mt-4 rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">Est. tax savings from this receipt</p>
          <p className="mt-1 text-3xl font-bold text-emerald-400">{formatCents(estimatedSavingsCents)}</p>
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
            View all my receipts
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

/** Uses lib/deductions - API returns amounts in cents */
export function getDeductionStatsFromResult(result: { line_items?: LineItem[] }): { count: number; savingsCents: number } {
  const stats = getDeductionStatsFromLineItems(result.line_items ?? [], true);
  return { count: stats.count, savingsCents: stats.taxSavingsCents };
}
