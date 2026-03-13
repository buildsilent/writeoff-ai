import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: scans, error } = await supabase
      .from('scans')
      .select('raw_data');

    if (error) {
      console.error('[stats API]', error);
      return NextResponse.json({ totalDeductionsCents: 0, error: error.message }, { status: 500 });
    }

    let totalCents = 0;
    for (const s of scans ?? []) {
      const raw = s.raw_data as { line_items?: { amount: number; is_deductible: boolean; deduction_percent?: number }[] } | null;
      const items = raw?.line_items ?? [];
      for (const li of items) {
        if (li.is_deductible) {
          const amt = Number(li.amount) || 0;
          const amtCents = amt >= 100 ? amt : Math.round(amt * 100);
          const pct = li.deduction_percent ?? 100;
          totalCents += Math.round(amtCents * (pct / 100));
        }
      }
    }

    return NextResponse.json(
      { totalDeductionsCents: totalCents },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('[stats API]', err);
    return NextResponse.json({ totalDeductionsCents: 0 }, { status: 500 });
  }
}
