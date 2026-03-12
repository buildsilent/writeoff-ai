import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analyzeReceiptImage, analyzeReceiptText } from '@/lib/openai';
import { getSupabaseAdmin } from '@/lib/supabase';
import { FREE_SCAN_LIMIT } from '@/lib/stripe';

async function getScanCount(userId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from('scans')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) return 0;
  return count ?? 0;
}

async function hasActiveSubscription(userId: string): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .single();

  if (!data || data.status !== 'active') return false;
  if (data.current_period_end) {
    return new Date(data.current_period_end) > new Date();
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasSubscription = await hasActiveSubscription(userId);
    if (!hasSubscription) {
      const scanCount = await getScanCount(userId);
      if (scanCount >= FREE_SCAN_LIMIT) {
        return NextResponse.json(
          { error: 'FREE_LIMIT_REACHED', message: 'Upgrade to continue scanning' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const { type, imageBase64, text } = body;

    if (!type || (type !== 'image' && type !== 'text')) {
      return NextResponse.json({ error: 'Invalid type. Use "image" or "text"' }, { status: 400 });
    }

    let result;
    if (type === 'image') {
      if (!imageBase64) {
        return NextResponse.json({ error: 'imageBase64 required for image scan' }, { status: 400 });
      }
      result = await analyzeReceiptImage(imageBase64);
    } else {
      if (!text || typeof text !== 'string') {
        return NextResponse.json({ error: 'text required for text scan' }, { status: 400 });
      }
      result = await analyzeReceiptText(text);
    }

    const firstItem = result.line_items[0];

    await getSupabaseAdmin().from('scans').insert({
      user_id: userId,
      merchant_name: result.merchant_name,
      amount: result.total_amount,
      date: result.date || null,
      category: firstItem?.irs_category || null,
      is_deductible: result.line_items.some((li) => li.is_deductible),
      irs_category: firstItem?.irs_category || null,
      raw_data: result,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Scan error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
