'use client';

import { Check, Circle } from 'lucide-react';
import { IRS_RECEIPT_REQUIREMENTS } from '@/lib/constants';

interface ReceiptRequirementsReminderProps {
  merchantName: string;
  date: string | null;
  amount: number;
  hasDeductibleItems: boolean;
  hasBusinessPurpose?: boolean; // From line item explanations or user context
}

export function ReceiptRequirementsReminder({
  merchantName,
  date,
  amount,
  hasDeductibleItems,
  hasBusinessPurpose = false,
}: ReceiptRequirementsReminderProps) {
  if (!hasDeductibleItems) return null;

  const checks = [
    { id: 'amount', met: amount > 0, label: IRS_RECEIPT_REQUIREMENTS[0].label },
    { id: 'date', met: Boolean(date && date.length >= 10), label: IRS_RECEIPT_REQUIREMENTS[1].label },
    { id: 'place', met: Boolean(merchantName?.trim()), label: IRS_RECEIPT_REQUIREMENTS[2].label },
    { id: 'business_purpose', met: hasBusinessPurpose, label: IRS_RECEIPT_REQUIREMENTS[3].label },
    { id: 'business_relationship', met: false, label: IRS_RECEIPT_REQUIREMENTS[4].label },
  ];

  const metCount = checks.filter((c) => c.met).length;
  const missingCount = checks.length - metCount;

  return (
    <div className="rounded-[12px] border border-blue-500/30 bg-blue-500/10 p-4">
      <p className="text-sm font-medium text-blue-200">
        IRS documentation checklist
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        The IRS requires these for every deduction. Add any missing details to your records.
      </p>
      <div className="mt-4 space-y-2">
        {checks.map((c) => (
          <div key={c.id} className="flex items-center gap-2 text-sm">
            {c.met ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-zinc-500" />
            )}
            <span className={c.met ? 'text-zinc-300' : 'text-zinc-500'}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
      {missingCount > 0 && (
        <p className="mt-3 text-xs text-amber-300/90">
          {missingCount} item{missingCount !== 1 ? 's' : ''} to document: amount, date, place, business purpose, business relationship (for meals).
        </p>
      )}
    </div>
  );
}
