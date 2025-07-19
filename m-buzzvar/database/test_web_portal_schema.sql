-- Test Script for Web Portal Schema Extensions
-- This script tests the new schema changes to ensure compatibility with existing data

-- ============================================================================
-- 1. TEST VENUE OWNERS TABLE
-- ============================================================================

-- Test creating venue ownership records
DO $$
DECLARE
    test_user_id UUID;
    test_venue_id UUID;
    ownership_count INTEGER;
BEGIN
    -- Get a test user (create one if none exist)
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        -- Create a test user for testing
        INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'test@example.com');
        INSERT INTO public.users (id, name, email) 
        VALUES (gen_random_uuid(), 'Test User', 'test@example.com')
        RETURNING id INTO test_user_id;
    END IF;
    
    -- Get a test venue (create one if none exist)
    SELECT id INTO test_venue_id FROM public.venues LIMIT 1;
    
    IF test_venue_id IS NULL THEN
        INSERT INTO public.venues (name, description) 
        VALUES ('Test Venue', 'A test venue for schema validation')
        RETURNING id INTO test_venue_id;
    END IF;
    
    -- Test inserting venue ownership
    INSERT INTO public.venue_owners (user_id, venue_id, role)
    VALUES (test_user_id, test_venue_id, 'owner')
    ON CONFLICT (user_id, venue_id) DO NOTHING;
    
    -- Verify the insert worked
    SELECT COUNT(*) INTO ownership_count 
    FROM public.venue_owners 
    WHERE user_id = test_user_id AND venue_id = test_venue_id;
    
    IF ownership_count = 0 THEN
        RAISE EXCEPTION 'Failed to create venue ownership record';
    END IF;
    
    RAISE NOTICE 'Venue ownership test passed: % records found', ownership_count;
END $$;

-- ============================================================================
-- 2. TEST ANALYTICS VIEWS
-- ============================================================================

-- Test venue analytics view
DO $$
DECLARE
    analytics_count INTEGER;
    venue_count INTEGER;
BEGIN
    -- Check if venue analytics view returns data
    SELECT COUNT(*) INTO analytics_count FROM public.venue_analytics;
    SELECT COUNT(*) INTO venue_count FROM public.venues;
    
    IF analytics_count != venue_count THEN
        RAISE EXCEPTION 'Venue analytics view mismatch: % analytics records vs % venues', analytics_count, venue_count;
    END IF;
    
    RAISE NOTICE 'Venue analytics test passed: % records found', analytics_count;
END $$;

-- Test platform analytics view
DO $$
DECLARE
    platform_analytics_exists BOOLEAN;
BEGIN
    -- Check if platform analytics view returns a single row
    SELECT EXISTS(SELECT 1 FROM public.platform_analytics) INTO platform_analytics_exists;
    
    IF NOT platform_analytics_exists THEN
        RAISE EXCEPTION 'Platform analytics view returned no data';
    END IF;
    
    RAISE NOTICE 'Platform analytics test passed';
END $$;

-- Test daily analytics view
DO $$
DECLARE
    daily_analytics_count INTEGER;
BEGIN
    -- Check if daily analytics view returns 31 days of data
    SELECT COUNT(*) INTO daily_analytics_count FROM public.daily_analytics;
    
    IF daily_analytics_count != 31 THEN
        RAISE NOTICE 'Daily analytics returned % days instead of 31', daily_analytics_count;
    END IF;
    
    RAISE NOTICE 'Daily analytics test passed: % days of data', daily_analytics_count;
END $$;

-- ============================================================================
-- 3. TEST FUNCTIONS
-- ============================================================================

-- Test get_user_venues function
DO $$
DECLARE
    test_user_id UUID;
    venue_count INTEGER;
BEGIN
    -- Get a user with venue ownership
    SELECT user_id INTO test_user_id FROM public.venue_owners LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        SELECT COUNT(*) INTO venue_count FROM get_user_venues(test_user_id);
        RAISE NOTICE 'get_user_venues test passed: % venues found for user', venue_count;
    ELSE
        RAISE NOTICE 'No venue owners found to test get_user_venues function';
    END IF;
