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

// Admin client for server - bypasses RLS. Lazy init to avoid build-time env requirement.
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    if (!supabaseUrl || (!supabaseServiceKey && !supabaseAnonKey)) {
      throw new Error('Supabase URL and keys are required. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.');
    }
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
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
