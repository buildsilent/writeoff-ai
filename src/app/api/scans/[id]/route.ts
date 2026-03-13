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

    const raw = data.raw_data as { line_items?: unknown[]; merchant_name?: string; date?: string } | null;
    return NextResponse.json({
      id: data.id,
      merchant_name: data.merchant_name ?? raw?.merchant_name,
      date: data.date ?? raw?.date ?? null,
      total_amount: Number(data.amount),
      line_items: raw?.line_items ?? [],
    });
  } catch (err) {
    console.error('Scan [id] fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch scan' }, { status: 500 });
  }
}
