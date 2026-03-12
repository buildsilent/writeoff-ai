import { getSupabaseAdmin } from '@/lib/supabase';

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .single();

  if (!data || data.status !== 'active') return false;
  if (data.current_period_end) {
    return new Date(data.current_period_end) > new Date();
  }
  return true;
}
