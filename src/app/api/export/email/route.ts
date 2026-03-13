import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';
import { hasActiveSubscription } from '@/lib/subscription';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

const DISCLAIMER = 'TaxSnapper provides estimates for informational purposes. Consult a licensed CPA for official tax advice.';

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isPro = await hasActiveSubscription(userId);
    if (!isPro) {
      return NextResponse.json({ error: 'Pro subscription required for email export' }, { status: 403 });
    }

    const body = await req.json();
    const { dateRange, customStart, customEnd } = body;

    const { data: scans, error } = await getSupabaseAdmin()
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const now = new Date();
    let filtered = scans || [];
    if (dateRange === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter((s) => {
        const d = new Date(s.date || s.created_at?.slice(0, 10) || '');
        return d >= start && d <= now;
      });
    } else if (dateRange === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter((s) => {
        const d = new Date(s.date || s.created_at?.slice(0, 10) || '');
        return d >= start && d <= now;
      });
    } else if (dateRange === 'custom' && customStart) {
      const start = new Date(customStart);
      const end = customEnd ? new Date(customEnd) : now;
      filtered = filtered.filter((s) => {
        const d = new Date(s.date || s.created_at?.slice(0, 10) || '');
        return d >= start && d <= end;
      });
    }

    const rows: Array<{ date: string; merchant: string; amount: number; deductible: number; category: string; pct: number }> = [];
    const catTotals = new Map<string, number>();

    for (const scan of filtered) {
      const raw = scan.raw_data as { merchant_name?: string; date?: string; line_items?: Array<{ amount?: number; irs_category?: string; deduction_percent?: number; is_deductible?: boolean }> } | null;
      const merchant = raw?.merchant_name || scan.merchant_name || 'Unknown';
      const date = scan.date || raw?.date || scan.created_at?.slice(0, 10) || '';

      if (raw?.line_items?.length) {
        for (const li of raw.line_items) {
          const amt = li.amount ?? 0;
          const pct = li.deduction_percent ?? 0;
          const deductible = li.is_deductible ? Math.round(amt * (pct / 100)) : 0;
          const cat = li.irs_category ?? '';
          rows.push({ date, merchant, amount: amt, deductible, category: cat, pct });
          if (cat && deductible > 0) catTotals.set(cat, (catTotals.get(cat) || 0) + deductible);
        }
      } else {
        const amt = Number(scan.amount) ?? 0;
        const deductible = scan.is_deductible ? amt : 0;
        const cat = (scan as { irs_category?: string }).irs_category ?? '';
        rows.push({ date, merchant, amount: amt, deductible, category: cat, pct: scan.is_deductible ? 100 : 0 });
        if (cat && deductible > 0) catTotals.set(cat, (catTotals.get(cat) || 0) + deductible);
      }
    }

    const grandTotal = rows.reduce((s, r) => s + r.deductible, 0);

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229);
    doc.text('TaxSnapper', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Tax Deduction Summary', 14, 28);
    doc.text(`Date range: ${dateRange === 'all_time' ? 'All Time' : dateRange === 'this_year' ? 'This Year' : dateRange === 'this_month' ? 'This Month' : 'Custom'}`, 14, 34);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 40);

    const catRows = Array.from(catTotals.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([cat, amt]) => [cat, `$${formatCents(amt)}`]);

    autoTable(doc, {
      startY: 48,
      head: [['IRS Category', 'Deductible Amount']],
      body: [...catRows, ['TOTAL', `$${formatCents(grandTotal)}`]],
      theme: 'plain',
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      margin: { left: 14 },
    });

    const finalY = (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 54;
    autoTable(doc, {
      startY: finalY + 10,
      head: [['Date', 'Merchant', 'Amount', 'Deductible', 'Category', 'Deduction %']],
      body: rows.slice(0, 80).map((r) => [
        r.date,
        r.merchant.slice(0, 25),
        `$${formatCents(r.amount)}`,
        `$${formatCents(r.deductible)}`,
        r.category,
        `${r.pct}%`,
      ]),
      theme: 'striped',
      margin: { left: 14 },
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(DISCLAIMER, 14, doc.internal.pageSize.height - 10, { maxWidth: 180 });

    const pdfBuffer = doc.output('arraybuffer');
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress;
    if (!email) return NextResponse.json({ error: 'No email on file' }, { status: 400 });

    const resend = getResend();
    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'TaxSnapper <hello@taxsnapper.com>',
      to: email,
      subject: `Your TaxSnapper tax summary`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px;">
          <h2 style="color: #4F46E5;">Your Tax Summary</h2>
          <p>Hi,</p>
          <p>Your TaxSnapper tax deduction summary is attached as a PDF.</p>
          <p style="color: #6b7280; font-size: 14px;">Snap your receipts. Keep your money.<br/><a href="https://taxsnapper.com">taxsnapper.com</a></p>
        </div>
      `,
      attachments: [
        {
          filename: `taxsnapper-summary-${dateRange === 'all_time' ? 'all' : dateRange === 'this_year' ? now.getFullYear() : dateRange === 'this_month' ? now.toISOString().slice(0, 7) : 'custom'}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (sendError) return NextResponse.json({ error: sendError.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[export/email]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Export failed' }, { status: 500 });
  }
}
