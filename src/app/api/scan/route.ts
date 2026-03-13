import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import { analyzeReceiptImage, analyzeReceiptText } from '@/lib/openai';
import { getSupabaseAdmin } from '@/lib/supabase';
import { hasActiveSubscription } from '@/lib/subscription';
import { FREE_SCAN_LIMIT } from '@/lib/stripe';

const RECEIPTS_BUCKET = 'receipts';

async function uploadReceiptImage(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  imageBase64: string
): Promise<string | null> {
  try {
    await supabase.storage.createBucket(RECEIPTS_BUCKET, { public: true }).catch(() => {});
    const buffer = Buffer.from(imageBase64, 'base64');
    const ext = imageBase64.startsWith('/9j/') ? 'jpg' : imageBase64.startsWith('iVBOR') ? 'png' : imageBase64.startsWith('UklGR') ? 'webp' : 'jpg';
    const path = `${userId}/${randomUUID()}.${ext}`;

    const contentType = ext === 'jpg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
    const { error } = await supabase.storage.from(RECEIPTS_BUCKET).upload(path, buffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    const { data } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.error('Receipt image upload failed:', err);
    return null;
  }
}

async function getScanCount(userId: string): Promise<number> {
  const { count, error } = await getSupabaseAdmin()
    .from('scans')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) return 0;
  return count ?? 0;
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
    const { type, imageBase64, text, followUpAnswer, originalText, categoryHint } = body;

    if (!type || (type !== 'image' && type !== 'text')) {
      return NextResponse.json({ error: 'Invalid type. Use "image" or "text"' }, { status: 400 });
    }

    const hint = typeof categoryHint === 'string' && categoryHint && categoryHint !== 'not_sure' ? categoryHint : undefined;
    const supabase = getSupabaseAdmin();

    let result: Awaited<ReturnType<typeof analyzeReceiptImage>>;
    let receiptImageUrl: string | null = null;

    if (type === 'image') {
      if (!imageBase64) {
        return NextResponse.json({ error: 'imageBase64 required for image scan' }, { status: 400 });
      }
      result = await analyzeReceiptImage(imageBase64, hint);
      receiptImageUrl = await uploadReceiptImage(supabase, userId, imageBase64);
    } else {
      const textInput = followUpAnswer ? originalText : text;
      if (!textInput || typeof textInput !== 'string') {
        return NextResponse.json({ error: 'text required for text scan' }, { status: 400 });
      }
      const textToAnalyze = followUpAnswer ? originalText : text;
      const textResult = await analyzeReceiptText(textToAnalyze, followUpAnswer, hint);
      if (textResult.followUpQuestion) {
        return NextResponse.json({
          followUpQuestion: textResult.followUpQuestion,
          partialResult: textResult.result,
        });
      }
      result = textResult.result;
    }

    // Never delete user data. scans and scans_backup are append-only.
    if (type === 'image' && result.read_successfully === false) {
      return NextResponse.json(
        { error: 'RECEIPT_UNREADABLE', message: 'We had trouble reading that receipt.' },
        { status: 422 }
      );
    }

    const firstItem = result.line_items[0];
    const dateStr = result.date && /^\d{4}-\d{2}-\d{2}/.test(String(result.date))
      ? String(result.date).slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    // Store amounts in cents (OpenAI returns dollars) for consistency across DB and UI
    const amountCents = Math.round((result.total_amount ?? 0) * 100);
    const rawDataNormalized = {
      ...result,
      total_amount: amountCents,
      line_items: result.line_items.map((li) => ({
        ...li,
        amount: Math.round((li.amount ?? 0) * 100),
      })),
    };
    const scanRow = {
      user_id: userId,
      merchant_name: result.merchant_name,
      amount: amountCents,
      date: dateStr,
      category: firstItem?.irs_category || null,
      is_deductible: result.line_items.some((li) => li.is_deductible),
      irs_category: firstItem?.irs_category || null,
      raw_data: rawDataNormalized,
      receipt_image_url: receiptImageUrl,
    };

    // Nuclear debug: BEFORE insert
    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '(missing)';
    console.log('[scan API] === BEFORE INSERT ===');
    console.log('[scan API] Using getSupabaseAdmin (SUPABASE_SERVICE_ROLE_KEY):', hasServiceRole, '| Supabase URL:', supabaseUrl);
    console.log('[scan API] scanRow EXACT data:', JSON.stringify({
      user_id: scanRow.user_id,
      merchant_name: scanRow.merchant_name,
      amount: scanRow.amount,
      date: scanRow.date,
      category: scanRow.category,
      is_deductible: scanRow.is_deductible,
      irs_category: scanRow.irs_category,
      receipt_image_url: scanRow.receipt_image_url,
      raw_data_keys: scanRow.raw_data ? Object.keys(scanRow.raw_data) : null,
    }));

    let inserted: { id: string } | null = null;
    let insertError: { message?: string; code?: string; details?: unknown } | null = null;
    try {
      const res = await supabase
        .from('scans')
        .insert(scanRow)
        .select('id')
        .single();
      inserted = res.data;
      insertError = res.error;
    } catch (insertThrow) {
      console.error('[scan API] INSERT THREW (unexpected):', insertThrow);
      return NextResponse.json(
        { error: 'SAVE_FAILED', message: 'Insert threw: ' + (insertThrow instanceof Error ? insertThrow.message : String(insertThrow)) },
        { status: 500 }
      );
    }

    // Nuclear debug: AFTER insert
    console.log('[scan API] === AFTER INSERT ===');
    console.log('[scan API] Supabase response:', JSON.stringify({
      data: inserted,
      error: insertError,
      errorMessage: insertError?.message,
      errorCode: insertError?.code,
      errorDetails: insertError?.details,
    }));

    if (insertError) {
      console.error('[scan API] Supabase insert FAILED:', insertError);
      return NextResponse.json(
        { error: 'SAVE_FAILED', message: 'Receipt was analyzed but could not be saved. Please try again.' },
        { status: 500 }
      );
    }

    console.log('[scan API] insert success id=', inserted?.id);

    if (inserted?.id) {
      const { error: backupError } = await supabase
        .from('scans_backup')
        .insert({ ...scanRow, id: inserted.id });
      if (backupError) {
        console.error('[scan API] scans_backup insert error (non-fatal):', backupError);
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Scan error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
