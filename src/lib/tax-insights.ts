/**
 * Tax health score, year-over-year, quarterly tax, projections, and recommendations.
 * All numbers and rules current for tax year 2025.
 */

import { getDeductibleAmountCents } from '@/lib/deductions';
import { formatCents } from '@/lib/format';

export interface ScanForInsights {
  id: string;
  amount?: number;
  date: string | null;
  created_at: string;
  is_deductible?: boolean;
  raw_data?: {
    line_items?: Array<{
      amount: number;
      is_deductible?: boolean;
      deduction_percent?: number;
      irs_category?: string;
    }>;
  };
}

const ESTIMATED_TAX_RATE = 0.25; // ~25% combined federal + SE tax for typical freelancer
const SCHEDULE_SE_RATE = 0.153; // 15.3% self-employment tax (12.4% SS + 2.9% Medicare)

// 2025 quarterly due dates (federal estimated tax)
const QUARTERLY_DUE_DATES: Record<number, string> = {
  1: 'April 15',
  2: 'June 16',
  3: 'September 15',
  4: 'January 15 of next year',
};

// Common deduction categories we expect freelancers to use
const COMMON_CATEGORIES = [
  'Meals & Entertainment',
  'Travel',
  'Vehicle & Mileage',
  'Software & Subscriptions',
  'Office Supplies',
  'Home Office',
  'Phone & Internet',
  'Advertising & Marketing',
  'Professional Services',
  'Equipment',
  'Health Insurance',
];

function getDeductionCents(scan: ScanForInsights): number {
  return getDeductibleAmountCents(scan, true);
}

function getCategorySet(scans: ScanForInsights[]): Set<string> {
  const cats = new Set<string>();
  for (const s of scans) {
    const items = s.raw_data?.line_items ?? [];
    for (const li of items) {
      if (li.is_deductible && li.irs_category) {
        cats.add(li.irs_category);
      }
    }
  }
  return cats;
}

function getScansForYear(scans: ScanForInsights[], year: number): ScanForInsights[] {
  return scans.filter((s) => {
    const dStr = s.date || s.created_at?.slice(0, 10);
    if (!dStr) return false;
    return new Date(dStr).getFullYear() === year;
  });
}

function getMonthlyDeductions(scans: ScanForInsights[], year: number): number[] {
  const monthly = new Array(12).fill(0);
  for (const s of getScansForYear(scans, year)) {
    const dStr = s.date || s.created_at?.slice(0, 10);
    if (!dStr) continue;
    const m = new Date(dStr).getMonth();
    monthly[m] += getDeductionCents(s);
  }
  return monthly;
}

export function computeTaxHealthScore(scans: ScanForInsights[]): {
  score: number;
  factors: string[];
  recommendations: string[];
} {
  const thisYear = new Date().getFullYear();
  const yearScans = getScansForYear(scans, thisYear);
  const totalDeductionsCents = yearScans.reduce((sum, s) => sum + getDeductionCents(s), 0);
  const categorySet = getCategorySet(yearScans);
  const monthly = getMonthlyDeductions(scans, thisYear);
  const monthsWithActivity = monthly.filter((m) => m > 0).length;

  let score = 0;
  const factors: string[] = [];
  const recommendations: string[] = [];

  // Consistency: scans across months (max 30 pts)
  const consistencyScore = Math.min(30, monthsWithActivity * 5);
  score += consistencyScore;
  if (monthsWithActivity >= 6) {
    factors.push(`Tracking receipts ${monthsWithActivity} months this year`);
  } else if (monthsWithActivity > 0) {
    factors.push(`Only ${monthsWithActivity} months with receipts — track more consistently`);
    recommendations.push('Scan receipts every month to maximize deductions and reduce audit risk.');
  } else if (yearScans.length > 0) {
    factors.push('Receipts lack dates — add dates for accuracy');
  }

  // Category diversity (max 25 pts)
  const catScore = Math.min(25, categorySet.size * 4);
  score += catScore;
  if (categorySet.size >= 5) {
    factors.push(`Using ${categorySet.size} deduction categories`);
  } else if (categorySet.size > 0) {
    factors.push(`Only ${categorySet.size} categories — consider others`);
  }

  // Common gaps
  const missingCats = COMMON_CATEGORIES.filter((c) => !categorySet.has(c));
  if (missingCats.includes('Vehicle & Mileage')) {
    const estMiles = 5000; // example
    const rate2025 = 70; // cents per mile
    const estSavings = Math.round((estMiles * rate2025) / 100 * ESTIMATED_TAX_RATE);
    recommendations.push(`You're missing Vehicle deductions — add your business mileage to save an estimated $${estSavings}.`);
  }
  if (missingCats.includes('Home Office')) {
    const simplified = 1500; // $5/sqft × 300 max
    const estSavings = Math.round(simplified * ESTIMATED_TAX_RATE);
    recommendations.push(`Do you work from home? Home office deduction could save ~$${estSavings} (simplified method).`);
  }

  // Total deductions volume (max 25 pts) — having meaningful deductions
  const hasMeaningful = totalDeductionsCents >= 50000; // $500+
  if (hasMeaningful) {
    score += 25;
    factors.push(`Substantial deductions tracked (${formatCents(totalDeductionsCents)})`);
  } else if (totalDeductionsCents > 0) {
    score += Math.min(15, Math.floor(totalDeductionsCents / 3333));
    factors.push(`${formatCents(totalDeductionsCents)} in deductions so far`);
  }

  // Gaps (max 20 pts) — not having obvious gaps
  const gapPenalty = Math.min(20, missingCats.length * 5);
  score += Math.max(0, 20 - gapPenalty);

  score = Math.min(100, Math.max(0, score));

  return { score, factors, recommendations };
}