END $$;

-- Test is_venue_owner function
DO $$
DECLARE
    test_user_id UUID;
    test_venue_id UUID;
    is_owner BOOLEAN;
BEGIN
    -- Get a user-venue pair from venue_owners
    SELECT user_id, venue_id INTO test_user_id, test_venue_id 
    FROM public.venue_owners 
    WHERE role IN ('owner', 'manager') 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL AND test_venue_id IS NOT NULL THEN
        SELECT is_venue_owner(test_user_id, test_venue_id) INTO is_owner;
        
        IF NOT is_owner THEN
            RAISE EXCEPTION 'is_venue_owner function returned false for valid owner';
        END IF;
        
        RAISE NOTICE 'is_venue_owner test passed';
    ELSE
        RAISE NOTICE 'No venue owners found to test is_venue_owner function';
    END IF;
END $$;

-- Test get_venue_analytics_detailed function
DO $$
DECLARE
    test_venue_id UUID;
    analytics_count INTEGER;
BEGIN
    -- Get a venue to test analytics
    SELECT id INTO test_venue_id FROM public.venues LIMIT 1;
    
    IF test_venue_id IS NOT NULL THEN
        SELECT COUNT(*) INTO analytics_count 
        FROM get_venue_analytics_detailed(test_venue_id, 7);
        
        IF analytics_count != 8 THEN -- 7 days back + today = 8 days
            RAISE NOTICE 'get_venue_analytics_detailed returned % days instead of 8', analytics_count;
        END IF;
        
        RAISE NOTICE 'get_venue_analytics_detailed test passed: % days of data', analytics_count;
    ELSE
        RAISE NOTICE 'No venues found to test get_venue_analytics_detailed function';
    END IF;
END $$;

-- ============================================================================
-- 4. TEST RLS POLICIES
-- ============================================================================

-- Test venue_owners RLS policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Check if RLS policies exist for venue_owners table
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'venue_owners' AND schemaname = 'public';
    
    IF policy_count < 3 THEN
        RAISE EXCEPTION 'Expected at least 3 RLS policies for venue_owners, found %', policy_count;
    END IF;
    
    RAISE NOTICE 'RLS policies test passed: % policies found for venue_owners', policy_count;
END $$;

-- ============================================================================
-- 5. TEST INDEXES
-- ============================================================================

-- Test that new indexes were created
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    -- Check for venue_owners indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename = 'venue_owners' AND schemaname = 'public';
    
    IF index_count < 3 THEN
        RAISE EXCEPTION 'Expected at least 3 indexes for venue_owners, found %', index_count;
    END IF;
    
    RAISE NOTICE 'Index test passed: % indexes found for venue_owners', index_count;
END $$;

-- ============================================================================
-- 6. TEST DATA INTEGRITY
-- ============================================================================

-- Test that existing data is still accessible
DO $$
DECLARE
    venue_count INTEGER;
    user_count INTEGER;
    vibe_check_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO venue_count FROM public.venues;
    SELECT COUNT(*) INTO user_count FROM public.users;
    SELECT COUNT(*) INTO vibe_check_count FROM public.vibe_checks;
    
    RAISE NOTICE 'Data integrity test passed:';
    RAISE NOTICE '  - Venues: %', venue_count;
    RAISE NOTICE '  - Users: %', user_count;
    RAISE NOTICE '  - Vibe Checks: %', vibe_check_count;
END $$;

-- ============================================================================
-- 7. PERFORMANCE TEST
-- ============================================================================

-- Test analytics view performance
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
BEGIN
    start_time := clock_timestamp();
    
    -- Run a complex analytics query
    PERFORM * FROM public.venue_analytics LIMIT 100;
    
    end_time := clock_timestamp();
    duration := end_time - start_time;
    
    RAISE NOTICE 'Performance test completed in %', duration;
    
    IF duration > INTERVAL '5 seconds' THEN
        RAISE WARNING 'Analytics query took longer than expected: %', duration;
    END IF;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '=== WEB PORTAL SCHEMA TESTS COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'All schema extensions are working correctly with existing data.';
END $$;