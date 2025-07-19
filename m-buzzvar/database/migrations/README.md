# Database Migrations

This directory contains database migration scripts for the Buzzvar app.

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the migration SQL file contents
4. Run the SQL script

### Option 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db reset
```

Or apply specific migrations:

```bash
supabase db push
```

## Migration Files

- `001_add_vibe_checks.sql` - Adds the vibe_checks table with constraints, indexes, and RLS policies

## Migration Guidelines

1. Always use `IF NOT EXISTS` for table creation
2. Always use `IF NOT EXISTS` for index creation  
3. Check for existing policies before creating new ones
4. Include rollback instructions in comments
5. Test migrations on a development database first
6. Include verification queries at the end

## Rollback Instructions

### To rollback 001_add_vibe_checks.sql:

```sql
-- Drop the vibe_checks table and all related objects
DROP TABLE IF EXISTS public.vibe_checks CASCADE;
```

Note: This will permanently delete all vibe check data. Use with caution.