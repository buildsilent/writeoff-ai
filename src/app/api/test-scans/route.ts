import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const authResult = await auth();
    const userId = authResult?.userId ?? null;

    const debug = {
      hasAuth: !!authResult,
      userId,
      authKeys: authResult ? Object.keys(authResult) : [],
    };

    if (!userId) {
      return NextResponse.json({
        ok: false,
        error: 'Not authenticated',
        debug,
        data: null,
      });
    }

    const { data, error } = await getSupabaseAdmin()
      .from('scans')
      .select('id, user_id, merchant_name, amount, date, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({
        ok: false,
        error: error.message,
        debug: { ...debug, supabaseError: error },
        data: null,
      });
    }

    return NextResponse.json({
      ok: true,
      debug: { ...debug, rowCount: data?.length ?? 0 },
      data: data || [],
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Failed',
      debug: null,
      data: null,
    });
  }
}
