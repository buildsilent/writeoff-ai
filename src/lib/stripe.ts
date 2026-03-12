import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is required');
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}

export const FREE_SCAN_LIMIT = 3;
export const PRICE_ID = process.env.STRIPE_PRICE_ID!;
