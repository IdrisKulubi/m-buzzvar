-- Complete Schema Validation Test
-- This script tests all tables, views, functions, and policies for the BuzzVar app

\echo '============================================================================'
\echo 'BUZZVAR COMPLETE SCHEMA VALIDATION TEST'
\echo '============================================================================'

\echo ''
\echo '1. CHECKING ALL TABLES...'
\echo '----------------------------------------'

-- List all tables with row counts
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN schemaname = 'public' THEN 
            (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tablename)
        ELSE 0 
    END as exists
FROM pg_tables 
WHERE schemaname IN ('public', 'auth')
ORDER BY schemaname, tablename;

\echo ''
\echo '2. CHECKING CORE APP TABLES...'
\echo '----------------------------------------'

-- Check if all expected tables exist
SELECT 
    table_name,
    CASE WHEN table_name IN (
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES 
    ('users'),
    ('venues'),
    ('menus'),
    ('menu_items'),
    ('promotions'),
    ('reviews'),
    ('vibe_checks'),
    ('party_groups'),
    ('party_group_members'),
    ('user_bookmarks'),
    ('club_views'),
    ('venue_owners')
) AS expected_tables(table_name)
ORDER BY table_name;

\echo ''
\echo '3. CHECKING TABLE STRUCTURES...'
\echo '----------------------------------------'

-- Check key columns for each table
\echo 'Users table columns:'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

\echo ''
\echo 'Venues table columns:'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'venues'
ORDER BY ordinal_position;

\echo ''
\echo 'Venue_owners table columns:'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'venue_owners'
ORDER BY ordinal_position;

\echo ''
\echo '4. CHECKING INDEXES...'
\echo '----------------------------------------'

-- List all indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

\echo ''
\echo '5. CHECKING VIEWS...'
\echo '----------------------------------------'

-- Check if analytics views exist
SELECT 
    view_name,
    CASE WHEN view_name IN (
        SELECT table_name FROM information_schema.views 
        WHERE table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
FROM (VALUES 
    ('venue_analytics'),
    ('platform_analytics'),
    ('daily_analytics')
) AS expected_views(view_name);

\echo ''
\echo '6. TESTING VIEWS (Sample Data)...'
\echo '----------------------------------------'

-- Test venue_analytics view
\echo 'Testing venue_analytics view:'
SELECT COUNT(*) as view_accessible FROM public.venue_analytics LIMIT 1;

-- Test platform_analytics view  
\echo 'Testing platform_analytics view:'
SELECT COUNT(*) as view_accessible FROM public.platform_analytics LIMIT 1;

-- Test daily_analytics view
\echo 'Testing daily_analytics view:'
SELECT COUNT(*) as records_count FROM public.daily_analytics LIMIT 5;

\echo ''
\echo '7. CHECKING FUNCTIONS...'
\echo '----------------------------------------'

-- List all custom functions
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_user_venues',
    'is_venue_owner', 
    'get_venue_analytics_detailed',
    'update_updated_at_column'
)
ORDER BY routine_name;

\echo ''
\echo '8. TESTING FUNCTIONS...'
\echo '----------------------------------------'

-- Test function signatures (without executing with real data)
\echo 'Function get_user_venues signature:'
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'get_user_venues';

\echo 'Function is_venue_owner signature:'
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'is_venue_owner';

\echo ''
\echo '9. CHECKING RLS POLICIES...'
\echo '----------------------------------------'

-- List all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

\echo ''
\echo '10. CHECKING CONSTRAINTS...'
\echo '----------------------------------------'

-- Check foreign key constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

\echo ''
\echo '11. CHECKING UNIQUE CONSTRAINTS...'
\echo '----------------------------------------'

-- Check unique constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE' 
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

\echo ''
\echo '12. CHECKING TRIGGERS...'
\echo '----------------------------------------'

-- List all triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

\echo ''
\echo '13. CHECKING EXTENSIONS...'
\echo '----------------------------------------'

-- Check required extensions
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'postgis');

\echo ''
\echo '14. SAMPLE DATA TEST...'
\echo '----------------------------------------'

-- Try to insert and query sample data to test basic functionality
BEGIN;

-- Test user insertion
INSERT INTO public.users (id, email, username, full_name, university) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'test@example.com',
    'testuser',
    'Test User',
    'Test University'
) ON CONFLICT (id) DO NOTHING;

-- Test venue insertion
INSERT INTO public.venues (id, name, address, latitude, longitude, venue_type) 
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Test Venue',
    '123 Test St',
    40.7128,
    -74.0060,
    'bar'
) ON CONFLICT (id) DO NOTHING;

-- Test venue owner insertion
INSERT INTO public.venue_owners (user_id, venue_id, role) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'owner'
) ON CONFLICT (user_id, venue_id) DO NOTHING;

\echo 'Sample data inserted successfully!'

-- Test queries
\echo 'Testing basic queries:'
SELECT COUNT(*) as user_count FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001';
SELECT COUNT(*) as venue_count FROM public.venues WHERE id = '00000000-0000-0000-0000-000000000002';
SELECT COUNT(*) as owner_count FROM public.venue_owners WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Test function with sample data
\echo 'Testing get_user_venues function:'
SELECT * FROM get_user_venues('00000000-0000-0000-0000-000000000001');

\echo 'Testing is_venue_owner function:'
SELECT is_venue_owner('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002') as is_owner;

ROLLBACK;

\echo ''
\echo '============================================================================'
\echo 'SCHEMA VALIDATION COMPLETE!'
\echo '============================================================================'
\echo 'Review the output above for any MISSING tables, views, or functions.'
\echo 'All tests should show EXISTS status and no errors should be reported.'
\echo '============================================================================'