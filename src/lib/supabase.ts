import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _supabaseAdmin: SupabaseClient | null = null;

// Client for browser - uses anon key (lazy to avoid build-time errors)
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (null as unknown as SupabaseClient);

// Admin client for server - uses SERVICE ROLE to bypass RLS. Required for server-side queries.
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase service role required. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. (Service role bypasses RLS.)');
    }
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabaseAdmin;
}

export interface Scan {
  id: string;
  user_id: string;
  merchant_name: string | null;
  amount: number;
  date: string | null;
  category: string | null;
  is_deductible: boolean;
  irs_category: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}

export interface ScanInsert {
  user_id: string;
  merchant_name?: string | null;
  amount: number;
  date?: string | null;
  category?: string | null;
  is_deductible?: boolean;
  irs_category?: string | null;
  raw_data?: Record<string, unknown> | null;
}
