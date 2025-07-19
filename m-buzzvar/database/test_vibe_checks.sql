-- Test script for vibe_checks table functionality
-- Run this after applying the migration to verify everything works

-- Test 1: Verify table exists and has correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'vibe_checks' 
ORDER BY ordinal_position;

-- Test 2: Verify indexes exist
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'vibe_checks';

-- Test 3: Verify RLS policies exist
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'vibe_checks';

-- Test 4: Verify constraints exist
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'vibe_checks';

-- Test 5: Check if we can insert a test record (will fail without proper auth, which is expected)
-- This should fail with RLS policy violation, confirming security is working
-- INSERT INTO public.vibe_checks (venue_id, user_id, busyness_rating, user_latitude, user_longitude)
-- VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 3, 40.7128, -74.0060);

-- Expected output: Should show table structure, indexes, policies, and constraints
-- The INSERT should fail with RLS policy error (which confirms security is working)