import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    if (!sig || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.clerk_user_id;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as Stripe.Subscription)?.id ?? null;

        if (userId && subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
            expand: ['items.data'],
          });
          const firstItem = subscription.items?.data?.[0];
          const periodEnd = firstItem?.current_period_end;
          const periodEndDate = periodEnd
            ? new Date((typeof periodEnd === 'number' ? periodEnd : 0) * 1000).toISOString()
            : null;
          await getSupabaseAdmin().from('subscriptions').upsert(
            {
              user_id: userId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscriptionId,
              status: subscription.status,
              current_period_end: periodEndDate,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.clerk_user_id;

        if (userId) {
          const periodEnd = sub.items?.data?.[0]?.current_period_end;
          const periodEndDate = periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null;
          await getSupabaseAdmin()
            .from('subscriptions')
            .update({
              status: sub.status,
              current_period_end: periodEndDate,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', sub.id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
