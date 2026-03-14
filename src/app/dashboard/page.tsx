'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { AppFooter } from '@/components/AppFooter';
import { useScansRealtime } from '@/hooks/useScansRealtime';
import { Camera, Download, Lock } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { getCategoryEmoji } from '@/lib/constants';
import { formatCents } from '@/lib/format';
import { computeScanTotals } from '@/lib/deductions';
import { computeTaxHealthScore, type ScanForInsights } from '@/lib/tax-insights';
import { EmailDigestBanner } from '@/components/EmailDigestBanner';
import { ExportModal } from '@/components/ExportModal';
import { DashboardSkeleton } from '@/components/Skeleton';

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
    merchant_name?: string;
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
  'Keep receipts for meals where you discuss business — 50% deductible with proper documentation.',
  'Home office deduction requires exclusive and regular use. Measure your dedicated workspace.',
  'Track mileage from the first business mile. Use a log or app.',
  'Software and subscriptions used for work are 100% deductible.',
  'Equipment under $2,500 can often be deducted in year one.',
];

const QUARTERLY_MONTH_DAY: Record<number, [number, number]> = {
  1: [3, 15],   // April 15 (month 3, 0-indexed)
  2: [5, 16],   // June 16
  3: [8, 15],   // September 15
  4: [0, 15],   // January 15 next year
};

