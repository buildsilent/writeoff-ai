-- Fix scans table schema if inserts fail
-- Run in Supabase Dashboard → SQL Editor
-- Columns expected by /api/scan: user_id, merchant_name, amount, date, category, is_deductible, irs_category, raw_data, receipt_image_url

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- If starting fresh:
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  merchant_name text,
  amount decimal(10, 2) NOT NULL,
  date date,
  category text,
  is_deductible boolean DEFAULT false,
  irs_category text,
  raw_data jsonb,
  receipt_image_url text,
  created_at timestamptz DEFAULT now()
);

-- Add commonly missing column (for older deployments):
ALTER TABLE scans ADD COLUMN IF NOT EXISTS receipt_image_url text;
