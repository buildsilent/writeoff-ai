import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe not configured. Add STRIPE_PRICE_ID to environment.' },
        { status: 500 }
      );
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Clear any stored Stripe customer ID (e.g. from test mode) so we always create a fresh
    // checkout session. This avoids "customer exists in test mode but live key used" errors.
    await getSupabaseAdmin()
      .from('subscriptions')
      .update({
        stripe_customer_id: null,
        stripe_subscription_id: null,
        status: 'incomplete',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Create fresh checkout session without reusing customer ID. Stripe will create a new
    // customer when the user completes checkout; the webhook will save it.
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard?upgraded=1`,
      cancel_url: `${appUrl}/scan?canceled=1`,
      metadata: { clerk_user_id: userId },
      subscription_data: {
        metadata: { clerk_user_id: userId },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
