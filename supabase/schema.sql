-- TaxSnapper Database Schema for Supabase

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Scans table - stores receipt scan results
create table if not exists scans (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  merchant_name text,
  amount decimal(10, 2) not null,
  date date,
  category text,
  is_deductible boolean default false,
  irs_category text,
  raw_data jsonb,
  receipt_image_url text,
  created_at timestamptz default now()
);

-- For existing deployments, add the receipt_image_url column:
-- ALTER TABLE scans ADD COLUMN IF NOT EXISTS receipt_image_url text;

-- Receipt images storage bucket: create via Storage > New bucket > name: receipts, public: true

-- scans_backup: Silent redundancy. Every scan is backed up here. Never delete user data.
-- Run: CREATE TABLE scans_backup (LIKE scans INCLUDING ALL);
create table if not exists scans_backup (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  merchant_name text,
  amount decimal(10, 2) not null,
  date date,
  category text,
  is_deductible boolean default false,
  irs_category text,
  raw_data jsonb,
  receipt_image_url text,
  created_at timestamptz default now()
);

-- User subscriptions - tracks Stripe subscription status
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id text unique not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text default 'active',
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast lookups (user_id ensures each user only sees their own scans)
create index if not exists scans_user_id_idx on scans(user_id);
create index if not exists scans_created_at_idx on scans(created_at desc);
create index if not exists scans_date_idx on scans(date);
create index if not exists scans_irs_category_idx on scans(irs_category);

-- User preferences (e.g. weekly email digest)
create table if not exists user_preferences (
  user_id text primary key,
  weekly_tax_tip_email boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Note: We use Clerk for auth and Supabase SERVICE ROLE for server-side access.
-- The service role key BYPASSES RLS entirely. API routes must use getSupabaseAdmin()
-- which requires SUPABASE_SERVICE_ROLE_KEY. Never use the anon key for server queries.
-- If RLS is enabled on scans, it would block anon key; service role bypasses it.

-- Enable Realtime for scans (run in Supabase SQL Editor if not already enabled):
-- ALTER PUBLICATION supabase_realtime ADD TABLE scans;