function daysUntilQuarter(quarter: number): number {
  const [month, day] = QUARTERLY_MONTH_DAY[quarter] ?? [3, 15];
  const now = new Date();
  const year = quarter === 4 ? now.getFullYear() + 1 : now.getFullYear();
  const target = new Date(year, month, day);
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 86400000));
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const { scans: scansData, loading: scansLoading, error: scansError } = useScansRealtime();
  const scans = (scansData || []) as Scan[];
  const [usage, setUsage] = useState<Usage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { user } = useUser();
  const upgradedParam = searchParams?.get?.('upgraded') ?? null;

  const loading = scansLoading || usageLoading;
  const [authError, setAuthError] = useState(false);

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
      fetch('/api/usage').then((r) => r.json()).then((u) => {
        if (u?.hasSubscription) setUsage(u);
        else if (attempts < 5) setTimeout(poll, 2000);
      });
    };
    setTimeout(poll, 2000);
  }, [upgradedParam, usage]);

  const thisYear = new Date().getFullYear();
  const scansForInsights = scans as ScanForInsights[];
  const taxHealth = useMemo(() => computeTaxHealthScore(scansForInsights), [scansForInsights]);

  const { totalDeductions, estimatedSaved, categoryData, streakWeeks, recentScans } = useMemo(() => {
    const yearScans = scans.filter((s) => {
      const d = (s.date || s.created_at?.slice(0, 10)) ? new Date(s.date || s.created_at!) : new Date();
      return d.getFullYear() === thisYear;
    });

    const catTotals = new Map<string, number>();
    for (const s of yearScans) {
      const raw = s.raw_data as Scan['raw_data'];
      const items = raw?.line_items;
      if (items) {
        for (const li of items) {
          const d = computeScanTotals({ amount: 0, raw_data: { line_items: [li] } }).deductibleAmountCents;
          if (d > 0) {
            const cat = li.irs_category || 'Other';
            catTotals.set(cat, (catTotals.get(cat) || 0) + d);
          }
        }
      } else {
        const t = computeScanTotals(s);
        if (t.deductibleAmountCents > 0) {
          const cat = (s.raw_data as { irs_category?: string })?.irs_category || 'Other';
          catTotals.set(cat, (catTotals.get(cat) || 0) + t.deductibleAmountCents);
        }
      }
    }

    const totalDed = yearScans.reduce((sum, s) => sum + computeScanTotals(s).deductibleAmountCents, 0);

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

    const recent = [...scans]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    return {
      totalDeductions: totalDed,
      estimatedSaved: Math.round(totalDed * 25 / 100),
      categoryData: Array.from(catTotals.entries()).sort(([, a], [, b]) => b - a),
      streakWeeks: streak,
      recentScans: recent,
    };
  }, [scans, thisYear]);

  const tipIndex = useMemo(() => Math.floor(Math.random() * CPA_TIPS.length), []);
  const maxCat = Math.max(...categoryData.map(([, a]) => a), 1);
  const quarter = Math.floor(new Date().getMonth() / 3) + 1;
  const nextDueLabel = ['April 15', 'June 16', 'September 15', 'January 15'][quarter - 1] ?? 'April 15';
  const daysToNext = daysUntilQuarter(quarter);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#080B14]">
        <Header />
        <main className="flex flex-1"><DashboardSkeleton /></main>
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
            <Link href="/sign-in" className="btn-primary min-h-[44px] cursor-pointer rounded-[12px] bg-[#4F46E5] px-6 py-3 font-medium text-white">Sign in</Link>
            <Link href="/sign-up" className="min-h-[44px] cursor-pointer rounded-[12px] border border-white/[0.12] px-6 py-3 font-medium text-white">Sign up</Link>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#080B14]">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        {upgradeSuccess && (
          <div className="mb-6 rounded-[12px] border border-[#4F46E5]/30 bg-[#4F46E5]/10 px-4 py-3 text-sm text-[#4F46E5]">
            Welcome to Pro! Unlimited scans.
          </div>
        )}
        <EmailDigestBanner />

        {/* ROW 1: Two giant stat cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-[16px] border-2 border-[#4F46E5]/30 bg-[#4F46E5]/10 p-8">
            <p className="text-sm font-medium uppercase tracking-wider text-[#4F46E5]/90">Deductions Found</p>
            <p className="mt-2 text-5xl font-bold text-white sm:text-6xl">{formatCents(totalDeductions)}</p>
          </div>
          <div className="rounded-[16px] border-2 border-emerald-500/30 bg-emerald-500/10 p-8">
            <p className="text-sm font-medium uppercase tracking-wider text-emerald-400/90">Tax Saved</p>
            <p className="mt-2 text-5xl font-bold text-emerald-400 sm:text-6xl">{formatCents(estimatedSaved)}</p>
          </div>
        </div>

        {/* ROW 2: Tax Health, Streak, Quarterly countdown */}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <div className="relative h-14 w-14">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={taxHealth.score >= 70 ? '#34d399' : taxHealth.score >= 40 ? '#fbbf24' : '#71717a'} strokeWidth="3" strokeDasharray={`${taxHealth.score}, 100`} strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{taxHealth.score}</p>
              <p className="text-xs text-zinc-500">Tax Health</p>
            </div>
          </div>
          <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <p className="text-2xl font-bold text-[#4F46E5]">{streakWeeks}</p>
            <p className="text-xs text-zinc-500">Week streak</p>
          </div>
          <div className="rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <p className="text-2xl font-bold text-white">{daysToNext}</p>
            <p className="text-xs text-zinc-500">Days until Q{quarter} ({nextDueLabel})</p>
          </div>
          <Link href="/scan" className="btn-primary flex min-h-[48px] cursor-pointer items-center gap-2 rounded-[12px] bg-[#4F46E5] px-6 font-semibold text-white">
            <Camera className="h-5 w-5" /> Scan
          </Link>
          <button type="button" onClick={() => setShowExportModal(true)} className="flex min-h-[48px] cursor-pointer items-center gap-2 rounded-[12px] border border-white/[0.12] bg-white/[0.02] px-6 font-semibold text-white hover:bg-white/[0.06]">
            <Download className="h-5 w-5" /> Export
          </button>
        </div>

        {/* ROW 3: Category horizontal bar chart */}
        {categoryData.length > 0 && (
          <div className="mt-8 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="mb-4 text-sm font-medium text-white">By category</p>
            <div className="space-y-3">
              {categoryData.map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-sm text-zinc-400">{getCategoryEmoji(cat)} {cat}</span>
                  <div className="flex-1 h-3 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-[#4F46E5]" style={{ width: `${(amt / maxCat) * 100}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm font-medium text-[#4F46E5]">{formatCents(amt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROW 4: Recent receipts */}
        <div className="mt-8 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-white">Recent receipts</p>
            <Link href="/receipts" className="text-sm font-medium text-[#4F46E5] hover:underline">View All</Link>
          </div>
          <div className="space-y-2">
            {recentScans.length === 0 ? (
              <p className="text-sm text-zinc-500">No receipts yet. Scan one!</p>
            ) : (
              recentScans.map((s) => {
                const raw = s.raw_data as Scan['raw_data'];
                const merchant = raw?.merchant_name || s.merchant_name || 'Unknown';
                const date = s.date || raw?.date || s.created_at?.slice(0, 10) || '';
                const t = computeScanTotals(s);
                return (
                  <Link key={s.id} href="/receipts" className="flex items-center justify-between rounded-lg border border-white/[0.04] px-3 py-2 hover:bg-white/[0.04]">
                    <div>
                      <p className="text-sm font-medium text-white">{merchant}</p>
                      <p className="text-xs text-zinc-500">{date} · Receipt: {formatCents(t.receiptTotalCents)} · Deductible: {formatCents(t.deductibleAmountCents)}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#4F46E5]">{formatCents(t.taxSavingsCents)} saved</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* BOTTOM: SnapPoints + Tip */}
        <div className="mt-8 flex items-center gap-4 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 opacity-70">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-zinc-700/50">
            <Lock className="h-6 w-6 text-zinc-500" />
          </div>
          <div>
            <p className="font-medium text-zinc-400">SnapPoints Rewards — Coming Soon</p>
            <p className="text-sm text-zinc-500">Earn points for every receipt. Redeem for gift cards and cash.</p>
          </div>
        </div>
        <div className="mt-4 rounded-[12px] border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400/90">Tip of the day</p>
          <p className="mt-2 text-sm text-amber-100/90 leading-relaxed">{CPA_TIPS[tipIndex]}</p>
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#080B14]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
