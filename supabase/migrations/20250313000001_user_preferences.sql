-- User preferences for weekly email digest
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id text PRIMARY KEY,
  weekly_tax_tip_email boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
