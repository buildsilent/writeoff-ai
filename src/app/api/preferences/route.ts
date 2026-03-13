import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_preferences')
      .select('weekly_tax_tip_email')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const hasResponded = data !== null;
    return NextResponse.json({
      weeklyTaxTipEmail: data?.weekly_tax_tip_email ?? false,
      hasResponded,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const weeklyTaxTipEmail = Boolean(body?.weeklyTaxTipEmail);

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: userId, weekly_tax_tip_email: weeklyTaxTipEmail, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ weeklyTaxTipEmail });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
