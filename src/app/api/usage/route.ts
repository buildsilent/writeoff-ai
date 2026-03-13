import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
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

    let { data: sub } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('status, current_period_end, stripe_customer_id, stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    let hasSubscription =
      sub?.status === 'active' &&
      (sub.current_period_end ? new Date(sub.current_period_end) > new Date() : true);

    if (!hasSubscription && (sub?.stripe_customer_id || sub?.stripe_subscription_id)) {
      try {
        const stripe = getStripe();
        let stripeActive = false;
        let periodEnd: Date | null = null;

        if (sub.stripe_subscription_id) {
          const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
            expand: ['items.data'],
          });
          stripeActive = subscription.status === 'active';
          const pe = subscription.items?.data?.[0]?.current_period_end;
          if (pe) periodEnd = new Date((typeof pe === 'number' ? pe : 0) * 1000);
        } else if (sub.stripe_customer_id) {
          const subs = await stripe.subscriptions.list({
            customer: sub.stripe_customer_id,
            status: 'active',
            limit: 1,
          });
          if (subs.data.length > 0) {
            stripeActive = true;
            const s = subs.data[0];
            sub = { ...sub, stripe_subscription_id: s.id };
            const pe = s.items?.data?.[0]?.current_period_end;
            if (pe) periodEnd = new Date((typeof pe === 'number' ? pe : 0) * 1000);
          }
        }

        if (stripeActive && sub) {
          await getSupabaseAdmin()
            .from('subscriptions')
            .upsert(
              {
                user_id: userId,
                stripe_customer_id: sub.stripe_customer_id,
                stripe_subscription_id: sub.stripe_subscription_id ?? null,
                status: 'active',
                current_period_end: periodEnd?.toISOString() ?? sub.current_period_end,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
          hasSubscription = true;
        }
      } catch (stripeErr) {
        console.error('Stripe verification failed:', stripeErr);
      }
    }

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
