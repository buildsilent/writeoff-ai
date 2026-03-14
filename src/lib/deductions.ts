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

/** Line item with optional server-computed deductible_amount_cents */
export interface LineItemWithDeductible extends LineItemInput {
  deductible_amount_cents?: number;
}

/**
 * Canonical: deductible_amount_cents = Math.round(amount_cents × deduction_percent / 100)
 * Use stored deductible_amount_cents when present (server-enforced), else compute.
 */
function getLineItemDeductibleCents(li: LineItemWithDeductible, amountsInCents: boolean): number {
  if (typeof li.deductible_amount_cents === 'number') return li.deductible_amount_cents;
  if (!li.is_deductible) return 0;
  const amt = Number(li.amount) || 0;
  const amtCents = amountsInCents ? amt : Math.round(amt * 100);
  const pct = li.deduction_percent ?? 100;
  const safePct = pct >= 75 ? 100 : pct >= 25 ? 50 : 0;
  return Math.round(amtCents * safePct / 100);
}

/**
 * Amounts in raw_data.line_items and scan.amount from DB are stored in CENTS.
 * Amounts from API response (before save) may be in DOLLARS - use amountsInCents: false.
 */
export function getDeductibleAmountCents(
  source: { line_items?: LineItemInput[]; amount?: number; is_deductible?: boolean; raw_data?: { line_items?: LineItemWithDeductible[] } } | ScanInput,
  amountsInCents: boolean = true
): number {
  const scan = source as ScanInput;
  const items = scan.raw_data?.line_items ?? (source as { line_items?: LineItemWithDeductible[] }).line_items;

  if (items?.length) {
    return items.reduce((sum, li) => sum + getLineItemDeductibleCents(li as LineItemWithDeductible, amountsInCents), 0);
  }

  const scanAmount = Number(scan.amount ?? 0) || 0;
  const amtCents = amountsInCents ? scanAmount : Math.round(scanAmount * 100);
  return scan.is_deductible ? amtCents : 0;
}

/** Canonical: tax_savings_cents = Math.round(deductible_amount_cents × 25 / 100) */
export function getTaxSavingsCents(deductibleCents: number): number {
  return Math.round(deductibleCents * 25 / 100);
}

/**
 * Single source of truth for scan totals.
 * RECEIPT TOTAL = full amount paid on receipt (scan.amount)
 * DEDUCTIBLE AMOUNT = portion that is tax deductible (sum of line item deductibles)
 * TAX SAVINGS = deductible amount × 0.25
 */
export function computeScanTotals(scan: {
  amount?: number;
  raw_data?: { line_items?: LineItemWithDeductible[] };
  line_items?: LineItemWithDeductible[];
}): { receiptTotalCents: number; deductibleAmountCents: number; taxSavingsCents: number } {
  const receiptTotalCents = Math.round(Number(scan.amount ?? 0));
  const deductibleAmountCents = getDeductibleAmountCents(scan, true);
  const taxSavingsCents = getTaxSavingsCents(deductibleAmountCents);
  return { receiptTotalCents, deductibleAmountCents, taxSavingsCents };
}

export function getDeductionStatsFromLineItems(
  lineItems: LineItemInput[],
  amountsInCents: boolean = true
): { deductibleCents: number; count: number; taxSavingsCents: number } {
  let count = 0;
  let deductibleCents = 0;
  for (const li of lineItems as LineItemWithDeductible[]) {
    const d = getLineItemDeductibleCents(li, amountsInCents);
    if (d > 0) count++;
    deductibleCents += d;
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
