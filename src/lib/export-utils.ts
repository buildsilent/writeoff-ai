/**
 * Shared utilities for export (PDF, Excel, CSV)
 */

export interface ExportLineItem {
  date: string;
  merchant: string;
  amount: number;
  deductibleAmount: number;
  irsCategory: string;
  deductionPercent: number;
  confidence: number;
  notes: string;
}

export interface ExportScan {
  id: string;
  merchant_name: string | null;
  amount: number;
  date: string | null;
  created_at: string;
  is_deductible?: boolean;
  irs_category?: string | null;
  raw_data?: {
    merchant_name?: string;
    date?: string;
    line_items?: Array<{
      description?: string;
      amount: number;
      irs_category?: string;
      deduction_percent?: number;
      is_deductible?: boolean;
      confidence?: number;
      explanation?: string;
    }>;
  };
}

export type DateRangePreset = 'this_month' | 'this_year' | 'all_time' | 'custom';

export function getDateRange(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start: Date;

  switch (preset) {
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all_time':
      start = new Date(2000, 0, 1);
      break;
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(2000, 0, 1);
      if (customEnd) end.setTime(new Date(customEnd).getTime() + 86400000 - 1);
      break;
    default:
      start = new Date(now.getFullYear(), 0, 1);
  }
  return { start, end };
}

export function filterScansByDateRange(
  scans: ExportScan[],
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string
): ExportScan[] {
  const { start, end } = getDateRange(preset, customStart, customEnd);
  return scans.filter((s) => {
    const dStr = s.date || s.created_at?.slice(0, 10);
    if (!dStr) return true;
    const d = new Date(dStr);
    return d >= start && d <= end;
  });
}

export function scansToExportRows(scans: ExportScan[]): ExportLineItem[] {
  const rows: ExportLineItem[] = [];
  for (const scan of scans) {
    const raw = scan.raw_data;
    const merchant = raw?.merchant_name || scan.merchant_name || 'Unknown';
    const date = scan.date || raw?.date || scan.created_at?.slice(0, 10) || '';

    if (raw?.line_items?.length) {
      for (const li of raw.line_items) {
        const amt = li.amount ?? 0;
        const pct = li.deduction_percent ?? 0;
        const liWithDed = li as { deductible_amount_cents?: number };
        const deductible = typeof liWithDed.deductible_amount_cents === 'number'
          ? liWithDed.deductible_amount_cents
          : (li.is_deductible ? Math.round(amt * ((pct >= 75 ? 100 : pct >= 25 ? 50 : 0) / 100)) : 0);
        rows.push({
          date,
          merchant,
          amount: amt,
          deductibleAmount: Math.round(deductible),
          irsCategory: li.irs_category ?? '',
          deductionPercent: pct,
          confidence: li.confidence ?? 0.8,
          notes: li.explanation ?? '',
        });
      }
    } else {
      const amt = Number(scan.amount) ?? 0;
      const deductible = scan.is_deductible ? amt : 0;
      rows.push({
        date,
        merchant,
        amount: amt,
        deductibleAmount: deductible,
        irsCategory: scan.irs_category || (scan.raw_data as { irs_category?: string })?.irs_category || '',
        deductionPercent: scan.is_deductible ?? false ? 100 : 0,
        confidence: 0.8,
        notes: '',
      });
    }
  }
  return rows;
}

export function getCategoryTotals(rows: ExportLineItem[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.irsCategory && r.deductibleAmount > 0) {
      map.set(r.irsCategory, (map.get(r.irsCategory) || 0) + r.deductibleAmount);
    }
  }
  return map;
}

export function formatCentsForExport(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Schedule C Part II line mapping (IRS Form 1040 Schedule C)
const SCHEDULE_C_LINES: Record<string, { line: number; label: string }> = {
  'Advertising & Marketing': { line: 8, label: 'Advertising' },
  'Advertising and Marketing': { line: 8, label: 'Advertising' },
  'Vehicle & Mileage': { line: 9, label: 'Car and truck expenses' },
  'Vehicle and Mileage': { line: 9, label: 'Car and truck expenses' },
  'Professional Services': { line: 15, label: 'Legal and professional services' },
  'Office Supplies': { line: 16, label: 'Office expense' },
  'Software & Subscriptions': { line: 16, label: 'Office expense' },
  'Retirement Contributions': { line: 17, label: 'Pension and profit-sharing plans' },
  'Equipment': { line: 12, label: 'Depreciation and section 179 expense deduction' },
  'Repairs and Maintenance': { line: 20, label: 'Repairs and maintenance' },
  'Supplies': { line: 21, label: 'Supplies' },
  'Travel': { line: 23, label: 'Travel' },
  'Meals & Entertainment': { line: 24, label: 'Meals and entertainment' },
  'Meals and Entertainment': { line: 24, label: 'Meals and entertainment' },
  'Phone & Internet': { line: 25, label: 'Utilities' },
  'Phone and Internet': { line: 25, label: 'Utilities' },
  'Home Office': { line: 30, label: 'Other (home office)' },
  'Health Insurance': { line: 29, label: 'Health insurance' },
  'Education': { line: 27, label: 'Other (education)' },
  'Startup Costs': { line: 27, label: 'Other (startup costs)' },
  'Gifts to Clients': { line: 27, label: 'Other (gifts)' },
};

export function categoryTotalsToScheduleCLines(categoryTotals: Map<string, number>): Array<{ line: number; label: string; amount: number }> {
  const byLine = new Map<number, { label: string; amount: number }>();
  for (const [cat, amount] of categoryTotals) {
    const mapping = SCHEDULE_C_LINES[cat];
    const lineNum = mapping?.line ?? 27;
    const label = mapping?.label ?? 'Other expenses';
    const existing = byLine.get(lineNum);
    if (existing) {
      existing.amount += amount;
    } else {
      byLine.set(lineNum, { label, amount });
    }
  }
  return Array.from(byLine.entries())
    .sort(([a], [b]) => a - b)
    .map(([line, { label, amount }]) => ({ line, label, amount }));
}
