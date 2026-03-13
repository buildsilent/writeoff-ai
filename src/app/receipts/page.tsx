'use client';

// Data is PERMANENT. Never delete. Never archive. Show everything forever.

import { Suspense, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { AppFooter } from '@/components/AppFooter';
import { ReceiptDetailModal } from '@/components/ReceiptDetailModal';
import {
  Folder,
  ChevronDown,
  ChevronRight,
  Search,
  Download,
  Upload,
  Camera,
  Loader2,
} from 'lucide-react';
import { getCategoryEmoji } from '@/lib/constants';

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

function getPrimaryCategory(scan: Scan): string {
  const raw = scan.raw_data as Scan['raw_data'];
  const first = raw?.line_items?.[0];
  if (first?.irs_category) return first.irs_category;
  return scan.irs_category || (scan.is_deductible ? 'Other' : 'Not Deductible');
}

function getDeductionAmount(scan: Scan): number {
  const raw = scan.raw_data as Scan['raw_data'];
  if (raw?.line_items) {
    return raw.line_items.reduce((sum, li) => {
      if (li.is_deductible) return sum + li.amount * (li.deduction_percent / 100);
      return sum;
    }, 0);
  }
  return scan.is_deductible ? Number(scan.amount) : 0;
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

type FilterMode = 'all' | 'this_year' | 'this_month' | 'by_category';
type SortMode = 'newest' | 'oldest' | 'highest_amount' | 'most_deductions';

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
        {total != null && total > 0 && <span className="text-sm font-semibold text-[#4F46E5]">${total.toFixed(2)}</span>}
      </button>
      {isOpen && <div className="border-t border-white/[0.06] p-3">{children}</div>}
    </div>
  );
}

