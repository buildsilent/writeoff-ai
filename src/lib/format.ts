/**
 * Amounts are stored in cents in Supabase.
 * Use these helpers for display and calculations.
 */
export function centsToDollars(cents: number): number {
  return Number(cents) / 100;
}

export function formatCents(cents: number): string {
  return `$${centsToDollars(cents).toFixed(2)}`;
}
