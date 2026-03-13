#!/usr/bin/env node
/**
 * Run Supabase query for scans table.
 * Usage: node scripts/query-scans.js
 * Requires: .env.local with SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL
 */
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  console.log('Querying scans table (all rows, no filter)...\n');
  const { data, error } = await supabase
    .from('scans')
    .select('id, user_id, merchant_name, amount, date, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Supabase error:', error);
    process.exit(1);
  }

  console.log('Row count:', data?.length ?? 0);
  console.log('Unique user_ids:', [...new Set((data || []).map((r) => r.user_id))]);
  console.log('\nSample rows:');
  console.log(JSON.stringify(data || [], null, 2));
}

main();