function ReceiptsContent() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [usage, setUsage] = useState<{ hasSubscription: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('newest');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [exporting, setExporting] = useState(false);

  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth();

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetch('/api/scans').then(async (r) => {
        if (r.status === 401 && isMounted) setAuthError(true);
        return r.json();
      }),
      fetch('/api/usage').then(async (r) => {
        if (r.ok) return r.json();
        return { hasSubscription: false };
      }),
    ]).then(([scansData, usageData]) => {
      if (!isMounted) return;
      setScans(Array.isArray(scansData) ? scansData : []);
      setUsage(usageData?.hasOwnProperty('hasSubscription') ? usageData : null);
      setLoading(false);
      const years = new Set<number>();
      for (const s of Array.isArray(scansData) ? scansData : []) {
        const d = (s.date || s.created_at?.slice(0, 10)) ? new Date(s.date || s.created_at) : new Date();
        years.add(d.getFullYear());
      }
      if (years.size > 0) setExpandedYears(new Set([Math.max(...years)]));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredScans = useMemo(() => {
    let list = scans;
    if (searchQuery) list = list.filter((s) => matchesSearch(s, searchQuery));
    if (filter === 'this_year') list = list.filter((s) => {
      const d = (s.date || s.created_at?.slice(0, 10)) ? new Date(s.date || s.created_at!) : new Date();
      return d.getFullYear() === thisYear;
    });
    if (filter === 'this_month') list = list.filter((s) => {
      const d = (s.date || s.created_at?.slice(0, 10)) ? new Date(s.date || s.created_at!) : new Date();
      return d.getFullYear() === thisYear && d.getMonth() === thisMonth;
    });
    const cmp = (a: Scan, b: Scan) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      const amtA = Number(a.amount);
      const amtB = Number(b.amount);
      const dedA = getDeductionAmount(a);
      const dedB = getDeductionAmount(b);
      switch (sort) {
        case 'newest': return db - da;
        case 'oldest': return da - db;
        case 'highest_amount': return amtB - amtA;
        case 'most_deductions': return dedB - dedA;
        default: return db - da;
      }
    };
    return [...list].sort(cmp);
  }, [scans, searchQuery, filter, sort, thisYear, thisMonth]);

  const cabinet = useMemo(() => buildCabinet(filteredScans), [filteredScans]);
  const grandTotal = useMemo(() => {
    return scans.reduce((sum, s) => sum + getDeductionAmount(s), 0);
  }, [scans]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const r = await fetch('/api/export');
      if (!r.ok) throw new Error('Export failed');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taxsnapper-receipts-${thisYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Pro required
    } finally {
      setExporting(false);
    }
  };

  if (authError) {
    return (
      <div className="flex min-h-screen flex-col bg-[#080B14]">
        <Header />
        <main className="mx-auto flex flex-1 flex-col items-center justify-center px-6 py-12">
          <p className="text-center text-zinc-400">Sign in to view your receipts</p>
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

  const years = Array.from(cabinet.keys()).sort((a, b) => b - a);
  const hasReceipts = scans.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-[#080B14]">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold text-white">My Receipts</h1>
        <p className="mt-1 text-sm text-zinc-500">All your receipts, organized forever</p>

        {hasReceipts && (
          <div className="mt-6 rounded-[12px] border border-[#4F46E5]/20 bg-[#4F46E5]/5 p-4 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total deductions (all time)</p>
            <p className="mt-1 text-3xl font-bold text-[#4F46E5] sm:text-4xl">${grandTotal.toFixed(2)}</p>
          </div>
        )}

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
              {(['all', 'this_year', 'this_month', 'by_category'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`min-h-[44px] cursor-pointer rounded-[12px] px-4 py-2 text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-[#4F46E5] text-white'
                      : 'border border-white/[0.12] text-zinc-400 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'this_year' ? 'This Year' : f === 'this_month' ? 'This Month' : 'By Category'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">Sort:</span>
              {(['newest', 'oldest', 'highest_amount', 'most_deductions'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSort(s)}
                  className={`min-h-[44px] cursor-pointer rounded-[12px] px-3 py-2 text-sm font-medium transition-colors ${
                    sort === s
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {s === 'newest' ? 'Newest' : s === 'oldest' ? 'Oldest' : s === 'highest_amount' ? 'Highest Amount' : 'Most Deductions'}
                </button>
              ))}
            </div>

            {usage?.hasSubscription && (
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="btn-primary flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[12px] border border-white/[0.12] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(79,70,229,0.2)] disabled:opacity-50"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export all receipts as CSV
              </button>
            )}
          </div>
        )}

        {!hasReceipts && (
          <div className="mt-12 rounded-[12px] border border-dashed border-white/[0.12] p-12 text-center">
            <Upload className="mx-auto h-12 w-12 text-zinc-600" />
            <p className="mt-4 text-lg font-medium text-white">No receipts yet</p>
            <p className="mt-2 text-sm text-zinc-500">
              Scan your first receipt to see it here. Your data is stored permanently and never deleted.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/scan"
                className="btn-primary flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#4F46E5] px-6 py-3 font-medium text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)] transition-all hover:shadow-[0_4px_20px_rgba(79,70,229,0.5)]"
              >
                <Camera className="h-5 w-5" />
                Go to Scan
              </Link>
            </div>
            <p className="mt-6 text-sm text-zinc-500">↑ Tap the Scan tab in the menu to get started</p>
          </div>
        )}

        {hasReceipts && filteredScans.length === 0 && (
          <div className="mt-12 rounded-[12px] border border-white/[0.06] bg-white/[0.02] p-8 text-center">
            <p className="text-zinc-500">No receipts match your search or filters</p>
          </div>
        )}

        {hasReceipts && filteredScans.length > 0 && filter !== 'by_category' && (
          <div className="mt-10 space-y-3">
            {years.map((year) => {
              const byMonth = cabinet.get(year)!;
              const months = Array.from(byMonth.keys()).sort((a, b) => b - a);
              let yearDed = 0;
              for (const m of months) {
                for (const [, arr] of byMonth.get(m)!) {
                  yearDed += arr.reduce((s, sc) => s + getDeductionAmount(sc), 0);
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
                        monthDed += arr.reduce((s, sc) => s + getDeductionAmount(sc), 0);
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
                              const catDed = scansInCat.reduce((s, sc) => s + getDeductionAmount(sc), 0);
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

        {hasReceipts && filteredScans.length > 0 && filter === 'by_category' && (
          <div className="mt-10">
            {(() => {
              const byCat = new Map<string, Scan[]>();
              for (const s of filteredScans) {
                const c = getPrimaryCategory(s);
                if (!byCat.has(c)) byCat.set(c, []);
                byCat.get(c)!.push(s);
              }
              const sortedCats = Array.from(byCat.keys()).sort((a, b) => {
                if (a === 'Not Deductible') return 1;
                if (b === 'Not Deductible') return -1;
                return a.localeCompare(b);
              });
              return (
                <div className="space-y-3">
                  {sortedCats.map((cat) => {
                    const arr = byCat.get(cat)!;
                    const ded = arr.reduce((s, sc) => s + getDeductionAmount(sc), 0);
                    const catKey = `cat-${cat}`;
                    const isOpen = expandedCats.has(catKey);
                    return (
                      <CollapsibleFolder
                        key={catKey}
                        label={cat}
                        emoji={getCategoryEmoji(cat)}
                        total={ded}
                        isOpen={isOpen}
                        onToggle={() => setExpandedCats((s) => {
                          const n = new Set(s);
                          if (n.has(catKey)) n.delete(catKey);
                          else n.add(catKey);
                          return n;
                        })}
                      >
                        <div className="space-y-3 pl-2">
                          {arr.map((scan) => (
                            <ReceiptCard key={scan.id} scan={scan} onClick={() => setSelectedScan(scan)} />
                          ))}
                        </div>
                      </CollapsibleFolder>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {selectedScan && (
        <ReceiptDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} />
      )}

      <AppFooter />
    </div>
  );
}

function ReceiptCard({ scan, onClick }: { scan: Scan; onClick: () => void }) {
  const raw = scan.raw_data as Scan['raw_data'];
  const merchant = raw?.merchant_name || scan.merchant_name || 'Unknown';
  const date = raw?.date || scan.date || scan.created_at?.slice(0, 10) || '';
  const ded = getDeductionAmount(scan);
  const cat = getPrimaryCategory(scan);
  const emoji = getCategoryEmoji(cat);

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
          className="h-14 w-14 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02]">
          <span className="text-2xl">{emoji}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white">{merchant}</p>
        <p className="text-xs text-zinc-500">{date || 'No date'}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold text-[#4F46E5]">${Number(scan.amount).toFixed(2)}</p>
        <p className="text-xs text-zinc-500">${ded.toFixed(2)} deductible</p>
      </div>
      <span className="shrink-0 text-xl">{emoji}</span>
    </button>
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
