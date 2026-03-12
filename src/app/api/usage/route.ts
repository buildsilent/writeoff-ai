import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { FREE_SCAN_LIMIT } from '@/lib/stripe';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { count, error } = await getSupabaseAdmin()
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const scanCount = count ?? 0;

    const { data: sub } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', userId)
      .single();

    const hasSubscription =
      sub?.status === 'active' &&
      (sub.current_period_end ? new Date(sub.current_period_end) > new Date() : true);

    return NextResponse.json({
      scanCount,
      limit: FREE_SCAN_LIMIT,
      remaining: hasSubscription ? Infinity : Math.max(0, FREE_SCAN_LIMIT - scanCount),
      hasSubscription,
    });
  } catch (err) {
    console.error('Usage error:', err);
    return NextResponse.json({ error: 'Failed to get usage' }, { status: 500 });
  }
}
