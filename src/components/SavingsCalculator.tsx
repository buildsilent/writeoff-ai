'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { formatCents } from '@/lib/format';

const JOB_TYPES = [
  { id: 'freelancer', label: 'Freelancer', rate: 0.25 },
  { id: 'content_creator', label: 'Content Creator', rate: 0.22 },
  { id: 'uber_driver', label: 'Uber / Delivery Driver', rate: 0.20 },
  { id: 'small_business', label: 'Small Business Owner', rate: 0.28 },
  { id: 'w2_side_hustle', label: 'W-2 with Side Hustle', rate: 0.24 },
] as const;

export function SavingsCalculator() {
  const [jobType, setJobType] = useState<string>('freelancer');
  const [monthlySpend, setMonthlySpend] = useState<string>('500');

  const rate = JOB_TYPES.find((j) => j.id === jobType)?.rate ?? 0.25;
  const spend = parseFloat(monthlySpend) || 0;
  const annualSpend = spend * 12;
  const estimatedSavingsCents = Math.round(annualSpend * rate * 100);

  return (
    <section className="mx-auto max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-[#4F46E5]" />
        <h2 className="text-xl font-semibold text-white">How much could you save?</h2>
      </div>
      <p className="text-sm text-zinc-500 mb-6">
        Select your work type and estimated monthly business spending. We&apos;ll show you a realistic tax savings estimate.
      </p>
        <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-5 md:p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">I&apos;m a...</label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-white focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            >
              {JOB_TYPES.map((j) => (
                <option key={j.id} value={j.id} className="bg-[#080B14] text-white">
                  {j.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Monthly business spending (receipts, supplies, etc.)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <input
                type="number"
                min="0"
                step="50"
                value={monthlySpend}
                onChange={(e) => setMonthlySpend(e.target.value)}
                className="w-full rounded-[12px] border border-white/[0.08] bg-white/[0.02] py-3 pl-8 pr-4 text-white focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-[12px] border border-[#4F46E5]/30 bg-[#4F46E5]/5 p-4">
          <p className="text-sm text-zinc-500">Estimated annual tax savings</p>
          <p className="mt-1.5 text-3xl font-bold text-[#4F46E5]">{formatCents(estimatedSavingsCents)}</p>
          <p className="mt-2 text-xs text-zinc-500">
            Based on ~{Math.round(rate * 100)}% effective tax rate for your work type. Actual savings depend on your receipts and tax situation.
          </p>
          <p className="mt-3 text-xs text-zinc-400">
            💡 That&apos;s {formatCents(Math.round(estimatedSavingsCents / 12))}/month back in your pocket. Scan your receipts with TaxSnapper to capture every deduction.
          </p>
        </div>
      </div>
    </section>
  );
}
