# TaxSnapper

Snap your receipts. Keep your money.

Upload a photo or paste receipt text, and our AI analyzes it to extract merchant, amount, date, category, and whether it's tax deductible—with the IRS category.

## Tech Stack

- **Next.js** – Frontend & API routes
- **Clerk** – Authentication
- **Supabase** – Database (scan history)
- **Stripe** – Payments ($9.99/month subscription)
- **OpenAI GPT-4o** – Receipt analysis (Vision API for images)
- **Vercel** – Deployment

## Setup

### 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

Required variables:

- **Clerk**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **OpenAI**: `OPENAI_API_KEY`
- **Stripe**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` (webhook required for subscription sync)
- **App**: `NEXT_PUBLIC_APP_URL`

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase/schema.sql` in the SQL Editor
3. For existing deployments, run: `ALTER TABLE scans ADD COLUMN IF NOT EXISTS receipt_image_url text;`
4. Create a storage bucket: Storage → New bucket → name: `receipts`, Public: yes
5. Get your project URL, anon key, and service role key from Settings → API

### 3. Clerk

1. Create an application at [clerk.com](https://clerk.com)
2. Configure sign-in/sign-up URLs and redirects
3. Add the publishable and secret keys to `.env.local`
4. **Set `NEXT_PUBLIC_APP_URL`** to your production URL (e.g. `https://your-app.vercel.app`) — required for Google OAuth redirects
5. **Clerk Dashboard → Configure → Paths**: Set **Home URL** to your production app URL (e.g. `https://your-app.vercel.app`)
6. **Clerk Dashboard → Configure → Paths**: Add your production URL to **Allowed redirect URLs** (e.g. `https://your-app.vercel.app/**`)
7. **Disable phone sign-up**: User & Authentication → Email, Phone, Username → turn **off** "Phone number" for sign-up to remove friction

### 4. Stripe

1. Create a product with a $9.99/month recurring price
2. Copy the Price ID (`price_xxx`) to `STRIPE_PRICE_ID`
3. Set up a webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
4. Subscribe to: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Add the webhook signing secret to `STRIPE_WEBHOOK_SECRET` (required for subscription sync)

### 5. OpenAI

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Ensure you have access to GPT-4o

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub
2. Import the project in Vercel
3. Add all environment variables from `.env.local.example`
4. Deploy

Remember to:
- Set `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://taxsnapper.vercel.app`)
- Configure Stripe webhooks: add endpoint `https://your-domain.com/api/stripe/webhook` and subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

## User Flow

1. **Landing page** – Headline, CTA, example scan result
2. **Sign up** – Create account (3 free scans)
3. **Scan** – Upload photo or paste receipt text
4. **Results** – Clean card with merchant, amount, date, category, deductible status, IRS category
5. **Save** – Results auto-save to history
6. **Upgrade** – After 3 free scans, prompt for $9.99/month
7. **Dashboard** – View all scans and total estimated deductions for the year
