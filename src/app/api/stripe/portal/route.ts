import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getStripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null);
    if (!appUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_APP_URL must be set in production (e.g. https://taxsnapper.com) for Stripe redirects.' },
        { status: 500 }
      );
    }
    const baseUrl = appUrl.replace(/\/$/, '');

    const { data: sub } = await getSupabaseAdmin()
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    const customerId = sub?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: 'No subscription found. Upgrade to Pro first.' },
        { status: 400 }
      );
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to open billing portal' },
      { status: 500 }
    );
  }
}
