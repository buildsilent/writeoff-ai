/**
 * Single source of truth for all deduction and tax savings calculations.
 * Amounts are ALWAYS in cents. Every page and component must use these helpers.
 */

import { formatCents } from '@/lib/format';

export const TAX_SAVINGS_RATE = 0.25;

export interface LineItemInput {
  amount: number;
  is_deductible?: boolean;
  deduction_percent?: number;
}

export interface ScanInput {
  amount?: number;
  is_deductible?: boolean;
  raw_data?: {
    line_items?: LineItemInput[];
    irs_category?: string;
  };
}

/**
 * Amounts in raw_data.line_items and scan.amount from DB are stored in CENTS.
 * Amounts from API response (before save) may be in DOLLARS - use amountsInCents: false.
 */
export function getDeductibleAmountCents(
  source: { line_items?: LineItemInput[] } | ScanInput,
  amountsInCents: boolean = true
): number {
  const scan = source as ScanInput;
  const items = scan.raw_data?.line_items ?? (source as { line_items?: LineItemInput[] }).line_items;

  if (items?.length) {
    return items.reduce((sum, li) => {
      if (!li.is_deductible) return sum;
      const amt = Number(li.amount) || 0;
      const amtCents = amountsInCents ? amt : Math.round(amt * 100);
      const pct = li.deduction_percent ?? 100;
      return sum + Math.round(amtCents * (pct / 100));
    }, 0);
  }

  const scanAmount = Number(scan.amount ?? 0) || 0;
  const amtCents = amountsInCents ? scanAmount : Math.round(scanAmount * 100);
  return scan.is_deductible ? amtCents : 0;
}

export function getTaxSavingsCents(deductibleCents: number): number {
  return Math.round(deductibleCents * TAX_SAVINGS_RATE);
}

export function getDeductionStatsFromLineItems(
  lineItems: LineItemInput[],
  amountsInCents: boolean = true
): { deductibleCents: number; count: number; taxSavingsCents: number } {
  let count = 0;
  let deductibleCents = 0;
  for (const li of lineItems) {
    if (li.is_deductible) {
      count++;
      const amt = Number(li.amount) || 0;
      const amtCents = amountsInCents ? amt : Math.round(amt * 100);
      const pct = li.deduction_percent ?? 100;
      deductibleCents += Math.round(amtCents * (pct / 100));
    }
  }
  return {
    deductibleCents,
    count,
    taxSavingsCents: getTaxSavingsCents(deductibleCents),
  };
}

export function getDeductionStatsFromScans(scans: ScanInput[]): {
  totalDeductibleCents: number;
  totalTaxSavingsCents: number;
} {
  let totalDeductibleCents = 0;
  for (const scan of scans) {
    totalDeductibleCents += getDeductibleAmountCents(scan, true);
  }
  return {
    totalDeductibleCents,
    totalTaxSavingsCents: getTaxSavingsCents(totalDeductibleCents),
  };
}

export function formatDollars(cents: number): string {
  return formatCents(cents);
}
