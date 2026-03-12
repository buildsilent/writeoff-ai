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

-- Note: We use Clerk for auth and Supabase service role for server-side access.
-- RLS is disabled for scans/subscriptions when using service role (bypasses RLS).
-- Application logic in API routes enforces user_id filtering.
