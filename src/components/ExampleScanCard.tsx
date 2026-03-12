import { Check } from 'lucide-react';

export function ExampleScanCard() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Office Depot</span>
        <span className="flex items-center gap-1.5 rounded-full bg-[#22c55e]/10 px-2.5 py-1 text-xs font-medium text-[#22c55e]">
          <Check className="h-3 w-3" />
          Deductible
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">$127.45</p>
      <div className="mt-4 space-y-2 text-xs">
        <p className="text-zinc-500"><span className="text-zinc-600">Date</span> 2024-03-05</p>
        <p className="text-zinc-500"><span className="text-zinc-600">Category</span> Office Supplies</p>
        <p className="text-zinc-500"><span className="text-zinc-600">IRS</span> Section 162 - Ordinary Business Expenses</p>
      </div>
    </div>
  );
}
