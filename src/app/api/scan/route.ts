import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'crypto';
import { analyzeReceiptImage, analyzeReceiptText, RECEIPT_MODEL_MINI, RECEIPT_MODEL_FULL } from '@/lib/openai';
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
    const { type, imageBase64, text, followUpAnswer, originalText, categoryHint, clientLocalDate } = body;

    if (!type || (type !== 'image' && type !== 'text')) {
      return NextResponse.json({ error: 'Invalid type. Use "image" or "text"' }, { status: 400 });
    }

    const hint = typeof categoryHint === 'string' && categoryHint && categoryHint !== 'not_sure' ? categoryHint : undefined;
    const supabase = getSupabaseAdmin();

    let result: Awaited<ReturnType<typeof analyzeReceiptImage>>;
    let receiptImageUrl: string | null = null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const todayYMD = now.toISOString().slice(0, 10);
    const clientDateStr =
      typeof clientLocalDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clientLocalDate)
        ? clientLocalDate
        : todayYMD;

    if (type === 'image') {
      if (!imageBase64) {
        return NextResponse.json({ error: 'imageBase64 required for image scan' }, { status: 400 });
      }
      result = await analyzeReceiptImage(imageBase64, hint, RECEIPT_MODEL_MINI, {
        currentYear,
        todayYMD,
      });
      if ((result.line_items?.length ?? 0) > 10) {
        result = await analyzeReceiptImage(imageBase64, hint, RECEIPT_MODEL_FULL, {
          currentYear,
          todayYMD,
        });
      }
      receiptImageUrl = await uploadReceiptImage(supabase, userId, imageBase64);
    } else {
      const textInput = followUpAnswer ? originalText : text;
      if (!textInput || typeof textInput !== 'string') {
        return NextResponse.json({ error: 'text required for text scan' }, { status: 400 });
      }
      const textToAnalyze = followUpAnswer ? originalText : text;
      let textResult = await analyzeReceiptText(textToAnalyze, followUpAnswer, hint, RECEIPT_MODEL_MINI);
      if (textResult.followUpQuestion) {
        return NextResponse.json({
          followUpQuestion: textResult.followUpQuestion,
          partialResult: textResult.result,
        });
      }
      if ((textResult.result.line_items?.length ?? 0) > 10) {
        textResult = await analyzeReceiptText(textToAnalyze, followUpAnswer, hint, RECEIPT_MODEL_FULL);
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

    const lineItems = result.line_items ?? [];
    const firstItem = lineItems[0];
    // Use receipt's printed date if found; validate year >= 2020
    let dateStr = result.date && /^\d{4}-\d{2}-\d{2}/.test(String(result.date))
      ? String(result.date).slice(0, 10)
      : clientDateStr;
    const dateYear = parseInt(dateStr.slice(0, 4), 10);
    if (Number.isNaN(dateYear) || dateYear < 2020) dateStr = clientDateStr;

    // Amounts from normalizeAnalysis are already in cents
    const totalFromAI = Math.round(Number(result.total_amount ?? 0));
    const sumFromLineItems = Math.round(lineItems.reduce((s, li) => s + Number(li.amount ?? 0), 0));
    const amountCents = totalFromAI > 0 ? totalFromAI : sumFromLineItems;

    // Server-side: recalc deductible_amount_cents for each line item (never trust AI math)
    const lineItemsWithRecalc = lineItems.map((li) => {
      const amtCents = Math.round(Number(li.amount ?? 0));
      const pct = Number(li.deduction_percent ?? 0);
      const safePct = pct >= 75 ? 100 : pct >= 25 ? 50 : 0;
      const deductibleCents = Math.round(amtCents * safePct / 100);
      return {
        ...li,
        amount: amtCents,
        deduction_percent: safePct,
        deductible_amount_cents: deductibleCents,
      };
    });

    const rawDataNormalized = {
      ...result,
      total_amount: amountCents,
      date: dateStr,
      line_items: lineItemsWithRecalc,
    };
    // Ensure raw_data is valid JSON (PostgREST/JSONB requires serializable data)
    let rawDataSafe: Record<string, unknown>;
    try {
      rawDataSafe = JSON.parse(JSON.stringify(rawDataNormalized)) as Record<string, unknown>;
    } catch (jsonErr) {
      console.error('[scan API] raw_data JSON serialize error:', jsonErr);
      return NextResponse.json(
        { error: 'SAVE_FAILED', message: 'Receipt data could not be serialized.' },
        { status: 500 }
      );
    }
    // Schema: id, user_id, merchant_name, amount, date, category, is_deductible, irs_category, raw_data (jsonb), receipt_image_url, created_at
    // Note: line_items lives inside raw_data, NOT as a separate column
    const scanRow = {
      user_id: userId,
      merchant_name: result.merchant_name ?? null,
      amount: amountCents || sumFromLineItems || 0,
      date: dateStr,
      category: (firstItem?.irs_category as string | null) ?? null,
      is_deductible: lineItems.some((li) => li.is_deductible),
      irs_category: (firstItem?.irs_category as string | null) ?? null,
      raw_data: rawDataSafe,
      receipt_image_url: receiptImageUrl ?? null,
    };

    // Nuclear debug: BEFORE insert
    const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '(missing)';
    console.log('[scan API] === BEFORE INSERT ===');
    console.log('[scan API] Using getSupabaseAdmin (SUPABASE_SERVICE_ROLE_KEY):', hasServiceRole, '| Supabase URL:', supabaseUrl);
    console.log('[scan API] scanRow (schema columns only):', JSON.stringify(scanRow, null, 2));

    let inserted: { id: string } | null = null;
    let insertError: unknown = null;
    try {
      const res = await supabase
        .from('scans')
        .insert(scanRow)
        .select('id')
        .single();
      inserted = res.data;
      insertError = res.error;
    } catch (insertThrow) {
      console.error('[scan API] INSERT THREW (unexpected):');
      console.error('[scan API] Full error:', insertThrow);
      console.error('[scan API] Error JSON:', JSON.stringify(insertThrow, ['message', 'code', 'details', 'hint', 'stack', 'name'], 2));
      console.error('[scan API] Error message:', insertThrow instanceof Error ? insertThrow.message : String(insertThrow));
      console.error('[scan API] Error stack:', insertThrow instanceof Error ? insertThrow.stack : 'N/A');
      return NextResponse.json(
        { error: 'SAVE_FAILED', message: 'Insert threw: ' + (insertThrow instanceof Error ? insertThrow.message : String(insertThrow)) },
        { status: 500 }
      );
    }

    // Nuclear debug: AFTER insert - log FULL error object
    console.log('[scan API] === AFTER INSERT ===');
    console.log('[scan API] inserted:', inserted ? JSON.stringify(inserted) : 'null');
    if (insertError) {
      const err = insertError as { message?: string; code?: string; details?: string; hint?: string };
      console.error('[scan API] Supabase insert FAILED - FULL ERROR:');
      console.error('[scan API] error.message:', err?.message);
      console.error('[scan API] error.code:', err?.code);
      console.error('[scan API] error.details:', err?.details);
      console.error('[scan API] error.hint:', err?.hint);
      console.error('[scan API] Full error JSON:', JSON.stringify(insertError, null, 2));
      const errMsg = (insertError as { message?: string })?.message;
      return NextResponse.json(
        {
          error: 'SAVE_FAILED',
          message: 'Receipt was analyzed but could not be saved. Please try again.',
          debug: process.env.NODE_ENV === 'development' && errMsg ? { supabaseError: errMsg } : undefined,
        },
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

    // Return the SAVED Supabase row so celebration popup and dashboard numbers match exactly
    const { data: savedScan } = await supabase
      .from('scans')
      .select('*')
      .eq('id', inserted!.id)
      .single();

    if (!savedScan) {
      return NextResponse.json(
        { error: 'SAVE_OK_FETCH_FAILED', message: 'Scan saved but could not retrieve. Check My Receipts.' },
        { status: 500 }
      );
    }

    const raw = savedScan.raw_data as { line_items?: unknown[]; merchant_name?: string; date?: string } | null;
    return NextResponse.json({
      id: savedScan.id,
      merchant_name: savedScan.merchant_name ?? raw?.merchant_name,
      date: savedScan.date ?? raw?.date ?? null,
      total_amount: Number(savedScan.amount),
      line_items: raw?.line_items ?? [],
    });
  } catch (err) {
    console.error('Scan error:', err);
    return NextResponse.json(
      { error: 'Scan failed', message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
