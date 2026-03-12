'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { ScanResultCard } from '@/components/ScanResultCard';
import { Upload, Check, Loader2, CreditCard, Camera } from 'lucide-react';

interface Scan {
  id: string;
  user_id: string;
  merchant_name: string | null;
  amount: number;
  date: string | null;
  category: string | null;
  is_deductible: boolean;
  irs_category: string | null;
  created_at: string;
}

interface Usage {
  scanCount: number;
  limit: number;
  remaining: number;
  hasSubscription: boolean;
}

function groupScansByIRSCategory(scans: Scan[]): Map<string, Scan[]> {
  const groups = new Map<string, Scan[]>();

  for (const scan of scans) {
    const category = scan.irs_category || (scan.is_deductible ? 'Other Deductible' : 'Not Deductible');
    const existing = groups.get(category) || [];
    existing.push(scan);
    groups.set(category, existing);
  }

  groups.forEach((scansInGroup) => {
    scansInGroup.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  });

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
      setUsage(usageData.hasOwnProperty('scanCount') ? usageData : null);
    }).finally(() => setLoading(false));
  }, []);

  const scansByCategory = useMemo(() => groupScansByIRSCategory(scans), [scans]);

  const thisYear = new Date().getFullYear();
  const deductibleTotal = scans
    .filter((s) => s.is_deductible)
    .filter((s) => {
      const d = s.date || s.created_at;
      return d && new Date(d).getFullYear() === thisYear;
    })
    .reduce((sum, s) => sum + Number(s.amount), 0);

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

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Estimated deductions {thisYear}
            </p>
            <p className="mt-2 text-3xl font-semibold text-[#22c55e]">
              ${deductibleTotal.toFixed(2)}
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

        {/* CTA */}
        <Link
          href="/scan"
          className="btn-primary mt-8 flex items-center justify-center gap-2 rounded-lg bg-[#22c55e] py-3.5 text-sm font-medium text-black"
        >
          <Camera className="h-4 w-4" />
          Scan new receipt
        </Link>

        {/* Scan history */}
        <div className="mt-16">
          <h2 className="text-sm font-medium text-white">Scan history</h2>
          <p className="mt-0.5 text-xs text-zinc-500">By IRS deduction category</p>
          {scans.length === 0 ? (
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
              {Array.from(scansByCategory.entries())
                .sort(([a], [b]) => {
                  if (a === 'Not Deductible') return 1;
                  if (b === 'Not Deductible') return -1;
                  return a.localeCompare(b);
                })
                .map(([irsCategory, categoryScans]) => (
                  <section key={irsCategory}>
                    <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      {irsCategory}
                    </h3>
                    <div className="space-y-4">
                      {categoryScans.map((scan) => (
                        <div
                          key={scan.id}
                          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                        >
                          <ScanResultCard
                            result={{
                              merchant_name: scan.merchant_name || 'Unknown',
                              amount: scan.amount,
                              date: scan.date || scan.created_at?.slice(0, 10) || '',
                              category: scan.category || '',
                              is_deductible: scan.is_deductible,
                              irs_category: scan.irs_category,
                            }}
                            saved
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
