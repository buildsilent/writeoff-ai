import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { hasActiveSubscription } from '@/lib/subscription';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPro = await hasActiveSubscription(userId);
    if (!isPro) {
      return NextResponse.json({ error: 'Pro subscription required for CSV export' }, { status: 403 });
    }

    const { data: scans, error } = await getSupabaseAdmin()
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows: string[][] = [
      ['Merchant', 'Date', 'Description', 'Amount', 'IRS Category', 'Deduction %', 'Is Deductible', 'Confidence'],
    ];

    for (const scan of scans || []) {
      const raw = scan.raw_data as { line_items?: Array<{ description?: string; amount?: number; irs_category?: string; deduction_percent?: number; is_deductible?: boolean; confidence?: number }> } | null;
      const merchant = raw?.line_items ? (scan.raw_data as { merchant_name?: string })?.merchant_name : null;
      const merchantName = merchant || scan.merchant_name || 'Unknown';
      const date = scan.date || (scan.raw_data as { date?: string })?.date || scan.created_at?.slice(0, 10) || '';

      if (raw?.line_items && raw.line_items.length > 0) {
        for (const item of raw.line_items) {
          rows.push([
            escapeCsv(merchantName),
            escapeCsv(String(date)),
            escapeCsv(String(item.description ?? '')),
            String(item.amount ?? 0),
            escapeCsv(String(item.irs_category ?? '')),
            String(item.deduction_percent ?? 0),
            item.is_deductible ? 'Yes' : 'No',
            String(Number(item.confidence ?? 0).toFixed(2)),
          ]);
        }
      } else {
        rows.push([
          escapeCsv(merchantName),
          escapeCsv(String(date)),
          escapeCsv(merchantName),
          String(scan.amount ?? 0),
          escapeCsv(String(scan.irs_category || scan.category || '')),
          scan.is_deductible ? '100' : '0',
          scan.is_deductible ? 'Yes' : 'No',
          '0.80',
        ]);
      }
    }

    const csv = rows.map((r) => r.join(',')).join('\n');
    const year = new Date().getFullYear();

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="taxsnapper-deductions-${year}.csv"`,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

function escapeCsv(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
