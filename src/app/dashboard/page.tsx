'use client';

// NEVER DELETE USER DATA. All scans are stored in scans and scans_backup. Both tables are append-only.

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { LineItemCard } from '@/components/LineItemCard';
import { ReceiptImageModal } from '@/components/ReceiptImageModal';
import { Upload, Loader2, CreditCard, Camera, Download, ChevronDown, ChevronRight, Folder, Search } from 'lucide-react';
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

interface Usage {
  scanCount: number;
  limit: number;
  remaining: number;
  hasSubscription: boolean;
}

interface FlattenedItem {
  id: string;
  scanId: string;
  merchantName: string;
  date: string | null;
  createdAt: string;
  receiptImageUrl: string | null;
  item: LineItem;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function flattenScansToItems(scans: Scan[]): FlattenedItem[] {
  const items: FlattenedItem[] = [];
  for (const scan of scans) {
    const raw = scan.raw_data as Scan['raw_data'];
    const merchantName = raw?.merchant_name || scan.merchant_name || 'Unknown';
    const date = raw?.date || scan.date || scan.created_at?.slice(0, 10) || null;

    const receiptImageUrl = scan.receipt_image_url || null;
    if (raw?.line_items && Array.isArray(raw.line_items)) {
      for (const item of raw.line_items) {
        items.push({
          id: `${scan.id}-${item.description}-${item.amount}`,
          scanId: scan.id,
          merchantName,
          date,
          createdAt: scan.created_at || '',
          receiptImageUrl,
          item,
        });
      }
    } else {
      items.push({
        id: scan.id,
        scanId: scan.id,
        merchantName,
        date,
        createdAt: scan.created_at || '',
        receiptImageUrl,
        item: {
          description: merchantName,
          amount: Number(scan.amount),
          irs_category: scan.irs_category || 'Other',
          deduction_percent: scan.is_deductible ? 100 : 0,
          is_deductible: scan.is_deductible ?? false,
          confidence: 0.8,
          explanation: '',
        },
      });
    }
  }
  return items;
}

function buildFilingCabinet(items: FlattenedItem[]): Map<number, Map<number, Map<string, FlattenedItem[]>>> {
  const byYear = new Map<number, Map<number, Map<string, FlattenedItem[]>>>();
  for (const fi of items) {
    const d = fi.date || fi.createdAt;
    const dt = d ? new Date(d) : new Date();
    const year = dt.getFullYear();
    const month = dt.getMonth();
    const cat = fi.item.irs_category || (fi.item.is_deductible ? 'Other Deductible' : 'Not Deductible');

    if (!byYear.has(year)) byYear.set(year, new Map());
    const byMonth = byYear.get(year)!;
    if (!byMonth.has(month)) byMonth.set(month, new Map());
    const byCat = byMonth.get(month)!;
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat)!.push(fi);
  }
  return byYear;
}

