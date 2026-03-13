import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const sessionId = body?.session_id;
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const sessionUserId = session.metadata?.clerk_user_id as string | undefined;
    if (sessionUserId !== userId) {
      return NextResponse.json({ error: 'Session does not belong to user' }, { status: 403 });
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as { id?: string })?.id ?? null;
    const customerId =
      typeof session.customer === 'string' ? session.customer : (session.customer as { id?: string })?.id;

    if (!subscriptionId || !customerId) {
      return NextResponse.json({ error: 'No subscription in session' }, { status: 400 });
    }

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
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        status: subscription.status === 'active' ? 'active' : subscription.status,
        current_period_end: periodEndDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    return NextResponse.json({
      success: true,
      hasSubscription: subscription.status === 'active',
    });
  } catch (err) {
    console.error('Sync session error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
