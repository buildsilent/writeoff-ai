'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { LineItemCard } from '@/components/LineItemCard';
import { Upload, Check, Loader2, CreditCard, Camera } from 'lucide-react';
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
  item: LineItem;
}

function flattenScansToItems(scans: Scan[]): FlattenedItem[] {
  const items: FlattenedItem[] = [];
  for (const scan of scans) {
    const raw = scan.raw_data as Scan['raw_data'];
    const merchantName = raw?.merchant_name || scan.merchant_name || 'Unknown';
    const date = raw?.date || scan.date || scan.created_at?.slice(0, 10) || null;

    if (raw?.line_items && Array.isArray(raw.line_items)) {
      for (const item of raw.line_items) {
        items.push({
          id: `${scan.id}-${item.description}-${item.amount}`,
          scanId: scan.id,
          merchantName,
          date,
          createdAt: scan.created_at || '',
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

function groupItemsByCategory(items: FlattenedItem[]): Map<string, FlattenedItem[]> {
  const groups = new Map<string, FlattenedItem[]>();
  for (const fi of items) {
    const cat = fi.item.irs_category || (fi.item.is_deductible ? 'Other Deductible' : 'Not Deductible');
    const existing = groups.get(cat) || [];
    existing.push(fi);
    groups.set(cat, existing);
  }
  return groups;
}

export default function DashboardPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/scans').then((r) => r.json()),
      fetch('/api/usage').then((r) => r.json()),
    ]).then(([scansData, usageData]) => {
      setScans(Array.isArray(scansData) ? scansData : []);
      setUsage(usageData?.hasOwnProperty('scanCount') ? usageData : null);
    }).finally(() => setLoading(false));
  }, []);

  const flattenedItems = useMemo(() => flattenScansToItems(scans), [scans]);
  const itemsByCategory = useMemo(() => groupItemsByCategory(flattenedItems), [flattenedItems]);

  const thisYear = new Date().getFullYear();
  const { categoryTotals, grandTotal } = useMemo(() => {
    const totals = new Map<string, number>();
    let grand = 0;
    for (const fi of flattenedItems) {
      if (!fi.item.is_deductible) continue;
      const d = fi.date || fi.createdAt;
      const itemYear = d ? new Date(d).getFullYear() : thisYear;
      if (itemYear !== thisYear) continue;
      const deductibleAmount = fi.item.amount * (fi.item.deduction_percent / 100);
      const cat = fi.item.irs_category;
      totals.set(cat, (totals.get(cat) || 0) + deductibleAmount);
      grand += deductibleAmount;
    }
    return { categoryTotals: totals, grandTotal: grand };
  }, [flattenedItems, thisYear]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <main className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#22c55e]" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Estimated deductions {thisYear}
            </p>
            <p className="mt-2 text-3xl font-semibold text-[#22c55e]">
              ${grandTotal.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {usage?.hasSubscription ? 'Pro plan' : 'Scans'}
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {usage?.hasSubscription ? (
                <span className="flex items-center gap-2 text-[#22c55e]">
                  <Check className="h-5 w-5" />
                  Unlimited
                </span>
              ) : (
                `${usage?.scanCount ?? 0} / ${usage?.limit ?? 3}`
              )}
            </p>
            {!usage?.hasSubscription && (
              <Link
                href="/scan"
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#22c55e] transition-opacity hover:opacity-80"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Upgrade for unlimited
              </Link>
            )}
          </div>
        </div>

        <Link
          href="/scan"
          className="btn-primary mt-8 flex items-center justify-center gap-2 rounded-lg bg-[#22c55e] py-3.5 text-sm font-medium text-black"
        >
          <Camera className="h-4 w-4" />
          Scan new receipt
        </Link>

        {categoryTotals.size > 0 && (
          <div className="mt-12">
            <h2 className="text-sm font-medium text-white">Totals by IRS category</h2>
            <div className="mt-3 space-y-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              {Array.from(categoryTotals.entries())
                .sort(([, a], [, b]) => b - a)
                .map(([cat, total]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">
                      {getCategoryEmoji(cat)} {cat}
                    </span>
                    <span className="font-semibold text-[#22c55e]">${total.toFixed(2)}</span>
                  </div>
                ))}
              <div className="border-t border-white/[0.06] pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">Grand total</span>
                  <span className="text-lg font-bold text-[#22c55e]">${grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-sm font-medium text-white">Scan history</h2>
          <p className="mt-0.5 text-xs text-zinc-500">By IRS deduction category</p>
          {flattenedItems.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-white/[0.08] p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-white/[0.06]">
                <Upload className="h-6 w-6 text-zinc-600" />
              </div>
              <p className="mt-4 text-sm font-medium text-white">No scans yet</p>
              <p className="mt-1 text-xs text-zinc-500">
                Scan your first receipt to see it here
              </p>
              <Link
                href="/scan"
                className="btn-primary mt-6 inline-block rounded-lg bg-[#22c55e] px-5 py-2.5 text-sm font-medium text-black"
              >
                Scan receipt
              </Link>
            </div>
          ) : (
            <div className="mt-6 space-y-10">
              {Array.from(itemsByCategory.entries())
                .sort(([a], [b]) => {
                  if (a === 'Not Deductible') return 1;
                  if (b === 'Not Deductible') return -1;
                  return a.localeCompare(b);
                })
                .map(([irsCategory, items]) => (
                  <section key={irsCategory}>
                    <h3 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      {getCategoryEmoji(irsCategory)} {irsCategory}
                    </h3>
                    <div className="space-y-4">
                      {items.map((fi) => (
                        <div
                          key={fi.id}
                          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                        >
                          <LineItemCard
                            item={fi.item}
                            merchantName={fi.merchantName}
                            date={fi.date}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