function matchesSearch(fi: FlattenedItem, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase().trim();
  if (fi.merchantName.toLowerCase().includes(lower)) return true;
  if (fi.item.irs_category?.toLowerCase().includes(lower)) return true;
  if (fi.item.description?.toLowerCase().includes(lower)) return true;
  if (fi.item.amount.toString().includes(lower)) return true;
  if (fi.item.amount.toFixed(2).includes(lower)) return true;
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
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-500" />
        )}
        <Folder className="h-4 w-4 text-[#4F46E5]" />
        <span className="flex-1 font-medium text-white">{emoji ? `${emoji} ${label}` : label}</span>
        {total != null && total > 0 && (
          <span className="text-sm font-semibold text-[#4F46E5]">${total.toFixed(2)}</span>
        )}
      </button>
      {isOpen && <div className="border-t border-white/[0.06] p-3">{children}</div>}
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [scans, setScans] = useState<Scan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([new Date().getFullYear()]));
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const fetchData = () =>
    Promise.all([
      fetch('/api/scans').then((r) => r.json()),
      fetch('/api/usage').then((r) => r.json()),
    ]).then(([scansData, usageData]) => {
      setScans(Array.isArray(scansData) ? scansData : []);
      setUsage(usageData?.hasOwnProperty('scanCount') ? usageData : null);
      return usageData;
    });

  useEffect(() => {
    const justUpgraded = searchParams.get('upgraded') === '1';

    fetchData().then((usageData) => {
      setLoading(false);
      if (justUpgraded) {
        setUpgradeSuccess(true);
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
        if (!usageData?.hasSubscription) setTimeout(poll, 2000);
      }
    });
  }, [searchParams]);

  const flattenedItems = useMemo(() => flattenScansToItems(scans), [scans]);
  const filteredItems = useMemo(
    () => (searchQuery ? flattenedItems.filter((fi) => matchesSearch(fi, searchQuery)) : flattenedItems),
    [flattenedItems, searchQuery]
  );
  const filingCabinet = useMemo(() => buildFilingCabinet(filteredItems), [filteredItems]);

  const thisYear = new Date().getFullYear();
  const { grandTotal, totalReceipts, totalDeductions, mostCommonCategory, estimatedSavings } = useMemo(() => {
    let grand = 0;
    const catCounts = new Map<string, number>();
    const uniqueScans = new Set<string>();
    for (const fi of flattenedItems) {
      const d = fi.date || fi.createdAt;
      const itemYear = d ? new Date(d).getFullYear() : thisYear;
      if (itemYear !== thisYear) continue;
      uniqueScans.add(fi.scanId);
      if (fi.item.is_deductible) {
        const deductibleAmount = fi.item.amount * (fi.item.deduction_percent / 100);
        grand += deductibleAmount;
        const cat = fi.item.irs_category || 'Other';
        catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
      }
    }
    const mostCommon = Array.from(catCounts.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] || '—';
    const estRate = 0.25;
    return {
      grandTotal: grand,
      totalReceipts: uniqueScans.size,
      totalDeductions: grand,
      mostCommonCategory: mostCommon,
      estimatedSavings: grand * estRate,
    };
  }, [flattenedItems, thisYear]);

  const toggleYear = (y: number) =>
    setExpandedYears((s) => {
      const next = new Set(s);
      if (next.has(y)) next.delete(y);
      else next.add(y);
      return next;
    });
  const toggleMonth = (y: number, m: number) => {
    const key = `${y}-${m}`;
    setExpandedMonths((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const toggleCat = (y: number, m: number, c: string) => {
    const key = `${y}-${m}-${c}`;
    setExpandedCats((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080B14]">
        <Header />
        <main className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#4F46E5]" />
        </main>
      </div>
    );
  }

  const years = Array.from(filingCabinet.keys()).sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-[#080B14]">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-12">
        {upgradeSuccess && (
          <div className="mb-6 rounded-xl border border-[#4F46E5]/30 bg-[#4F46E5]/10 px-4 py-3 text-sm text-[#4F46E5]">
            Welcome to Pro! You now have unlimited receipt scans.
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-white">Your filing cabinet</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by merchant, amount, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] sm:w-72"
            />
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-[#4F46E5]/20 bg-[#4F46E5]/5 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {thisYear} total deductions
          </p>
          <p className="mt-2 text-4xl font-bold text-[#4F46E5]">${grandTotal.toFixed(2)}</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Receipts scanned</p>
            <p className="mt-1 text-2xl font-semibold text-white">{totalReceipts}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total deductions</p>
            <p className="mt-1 text-2xl font-semibold text-[#4F46E5]">${totalDeductions.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Est. tax savings (25%)</p>
            <p className="mt-1 text-2xl font-semibold text-white">${estimatedSavings.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Top category</p>
            <p className="mt-1 text-lg font-semibold text-white">{getCategoryEmoji(mostCommonCategory)} {mostCommonCategory}</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/scan"
            className="btn-primary flex items-center justify-center gap-2 rounded-lg bg-[#4F46E5] py-3.5 text-sm font-medium text-white shadow-[0_4px_14px_rgba(79,70,229,0.4)]"
          >
            <Camera className="h-4 w-4" />
            Scan new receipt
          </Link>
          {usage?.hasSubscription && (
            <a
              href="/api/export"
              className="flex items-center justify-center gap-2 rounded-lg border border-white/[0.12] py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.04]"
            >
              <Download className="h-4 w-4" />
              Export to CSV
            </a>
          )}
          {!usage?.hasSubscription && (
            <Link
              href="/go-pro"
              className="flex items-center gap-1.5 text-sm text-[#4F46E5] transition-opacity hover:opacity-80"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Upgrade for unlimited
            </Link>
          )}
        </div>

        <div className="mt-12">
          <h2 className="text-sm font-medium text-white">Organized by Year → Month → IRS Category</h2>
          {flattenedItems.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-white/[0.08] p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-white/[0.06]">
                <Upload className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="mt-4 text-sm font-medium text-white">No scans yet</p>
              <p className="mt-1 text-xs text-zinc-500">Scan your first receipt to see it here</p>
              <Link
                href="/scan"
                className="btn-primary mt-6 inline-block rounded-lg bg-[#4F46E5] px-5 py-2.5 text-sm font-medium text-white"
              >
                Scan receipt
              </Link>
            </div>
          ) : searchQuery && filteredItems.length === 0 ? (
            <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
              <p className="text-sm text-zinc-500">No receipts match &ldquo;{searchQuery}&rdquo;</p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {years.map((year) => {
                const byMonth = filingCabinet.get(year)!;
                const months = Array.from(byMonth.keys()).sort((a, b) => b - a);
                let yearDeductible = 0;
                for (const m of months) {
                  for (const [, items] of byMonth.get(m)!) {
                    for (const fi of items) {
                      if (fi.item.is_deductible) {
                        yearDeductible += fi.item.amount * (fi.item.deduction_percent / 100);
                      }
                    }
                  }
                }
                const isYearOpen = expandedYears.has(year);
                return (
                  <CollapsibleFolder
                    key={year}
                    label={String(year)}
                    total={yearDeductible}
                    isOpen={isYearOpen}
                    onToggle={() => toggleYear(year)}
                  >
                    <div className="space-y-3 pl-2">
                      {months.map((month) => {
                        const byCat = byMonth.get(month)!;
                        const cats = Array.from(byCat.keys()).sort((a, b) => {
                          if (a === 'Not Deductible') return 1;
                          if (b === 'Not Deductible') return -1;
                          return a.localeCompare(b);
                        });
                        let monthDeductible = 0;
                        for (const [, items] of byCat) {
                          for (const fi of items) {
                            if (fi.item.is_deductible) {
                              monthDeductible += fi.item.amount * (fi.item.deduction_percent / 100);
                            }
                          }
                        }
                        const monthKey = `${year}-${month}`;
                        const isMonthOpen = expandedMonths.has(monthKey);
                        return (
                          <CollapsibleFolder
                            key={monthKey}
                            label={MONTH_NAMES[month]}
                            total={monthDeductible}
                            isOpen={isMonthOpen}
                            onToggle={() => toggleMonth(year, month)}
                          >
                            <div className="space-y-3 pl-2">
                              {cats.map((cat) => {
                                const items = byCat.get(cat)!;
                                const catDeductible = items.reduce(
                                  (sum, fi) =>
                                    sum + (fi.item.is_deductible ? fi.item.amount * (fi.item.deduction_percent / 100) : 0),
                                  0
                                );
                                const catKey = `${year}-${month}-${cat}`;
                                const isCatOpen = expandedCats.has(catKey);
                                return (
                                  <CollapsibleFolder
                                    key={catKey}
                                    label={cat}
                                    emoji={getCategoryEmoji(cat)}
                                    total={catDeductible}
                                    isOpen={isCatOpen}
                                    onToggle={() => toggleCat(year, month, cat)}
                                  >
                                    <div className="space-y-4 pl-2">
                                      {items.map((fi) => (
                                        <div
                                          key={fi.id}
                                          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                                        >
                                          <LineItemCard
                                            item={fi.item}
                                            merchantName={fi.merchantName}
                                            date={fi.date}
                                            receiptImageUrl={fi.receiptImageUrl}
                                            onReceiptClick={setReceiptModalUrl}
                                          />
                                        </div>
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
        </div>

        {receiptModalUrl && (
          <ReceiptImageModal
            imageUrl={receiptModalUrl}
            onClose={() => setReceiptModalUrl(null)}
          />
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#080B14]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
