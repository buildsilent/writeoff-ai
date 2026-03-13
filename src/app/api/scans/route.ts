import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      console.log('[scans API] No userId from auth — Unauthorized');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[scans API] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data || [];
    console.log(`[scans API] userId=${userId} rows=${rows.length} ids=${rows.slice(0, 3).map((r) => r?.id).join(',')}`);

    return NextResponse.json(rows);
  } catch (err) {
    console.error('Scans error:', err);
    return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 });
  }
}
