import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Hit GET /api/debug-insert-test to verify Supabase insert works.
 * Inserts a test row and returns the result. Delete this route after debugging.
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '(missing)';

    const scanRow = {
      user_id: userId,
      merchant_name: '[DEBUG TEST]',
      amount: 100, // $1.00 in cents
      date: new Date().toISOString().slice(0, 10),
      category: 'Office Supplies',
      is_deductible: true,
      irs_category: 'Office Supplies',
      raw_data: { test: true, debug: true },
      receipt_image_url: null,
    };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('scans')
      .insert(scanRow)
      .select('id, created_at')
      .single();

    return NextResponse.json({
      config: { hasServiceRoleKey: hasKey, supabaseUrl: url ? `${url.slice(0, 30)}...` : 'missing' },
      insert: { data, error: error ? { message: error.message, code: error.code, details: error.details } : null },
    });
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }, { status: 500 });
  }
}
