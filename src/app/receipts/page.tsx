'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { AppFooter } from '@/components/AppFooter';
import { ReceiptDetailModal } from '@/components/ReceiptDetailModal';
import { useScansRealtime } from '@/hooks/useScansRealtime';
import { useUser } from '@clerk/nextjs';
import { ExportModal } from '@/components/ExportModal';
import {
  Folder,
  ChevronDown,
  ChevronRight,
  Search,
  Download,
  FileText,
  Camera,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { getCategoryEmoji, getConfidenceLabel, getConfidenceColor } from '@/lib/constants';
import { formatCents } from '@/lib/format';

interface LineItem {
  description: string;
  amount: number;
  irs_category: string;
  deduction_percent: number;
  is_deductible: boolean;
  confidence: number;
  explanation: string;
}

interface Scan {
  id: string;
  merchant_name: string | null;
  amount: number;
  date: string | null;
  receipt_image_url?: string | null;
  is_deductible?: boolean;
  irs_category?: string | null;
  raw_data?: {
    merchant_name?: string;
    date?: string;
    total_amount?: number;
    line_items?: LineItem[];
  };
  created_at: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type DateRangeFilter = 'today' | 'this_week' | 'this_month' | 'this_year' | 'all_time';
type AmountSort = 'low_to_high' | 'high_to_low';
type TypeFilter = 'all' | 'photo' | 'text';

function getPrimaryCategory(scan: Scan): string {
  const raw = scan.raw_data as Scan['raw_data'];
  const first = raw?.line_items?.[0];
  if (first?.irs_category) return first.irs_category;
  return scan.irs_category || (scan.is_deductible ? 'Other' : 'Not Deductible');
}

function getConfidenceScore(scan: Scan): number {
  const raw = scan.raw_data as Scan['raw_data'];
  const first = raw?.line_items?.[0];
  return first?.confidence ?? 0.8;
}

function getDeductionAmountCents(scan: Scan): number {
  const raw = scan.raw_data as Scan['raw_data'];
  if (raw?.line_items) {
    return raw.line_items.reduce((sum, li) => {
      if (li.is_deductible) return sum + li.amount * (li.deduction_percent / 100);
      return sum;
    }, 0);
  }
  return scan.is_deductible ? Number(scan.amount) : 0;
}

function isPhotoScan(scan: Scan): boolean {
  return Boolean(scan.receipt_image_url);
}

function buildCabinet(scans: Scan[]): Map<number, Map<number, Map<string, Scan[]>>> {
  const byYear = new Map<number, Map<number, Map<string, Scan[]>>>();
  for (const s of scans) {
    const d = (s.date || s.created_at?.slice(0, 10)) ? new Date(s.date || s.created_at!) : new Date();
    const year = d.getFullYear();
    const month = d.getMonth();
    const cat = getPrimaryCategory(s);
    if (!byYear.has(year)) byYear.set(year, new Map());
    const byMonth = byYear.get(year)!;
    if (!byMonth.has(month)) byMonth.set(month, new Map());
    const byCat = byMonth.get(month)!;
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(s);
  }
  return byYear;
}

function matchesSearch(scan: Scan, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase().trim();
  const merchant = (scan.raw_data as { merchant_name?: string })?.merchant_name || scan.merchant_name || '';
  if (merchant.toLowerCase().includes(lower)) return true;
  if (scan.amount.toString().includes(lower)) return true;
  const date = scan.date || scan.created_at?.slice(0, 10) || '';
  if (date.includes(lower)) return true;
  const cat = getPrimaryCategory(scan);
  if (cat.toLowerCase().includes(lower)) return true;
  const raw = scan.raw_data as { line_items?: { description?: string }[] };
  for (const li of raw?.line_items || []) {
    if (li.description?.toLowerCase().includes(lower)) return true;
  }
  return false;
}

function CollapsibleFolder({
  label,
  emoji,
  total,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  emoji?: string;
  total?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[12px] border border-white/[0.06] bg-white/[0.02]">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-[44px] w-full cursor-pointer items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
      >
        {isOpen ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
        <Folder className="h-4 w-4 text-[#4F46E5]" />
        <span className="flex-1 font-medium text-white">{emoji ? `${emoji} ${label}` : label}</span>
        {total != null && total > 0 && <span className="text-sm font-semibold text-[#4F46E5]">{formatCents(total)}</span>}
      </button>
      {isOpen && <div className="border-t border-white/[0.06] p-3">{children}</div>}
    </div>
  );
}

function ReceiptCard({ scan, onClick }: { scan: Scan; onClick: () => void }) {
  const raw = scan.raw_data as Scan['raw_data'];
  const merchant = raw?.merchant_name || scan.merchant_name || 'Unknown';
  const date = raw?.date || scan.date || scan.created_at?.slice(0, 10) || '';
  const ded = getDeductionAmountCents(scan);
  const cat = getPrimaryCategory(scan);
  const emoji = getCategoryEmoji(cat);
  const confidence = getConfidenceScore(scan);
  const confidenceLabel = getConfidenceLabel(confidence);
  const confidenceColor = getConfidenceColor(confidence);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[44px] w-full cursor-pointer items-center gap-4 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:bg-white/[0.04] hover:shadow-[0_0_20px_rgba(79,70,229,0.1)]"
    >
      {scan.receipt_image_url ? (
        <img
          src={scan.receipt_image_url}
          alt=""
          className="h-14 w-14 shrink-0 rounded-[12px] object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.02]">
          <FileText className="h-7 w-7 text-zinc-500" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white">{merchant}</p>
        <p className="text-xs text-zinc-500">{date || 'No date'}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold text-[#4F46E5]">{formatCents(Number(scan.amount))}</p>
        <p className="text-xs text-zinc-500">{formatCents(ded)} deductible</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-xl">{emoji}</span>
        <span className={`text-[10px] font-medium ${confidenceColor}`}>{confidenceLabel}</span>
      </div>
    </button>
  );
}

function ReceiptsContent() {
  const { scans: scansData, loading, error, refetch } = useScansRealtime();
  const scans = (scansData || []) as Scan[];
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('[ReceiptsContent] scans.length=', scans.length, 'loading=', loading, 'error=', error);
    }
  }, [scans.length, loading, error]);
  const [usage, setUsage] = useState<{ hasSubscription: boolean } | null>(null);
  const [authError, setAuthError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all_time');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [amountSort, setAmountSort] = useState<AmountSort>('high_to_low');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const { user } = useUser();

  const thisYear = new Date().getFullYear();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yearStart = new Date(today.getFullYear(), 0, 1);

  useEffect(() => {
    fetch('/api/usage')
      .then(async (r) => {
        if (r.status === 401) return { hasSubscription: false };
        return r.ok ? r.json() : { hasSubscription: false };
      })
      .then((data) => setUsage(data?.hasOwnProperty('hasSubscription') ? data : null));
  }, []);

  useEffect(() => {
    if (scans.length > 0) setAuthError(false);
  }, [scans.length]);

  useEffect(() => {
    if (error && !loading) setAuthError(true);
  }, [error, loading]);

  useEffect(() => {
    if (scans.length === 0) return;
    const years = new Set<number>();
    let latestYear = 0;
    let latestMonth = -1;
    for (const s of scans) {
      const d = (s.date || s.created_at?.slice(0, 10)) ? new Date(s.date || s.created_at) : new Date();
      const y = d.getFullYear();
      const m = d.getMonth();
      years.add(y);
      if (y > latestYear || (y === latestYear && m > latestMonth)) {
        latestYear = y;
        latestMonth = m;
      }
    }
    const isInitialLoad = expandedYears.size === 0;
    if (years.size > 0 && isInitialLoad) {
      setExpandedYears(new Set([latestYear]));
      if (latestYear > 0 && latestMonth >= 0) {
        setExpandedMonths((prev) => new Set([...prev, `${latestYear}-${latestMonth}`]));
      }
    }
  }, [scans, expandedYears.size]);

  const filteredScans = useMemo(() => {
    let list = scans;
    if (searchQuery) list = list.filter((s) => matchesSearch(s, searchQuery));
    if (categoryFilter && categoryFilter !== 'All') {
      list = list.filter((s) => getPrimaryCategory(s) === categoryFilter);
    }
    if (typeFilter === 'photo') list = list.filter((s) => isPhotoScan(s));
    if (typeFilter === 'text') list = list.filter((s) => !isPhotoScan(s));
    if (dateRange !== 'all_time') {
      list = list.filter((s) => {
        const d = (s.date || s.created_at?.slice(0, 10)) ? new Date(s.date || s.created_at!) : new Date();
        const t = d.getTime();
        switch (dateRange) {
          case 'today': return t >= today.getTime();
          case 'this_week': return t >= weekStart.getTime();
          case 'this_month': return t >= monthStart.getTime();
          case 'this_year': return t >= yearStart.getTime();
          default: return true;
        }
      });
    }
    list = [...list].sort((a, b) => {
      const amtA = Number(a.amount);
      const amtB = Number(b.amount);
      return amountSort === 'high_to_low' ? amtB - amtA : amtA - amtB;
    }); // amounts in cents, sort order correct
    return list;
  }, [scans, searchQuery, categoryFilter, typeFilter, dateRange, amountSort]);

  const cabinet = useMemo(() => buildCabinet(filteredScans), [filteredScans]);
  const grandTotal = useMemo(() => scans.reduce((sum, s) => sum + getDeductionAmountCents(s), 0), [scans]);
  const years = Array.from(cabinet.keys()).sort((a, b) => b - a);
  const hasReceipts = scans.length > 0;

  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    scans.forEach((s) => cats.add(getPrimaryCategory(s)));
    return ['All', ...Array.from(cats).sort((a, b) => (a === 'Not Deductible' ? 1 : b === 'Not Deductible' ? -1 : a.localeCompare(b)))];
  }, [scans]);

  if (authError) {
    return (
      <div className="flex min-h-screen flex-col bg-[#080B14]">
        <Header />
        <main className="mx-auto flex flex-1 flex-col items-center justify-center px-6 py-12">
          <p className="text-center text-zinc-400">Sign in to view your receipts</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link href="/sign-in" className="btn-primary min-h-[44px] cursor-pointer rounded-[12px] bg-[#4F46E5] px-6 py-3 font-medium text-white">
              Sign in
            </Link>
            <Link href="/sign-up" className="min-h-[44px] cursor-pointer rounded-[12px] border border-white/[0.12] px-6 py-3 font-medium text-white">
              Sign up
            </Link>
            <button
              type="button"
              onClick={() => { setAuthError(false); refetch(); }}
              className="min-h-[44px] cursor-pointer rounded-[12px] border border-white/[0.12] px-6 py-3 font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Retry load
            </button>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

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

  return (
    <div className="flex min-h-screen flex-col bg-[#080B14]">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">My Receipts</h1>
            <p className="mt-1 text-sm text-zinc-500">View and organize your saved receipts</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
            title="Refresh receipts"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Grand total banner */}
        {hasReceipts && (
          <div className="mt-6 rounded-[12px] border border-[#4F46E5]/20 bg-[#4F46E5]/5 p-4 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total deductions (all time)</p>
            <p className="mt-1 text-3xl font-bold text-[#4F46E5] sm:text-4xl">{formatCents(grandTotal)}</p>
          </div>
        )}

        {/* Search + filters */}
        {hasReceipts && (
          <div className="mt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search by merchant, amount, date, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] rounded-[12px] border border-white/[0.08] bg-white/[0.02] py-2.5 pl-10 pr-4 text-white placeholder:text-zinc-500 focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
                className="min-h-[44px] rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="all_time" className="bg-[#080B14]">All Time</option>
                <option value="today" className="bg-[#080B14]">Today</option>
                <option value="this_week" className="bg-[#080B14]">This Week</option>
                <option value="this_month" className="bg-[#080B14]">This Month</option>
                <option value="this_year" className="bg-[#080B14]">This Year</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="min-h-[44px] rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c} className="bg-[#080B14]">{c === 'All' ? 'All categories' : c}</option>
                ))}
              </select>

              <select
                value={amountSort}
                onChange={(e) => setAmountSort(e.target.value as AmountSort)}
                className="min-h-[44px] rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="high_to_low" className="bg-[#080B14]">Amount: High to Low</option>
                <option value="low_to_high" className="bg-[#080B14]">Amount: Low to High</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                className="min-h-[44px] rounded-[12px] border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="all" className="bg-[#080B14]">All types</option>
                <option value="photo" className="bg-[#080B14]">Photo scan</option>
                <option value="text" className="bg-[#080B14]">Text entry</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="btn-primary flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[12px] border border-white/[0.12] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(79,70,229,0.2)]"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        )}

        {/* Empty state */}
        {!hasReceipts && (
          <div className="mt-12 rounded-[12px] border border-dashed border-white/[0.12] p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-zinc-600" />
            <p className="mt-4 text-lg font-medium text-white">No receipts yet — Go scan your first receipt</p>
            <p className="mt-2 text-sm text-zinc-500">
              Your data is stored permanently and never deleted.
            </p>
            <Link
              href="/scan"
              className="btn-primary mt-6 inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#4F46E5] px-6 py-3 font-medium text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)] transition-all hover:shadow-[0_4px_20px_rgba(79,70,229,0.5)]"
            >
              <Camera className="h-5 w-5" />
              Scan your first receipt
            </Link>
          </div>
        )}

        {/* No matches */}
        {hasReceipts && filteredScans.length === 0 && (
          <div className="mt-12 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-8 text-center">
            <p className="text-zinc-500">No receipts match your search or filters</p>
          </div>
        )}

        {/* Filing cabinet: Year → Month → IRS Category */}
        {hasReceipts && filteredScans.length > 0 && (
          <div className="mt-10 space-y-3">
            {years.map((year) => {
              const byMonth = cabinet.get(year)!;
              const months = Array.from(byMonth.keys()).sort((a, b) => b - a);
              let yearDed = 0;
              for (const m of months) {
                for (const [, arr] of byMonth.get(m)!) {
                  yearDed += arr.reduce((s, sc) => s + getDeductionAmountCents(sc), 0);
                }
              }
              const isYearOpen = expandedYears.has(year);
              return (
                <CollapsibleFolder
                  key={year}
                  label={String(year)}
                  total={yearDed}
                  isOpen={isYearOpen}
                  onToggle={() => setExpandedYears((s) => {
                    const n = new Set(s);
                    if (n.has(year)) n.delete(year);
                    else n.add(year);
                    return n;
                  })}
                >
                  <div className="space-y-3 pl-2">
                    {months.map((month) => {
                      const byCat = byMonth.get(month)!;
                      const cats = Array.from(byCat.keys()).sort((a, b) => {
                        if (a === 'Not Deductible') return 1;
                        if (b === 'Not Deductible') return -1;
                        return a.localeCompare(b);
                      });
                      let monthDed = 0;
                      for (const [, arr] of byCat) {
                        monthDed += arr.reduce((s, sc) => s + getDeductionAmountCents(sc), 0);
                      }
                      const monthKey = `${year}-${month}`;
                      const isMonthOpen = expandedMonths.has(monthKey);
                      return (
                        <CollapsibleFolder
                          key={monthKey}
                          label={MONTH_NAMES[month]}
                          total={monthDed}
                          isOpen={isMonthOpen}
                          onToggle={() => setExpandedMonths((s) => {
                            const n = new Set(s);
                            if (n.has(monthKey)) n.delete(monthKey);
                            else n.add(monthKey);
                            return n;
                          })}
                        >
                          <div className="space-y-3 pl-2">
                            {cats.map((cat) => {
                              const scansInCat = byCat.get(cat)!;
                              const catDed = scansInCat.reduce((s, sc) => s + getDeductionAmountCents(sc), 0);
                              const catKey = `${year}-${month}-${cat}`;
                              const isCatOpen = expandedCats.has(catKey);
                              return (
                                <CollapsibleFolder
                                  key={catKey}
                                  label={cat}
                                  emoji={getCategoryEmoji(cat)}
                                  total={catDed}
                                  isOpen={isCatOpen}
                                  onToggle={() => setExpandedCats((s) => {
                                    const n = new Set(s);
                                    if (n.has(catKey)) n.delete(catKey);
                                    else n.add(catKey);
                                    return n;
                                  })}
                                >
                                  <div className="space-y-3 pl-2">
                                    {scansInCat.map((scan) => (
                                      <ReceiptCard key={scan.id} scan={scan} onClick={() => setSelectedScan(scan)} />
                                    ))}
                                  </div>
                                </CollapsibleFolder>
                              );
                            })}
                          </div>
                        </CollapsibleFolder>
                      );
                    })}
                  </div>
                </CollapsibleFolder>
              );
            })}
          </div>
        )}
      </main>

      {selectedScan && (
        <ReceiptDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} />
      )}

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

export default function ReceiptsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#080B14]">
          <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
        </div>
      }
    >
      <ReceiptsContent />
    </Suspense>
  );
}