export function computeYearOverYear(scans: ScanForInsights[]): {
  thisYearCents: number;
  lastYearCents: number;
  percentChange: number;
  message: string;
} {
  const thisYear = new Date().getFullYear();
  const lastYear = thisYear - 1;
  const thisScans = getScansForYear(scans, thisYear);
  const lastScans = getScansForYear(scans, lastYear);

  const thisYearCents = thisScans.reduce((sum, s) => sum + getDeductionCents(s), 0);
  const lastYearCents = lastScans.reduce((sum, s) => sum + getDeductionCents(s), 0);

  let percentChange = 0;
  if (lastYearCents > 0) {
    percentChange = ((thisYearCents - lastYearCents) / lastYearCents) * 100;
  } else if (thisYearCents > 0) {
    percentChange = 100;
  }

  const dir = percentChange > 0 ? 'more' : percentChange < 0 ? 'fewer' : 'same';
  const message =
    lastYearCents > 0
      ? `You have found ${Math.abs(Math.round(percentChange))}% ${dir} deductions than this time last year.`
      : thisYearCents > 0
        ? `You're tracking deductions this year — keep it up!`
        : '';

  return { thisYearCents, lastYearCents, percentChange, message };
}

export function computeQuarterlyTax(
  scans: ScanForInsights[],
  estimatedIncomeCents?: number
): {
  quarter: number;
  dueDate: string;
  estimatedPaymentCents: number;
  message: string;
} {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3) + 1;
  const dueDate = QUARTERLY_DUE_DATES[quarter] || 'TBD';

  const thisYear = now.getFullYear();
  const yearScans = getScansForYear(scans, thisYear);
  const totalDeductionsCents = yearScans.reduce((sum, s) => sum + getDeductionCents(s), 0);

  const incomeCents = estimatedIncomeCents ?? 0;
  let quarterlyCents = 0;
  let message: string;

  if (incomeCents > 0) {
    const netCents = Math.max(0, incomeCents - totalDeductionsCents);
    const annualTaxCents = Math.round(netCents * (ESTIMATED_TAX_RATE + SCHEDULE_SE_RATE * 0.5));
    quarterlyCents = Math.round(annualTaxCents / 4);
    message = `Based on your tracked income and deductions, your estimated Q${quarter} tax payment is ${formatCents(quarterlyCents)} — due ${dueDate}.`;
  } else {
    const deductionSavings = Math.round(totalDeductionsCents * ESTIMATED_TAX_RATE);
    message = totalDeductionsCents > 0
      ? `Your ${formatCents(totalDeductionsCents)} in deductions reduces your tax. Next payment due ${dueDate}. Add estimated income in Account for quarterly amount.`
      : `Quarterly estimated tax due ${dueDate}. Add income and scan receipts for an estimate.`;
  }

  return {
    quarter,
    dueDate,
    estimatedPaymentCents: quarterlyCents,
    message,
  };
}

export function computeTaxSavingProjection(scans: ScanForInsights[]): {
  projectedCents: number;
  message: string;
} {
  const thisYear = new Date().getFullYear();
  const yearScans = getScansForYear(scans, thisYear);
  const totalDeductionsCents = yearScans.reduce((sum, s) => sum + getDeductionCents(s), 0);

  const now = new Date();
  const monthNum = now.getMonth() + 1;
  const monthsElapsed = monthNum + (now.getDate() / 30);
  const monthsInYear = 12;
  const pace = monthsElapsed < 1 ? 1 : monthsElapsed / monthsInYear;

  // Project full year based on current pace
  const projectedDeductions =
    pace > 0 && totalDeductionsCents > 0 ? totalDeductionsCents / pace : totalDeductionsCents;
  const projectedSavings = Math.round(projectedDeductions * ESTIMATED_TAX_RATE);

  const message =
    totalDeductionsCents > 0
      ? `At your current pace you will save an estimated ${formatCents(projectedSavings)} in taxes this year.`
      : 'Scan more receipts to see your projected tax savings.';

  return { projectedCents: projectedSavings, message };
}

export function getDeductionCalendarInsight(scans: ScanForInsights[], year: number): {
  monthlyCents: number[];
  slowMonths: number[];
  suggestion: string;
} {
  const monthly = getMonthlyDeductions(scans, year);
  const avg = monthly.reduce((a, b) => a + b, 0) / 12;
  const slowMonths = monthly
    .map((v, i) => (v < avg * 0.3 ? i : -1))
    .filter((i) => i >= 0);

  const hasQ1Slow = [0, 1, 2].some((m) => slowMonths.includes(m));
  const suggestion = hasQ1Slow
    ? 'Q1 is typically when freelancers miss the most deductions — make sure you are tracking these categories: meals, software, home office, vehicle.'
    : slowMonths.length > 0
      ? `Months with fewer deductions: ${slowMonths.map((m) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m]).join(', ')}. Consider if you have receipts from those months.`
      : '';

  return { monthlyCents: monthly, slowMonths, suggestion };
}
