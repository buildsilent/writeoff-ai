# Scans Table Schema Verification

If inserts fail with "could not be saved", verify your Supabase `scans` table matches this schema.

## Expected columns (Supabase Dashboard → Table Editor → scans)

| Column            | Type         | Nullable | Default              | Notes                    |
|-------------------|--------------|----------|----------------------|--------------------------|
| id                | uuid         | NO       | uuid_generate_v4()   | Primary key              |
| user_id           | text         | NO       | -                    | From Clerk auth          |
| merchant_name     | text         | YES      | -                    |                          |
| amount            | decimal(10,2)| NO       | -                    | Stored in **cents**      |
| date              | date         | YES      | -                    | YYYY-MM-DD               |
| category          | text         | YES      | -                    |                          |
| is_deductible     | boolean      | YES      | false                |                          |
| irs_category      | text         | YES      | -                    |                          |
| raw_data          | jsonb        | YES      | -                    | **line_items inside here** |
| receipt_image_url | text         | YES      | -                    |                          |
| created_at        | timestamptz  | YES      | now()                |                          |

## Important

- **`line_items`** is NOT a separate column. It lives inside `raw_data` as JSONB.
- **`amount`** must be NOT NULL. We insert cents (e.g. 4947 = $49.47).
- Run `supabase/migrations/20250313000000_ensure_scans_schema.sql` in SQL Editor if columns are missing.
