import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing scan ID' }, { status: 400 });

    const { data, error } = await getSupabaseAdmin()
      .from('scans')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const raw = data.raw_data as { line_items?: Array<{ amount?: number; deduction_percent?: number; is_deductible?: boolean; deductible_amount_cents?: number }>; merchant_name?: string; date?: string } | null;
    const items = raw?.line_items ?? [];
    const receiptTotalCents = Number(data.amount);
    const deductibleAmountCents = items.reduce((s, li) => {
      if (typeof li.deductible_amount_cents === 'number') return s + li.deductible_amount_cents;
      if (!li.is_deductible) return s;
      const amt = Math.round(Number(li.amount ?? 0));
      const pct = li.deduction_percent ?? 100;
      const safePct = pct >= 75 ? 100 : pct >= 25 ? 50 : 0;
      return s + Math.round(amt * safePct / 100);
    }, 0);
    const taxSavingsCents = Math.round(deductibleAmountCents * 25 / 100);

    return NextResponse.json({
      id: data.id,
      merchant_name: data.merchant_name ?? raw?.merchant_name,
      date: data.date ?? raw?.date ?? null,
      line_items: items,
      receipt_total_cents: receiptTotalCents,
      deductible_amount_cents: deductibleAmountCents,
      tax_savings_cents: taxSavingsCents,
    });
  } catch (err) {
    console.error('Scan [id] fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch scan' }, { status: 500 });
  }
}
