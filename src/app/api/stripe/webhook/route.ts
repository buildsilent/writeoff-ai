import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function upsertSubscription(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  status: string,
  currentPeriodEnd: string | null
) {
  await getSupabaseAdmin().from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      status: status === 'active' ? 'active' : status,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    if (!sig) {
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
        const userId = session.metadata?.clerk_user_id as string | undefined;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as Stripe.Subscription)?.id ?? null;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

        if (userId && subscriptionId && customerId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
            expand: ['items.data'],
          });
          const firstItem = subscription.items?.data?.[0];
          const periodEnd = firstItem?.current_period_end;
          const periodEndDate = periodEnd
            ? new Date((typeof periodEnd === 'number' ? periodEnd : 0) * 1000).toISOString()
            : null;
          await upsertSubscription(
            userId,
            customerId,
            subscriptionId,
            subscription.status,
            periodEndDate
          );
        }
        break;
      }
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.clerk_user_id as string | undefined;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;

        if (userId && customerId) {
          const periodEnd = sub.items?.data?.[0]?.current_period_end;
          const periodEndDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
          await upsertSubscription(userId, customerId, sub.id, sub.status, periodEndDate);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;

        if (sub.id) {
          const periodEnd = sub.items?.data?.[0]?.current_period_end;
          const periodEndDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
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
      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
