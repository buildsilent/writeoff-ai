import { NextRequest, NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return new Resend(key);
}

const TAX_TIPS = [
  'Track every business mile from trip one. The IRS expects a contemporaneous log — use your phone or a simple spreadsheet.',
  'Home office deduction requires exclusive and regular use. Measure your dedicated workspace and deduct a percentage of rent, utilities, and insurance.',
  'Meals with clients are 50% deductible (IRC §274(n)). Document who, what, when, and the business purpose.',
  'Software and subscriptions used for work are 100% deductible. Audit your subscriptions and cancel what you don\'t use.',
  'Equipment under $2,500 can often be deducted in year one under Section 179. Check the latest limits.',
  'Health insurance premiums for self-employed individuals are deductible on Schedule 1.',
  'Continuing education related to your business is fully deductible. Conferences, courses, and books count.',
  'Phone and internet: deduct the business-use percentage. Keep a simple log for a few weeks to establish the split.',
  'Bank fees and interest on business credit cards are deductible. Use a separate card for business.',
  'Gifts to clients are deductible up to $25 per person per year. Document the recipient and business purpose.',
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: prefs, error } = await supabase
      .from('user_preferences')
      .select('user_id')
      .eq('weekly_tax_tip_email', true);

    if (error || !prefs?.length) {
      return NextResponse.json({ sent: 0, message: 'No subscribers or error' });
    }

    const tip = TAX_TIPS[Math.floor(Math.random() * TAX_TIPS.length)];
    let sent = 0;

    for (const { user_id } of prefs) {
      try {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(user_id);
        const email = user.emailAddresses?.[0]?.emailAddress;
        if (!email) continue;

        await getResend().emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'TaxSnapper <hello@taxsnapper.com>',
          to: email,
          subject: `Your weekly tax tip from TaxSnapper`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #4F46E5;">TaxSnapper Weekly Tip</h2>
              <p style="color: #374151; line-height: 1.6;">${tip}</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                Snap your receipts. Keep your money.<br/>
                <a href="https://taxsnapper.com">taxsnapper.com</a>
              </p>
            </div>
          `,
        });
        sent++;
      } catch {
        // Skip failed sends
      }
    }

    return NextResponse.json({ sent, total: prefs.length });
  } catch (err) {
    console.error('[send-weekly-tips]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
