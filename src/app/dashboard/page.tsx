'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { AppFooter } from '@/components/AppFooter';
import { useScansRealtime } from '@/hooks/useScansRealtime';
import { Camera, Loader2, Download, Lock } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { getCategoryEmoji } from '@/lib/constants';
import { formatCents } from '@/lib/format';
import { getDeductibleAmountCents, getTaxSavingsCents } from '@/lib/deductions';
import {
  computeTaxHealthScore,
  computeYearOverYear,
  computeTaxSavingProjection,
  computeQuarterlyTax,
  getDeductionCalendarInsight,
  type ScanForInsights,
} from '@/lib/tax-insights';
import { EmailDigestBanner } from '@/components/EmailDigestBanner';
import { ExportModal } from '@/components/ExportModal';

interface LineItem {
  description: string;
  amount: number;
  irs_category: string;
  deduction_percent: number;
  is_deductible: boolean;
}

interface Scan {
  id: string;
  merchant_name: string | null;
  amount: number;
  date: string | null;
  raw_data?: {
    date?: string;
    line_items?: LineItem[];
  };
  created_at: string;
}

interface Usage {
  scanCount: number;
  limit: number;
  hasSubscription: boolean;
}

const CPA_TIPS = [
  'Keep receipts for meals where you discuss business — 50% is deductible with proper documentation.',
  'Home office deduction requires exclusive and regular use. Measure your dedicated workspace.',
  'Track mileage from the first business mile. Use a log or app — the IRS loves documentation.',
  'Software and subscriptions used for work are 100% deductible. Cancel unused ones to maximize savings.',
  'Equipment under $2,500 can often be deducted in year one. Check Section 179 rules.',
  'Health insurance for self-employed? Premiums are deductible on Schedule 1.',
  'Continuing education related to your business is fully deductible. Conferences count too.',
  'Phone and internet: deduct the business-use percentage. A simple log helps.',
  'Don\'t forget bank fees and interest on business credit cards.',
  'Gifts to clients are deductible up to $25 per person per year.',
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const { scans: scansData, loading: scansLoading, error: scansError } = useScansRealtime();
  const scans = (scansData || []) as Scan[];
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const tipIndex = useMemo(() => Math.floor(Math.random() * CPA_TIPS.length), []);
  const [authError, setAuthError] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { user } = useUser();
  const upgradedParam = searchParams?.get?.('upgraded') ?? null;

  const loading = scansLoading || usageLoading;

  useEffect(() => {
    if (scansError && !scansLoading) setAuthError(true);
  }, [scansError, scansLoading]);

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then((usageData) => {
        setUsage(usageData?.hasOwnProperty('scanCount') ? usageData : null);
        if (upgradedParam === '1') setUpgradeSuccess(true);
      })
      .finally(() => setUsageLoading(false));
  }, [upgradedParam]);

  useEffect(() => {
    if (upgradedParam !== '1' || !usage) return;
    if (usage.hasSubscription) return;
    let attempts = 0;
    const poll = () => {
      attempts++;
      fetch('/api/usage')
        .then((r) => r.json())
        .then((u) => {
          if (u?.hasSubscription) setUsage(u);
          else if (attempts < 5) setTimeout(poll, 2000);
        });
    };
    const id = setTimeout(poll, 2000);
    return () => clearTimeout(id);
  }, [upgradedParam, usage]);

  const thisYear = new Date().getFullYear();
  const scansForInsights = scans as ScanForInsights[];
  const taxHealth = useMemo(() => computeTaxHealthScore(scansForInsights), [scansForInsights]);
  const yearOverYear = useMemo(() => computeYearOverYear(scansForInsights), [scansForInsights]);
  const taxProjection = useMemo(() => computeTaxSavingProjection(scansForInsights), [scansForInsights]);
  const quarterlyTax = useMemo(() => computeQuarterlyTax(scansForInsights), [scansForInsights]);
  const calendarInsight = useMemo(() => getDeductionCalendarInsight(scansForInsights, thisYear), [scansForInsights, thisYear]);

  const { totalScans, totalDeductions, estimatedSaved, biggestCategory, monthlyData, categoryData, streakWeeks } = useMemo(() => {
    const yearScans = scans.filter((s) => {
      const d = (s.date || s.created_at?.slice(0, 10)) ? new Date(s.date || s.created_at!) : new Date();
      return d.getFullYear() === thisYear;
    });

    const catTotals = new Map<string, number>();
    const monthTotals = new Map<number, number>();

    for (const s of yearScans) {
      const scanDed = getDeductibleAmountCents(s as { amount: number; is_deductible?: boolean; raw_data?: { line_items?: Array<{ amount: number; is_deductible?: boolean; deduction_percent?: number; irs_category?: string }> } }, true);
      const raw = s.raw_data as Scan['raw_data'];
      const items = raw?.line_items;
      if (items) {
        for (const li of items) {
          if (li.is_deductible) {
            const amt = Math.round((li.amount ?? 0) * ((li.deduction_percent ?? 100) / 100));
            const cat = li.irs_category || 'Other';
            catTotals.set(cat, (catTotals.get(cat) || 0) + amt);
          }
        }
      } else if (s.raw_data && (s.raw_data as { is_deductible?: boolean }).is_deductible) {
        const cat = (s.raw_data as { irs_category?: string }).irs_category || 'Other';
        catTotals.set(cat, (catTotals.get(cat) || 0) + scanDed);
      }

      const d = (s.date || s.created_at?.slice(0, 10)) ? new Date(s.date || s.created_at!) : new Date();
      const m = d.getMonth();
      monthTotals.set(m, (monthTotals.get(m) || 0) + scanDed);
    }

    const totalDed = yearScans.reduce((sum, s) => sum + getDeductibleAmountCents(s as Parameters<typeof getDeductibleAmountCents>[0], true), 0);
    const biggest = Array.from(catTotals.entries()).sort(([, a], [, b]) => b - a)[0];

    // Streak: weeks in a row with at least one scan
    const sortedDates = scans
      .map((s) => (s.date || s.created_at?.slice(0, 10)) ? new Date(s.date || s.created_at!) : new Date())
      .filter((d) => !isNaN(d.getTime()));
    const uniqueWeeks = new Set(sortedDates.map((d) => {
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay());
      return start.getTime();
    }));
    const weekList = Array.from(uniqueWeeks).sort((a, b) => b - a);
    let streak = 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    let check = thisWeekStart.getTime();
    for (const w of weekList) {
      if (w === check) {
        streak++;
        check -= 7 * 24 * 60 * 60 * 1000;
      } else break;
    }

    return {
      totalScans: yearScans.length,
      totalDeductions: totalDed,
      estimatedSaved: getTaxSavingsCents(totalDed),
      biggestCategory: biggest?.[0] || '—',
      biggestAmount: biggest?.[1] || 0,
      monthlyData: Array.from({ length: 12 }, (_, i) => monthTotals.get(i) || 0),
      categoryData: Array.from(catTotals.entries()).sort(([, a], [, b]) => b - a),
      streakWeeks: streak,
    };
  }, [scans, thisYear]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#080B14]">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#4F46E5]" />
        </main>
        <AppFooter />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-screen flex-col bg-[#080B14]">
        <Header />
        <main className="mx-auto flex flex-1 flex-col items-center justify-center px-6 py-12">
          <p className="text-center text-zinc-400">Sign in to view your dashboard</p>
          <div className="mt-6 flex gap-4">
            <Link
              href="/sign-in"
              className="btn-primary min-h-[44px] cursor-pointer rounded-[12px] bg-[#4F46E5] px-6 py-3 font-medium text-white"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="min-h-[44px] cursor-pointer rounded-[12px] border border-white/[0.12] px-6 py-3 font-medium text-white"
            >
              Sign up
            </Link>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  const maxMonth = Math.max(...monthlyData, 1);
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="flex min-h-screen flex-col bg-[#080B14]">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        {upgradeSuccess && (
          <div className="mb-6 rounded-[12px] border border-[#4F46E5]/30 bg-[#4F46E5]/10 px-4 py-3 text-sm text-[#4F46E5]">
            Welcome to Pro! You now have unlimited receipt scans.
          </div>
        )}

        <EmailDigestBanner />

        {/* ABOVE THE FOLD — what matters most */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[16px] border-2 border-[#4F46E5]/30 bg-[#4F46E5]/10 p-6">
            <p className="text-sm font-medium uppercase tracking-wider text-[#4F46E5]/90">Total deductions this year</p>
            <p className="mt-2 text-4xl font-bold text-white sm:text-5xl">{formatCents(totalDeductions)}</p>
          </div>
          <div className="rounded-[16px] border-2 border-emerald-500/30 bg-emerald-500/10 p-6">
            <p className="text-sm font-medium uppercase tracking-wider text-emerald-400/90">Estimated tax saved this year</p>
            <p className="mt-2 text-4xl font-bold text-emerald-400 sm:text-5xl">{formatCents(estimatedSaved)}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <span className={`text-2xl font-bold ${taxHealth.score >= 70 ? 'text-emerald-400' : taxHealth.score >= 40 ? 'text-amber-400' : 'text-zinc-400'}`}>
              {taxHealth.score}
            </span>
            <span className="text-zinc-500">/100</span>
            <span className="text-sm text-zinc-400">Tax health</span>
          </div>
          <Link
            href="/scan"
            className="btn-primary flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#4F46E5] px-6 font-semibold text-white shadow-[0_4px_20px_rgba(79,70,229,0.4)] transition-all hover:shadow-[0_6px_28px_rgba(79,70,229,0.5)]"
          >
            <Camera className="h-5 w-5" />
            Scan a receipt
          </Link>
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-white/[0.12] bg-white/[0.02] px-6 font-semibold text-white transition-all hover:bg-white/[0.06]"
          >
            <Download className="h-5 w-5" />
            Export
          </button>
        </div>

        {/* SnapPoints teaser */}
        <div className="mt-6 flex items-center gap-4 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 opacity-70">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-zinc-700/50">
            <Lock className="h-6 w-6 text-zinc-500" />
          </div>
          <div>
            <p className="font-medium text-zinc-400">SnapPoints Rewards — Coming Soon</p>
            <p className="text-sm text-zinc-500">Earn points for every receipt you scan. Redeem for gift cards and cash.</p>
          </div>
        </div>

        {/* BELOW THE FOLD */}
        <div className="mt-12 border-t border-white/[0.06] pt-8">
        <h2 className="text-lg font-semibold text-white">Details</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total scans {thisYear}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{totalScans}</p>
          </div>
          <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total deductions</p>
            <p className="mt-1 text-2xl font-semibold text-[#4F46E5]">{formatCents(totalDeductions)}</p>
          </div>
          <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Est. tax saved</p>
            <p className="mt-1 text-2xl font-semibold text-white">{formatCents(estimatedSaved)}</p>
          </div>
          <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Biggest category</p>
            <p className="mt-1 text-lg font-semibold text-white">{getCategoryEmoji(biggestCategory)} {biggestCategory}</p>
          </div>
        </div>

        {/* Milestone badges */}
        {(() => {
          const savedCents = Math.round(estimatedSaved);
          const milestones = [
            { threshold: 0, label: 'First Deduction Found', emoji: '🎯', key: 'first', check: totalDeductions > 0 },
            { threshold: 10000, label: '$100 Saved', emoji: '💰', key: '100', check: true },
            { threshold: 50000, label: '$500 Saved', emoji: '🔥', key: '500', check: true },
            { threshold: 100000, label: '$1,000 Saved', emoji: '🏆', key: '1k', check: true },
            { threshold: 500000, label: '$5,000 Saved', emoji: '👑', key: '5k', check: true },
          ];
          const unlocked = milestones.filter((m) =>
            m.key === 'first' ? m.check : savedCents >= m.threshold
          );
          if (unlocked.length === 0) return null;
          return (
            <div className="mt-6 rounded-[12px] border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-amber-400/90">Your milestones</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {unlocked.map((m) => (
                  <span
                    key={m.key}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-200"
                  >
                    {m.emoji} {m.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Streak */}
        <div className="mt-6 rounded-[12px] border border-[#4F46E5]/20 bg-[#4F46E5]/5 p-4">
          <p className="text-sm font-medium text-white">Scanning streak</p>
          <p className="mt-1 text-2xl font-bold text-[#4F46E5]">{streakWeeks} {streakWeeks === 1 ? 'week' : 'weeks'}</p>
          <p className="mt-1 text-xs text-zinc-500">Weeks in a row you&apos;ve scanned receipts</p>
        </div>

        {/* Deduction calendar */}
        <div className="mt-8 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6">
          <p className="text-sm font-medium text-white">Deduction calendar ({thisYear})</p>
          <div className="mt-4 flex items-end justify-between gap-2">
            {MONTH_LABELS.map((label, i) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`w-full min-h-[4px] rounded-t transition-all ${
                    calendarInsight.slowMonths.includes(i) ? 'bg-amber-500/60' : 'bg-[#4F46E5]'
                  }`}
                  style={{ height: `${Math.max(4, (monthlyData[i] / maxMonth) * 80)}px` }}
                />
                <span className="text-[10px] text-zinc-500">{label}</span>
              </div>
            ))}
          </div>
          {calendarInsight.suggestion && (
            <p className="mt-4 text-sm text-amber-200/90">{calendarInsight.suggestion}</p>
          )}
        </div>

        {/* Category breakdown */}
        {categoryData.length > 0 && (
          <div className="mt-8 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6">
            <p className="text-sm font-medium text-white">Category breakdown</p>
            <div className="mt-4 space-y-3">
              {categoryData.slice(0, 8).map(([cat, amt]) => {
                const pct = totalDeductions > 0 ? (amt / totalDeductions) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="min-w-[80px] text-sm text-zinc-400">
                      {getCategoryEmoji(cat)} {cat}
                    </div>
                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-[#4F46E5]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-[#4F46E5]">{formatCents(amt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tax projection + quarterly + year over year */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Tax saving projection</p>
            <p className="mt-2 text-sm text-white">{taxProjection.message}</p>
          </div>
          <div className="rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Estimated quarterly tax</p>
            <p className="mt-2 text-sm text-white">{quarterlyTax.message}</p>
          </div>
        </div>
        {yearOverYear.message && (
          <div className="mt-4 rounded-[12px] border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <p className="text-sm text-emerald-200">{yearOverYear.message}</p>
          </div>
        )}

        {/* Tip of the day */}
        <div className="mt-6 rounded-[12px] border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400/90">Tip of the day</p>
          <p className="mt-2 text-sm text-amber-100/90 leading-relaxed">{CPA_TIPS[tipIndex]}</p>
        </div>
        </div>
      </main>
      <AppFooter />
      {showExportModal && (
        <ExportModal
          scans={scans as import('@/lib/export-utils').ExportScan[]}
          userName={user?.fullName ?? user?.firstName ?? null}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#080B14]">
          <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
