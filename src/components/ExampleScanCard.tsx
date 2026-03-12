import { Check } from 'lucide-react';

export function ExampleScanCard() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-white">Office supplies</p>
          <p className="mt-0.5 text-xs text-zinc-500">Office Depot · 2024-03-05</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="text-lg font-semibold text-[#22c55e]">$127.45</p>
          <span className="flex items-center gap-1 rounded-full bg-[#22c55e]/10 px-2 py-0.5 text-xs font-medium text-[#22c55e]">
            <Check className="h-3 w-3" />
            100%
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-white">
          📦 Office Supplies
        </span>
        <span className="text-xs font-medium text-[#22c55e]">High confidence</span>
      </div>
    </div>
  );
}
