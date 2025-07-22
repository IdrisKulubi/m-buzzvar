-- Deployment Script for Web Portal Extensions
-- This script applies the web portal database extensions to Supabase

-- Start transaction for atomic deployment
BEGIN;

-- Log deployment start
DO $$
BEGIN
    RAISE NOTICE '=== DEPLOYING WEB PORTAL EXTENSIONS ===';
    RAISE NOTICE 'Starting deployment at %', NOW();
END $$;

-- Apply the main migration
\i 003_web_portal_extensions.sql

-- Run tests to verify deployment
\i ../test_web_portal_schema.sql

-- Log deployment completion
DO $$
BEGIN
    RAISE NOTICE '=== DEPLOYMENT COMPLETED SUCCESSFULLY ===';
    RAISE NOTICE 'Web portal extensions deployed at %', NOW();
    RAISE NOTICE 'The following components are now available:';
    RAISE NOTICE '  - venue_owners table for ownership management';
    RAISE NOTICE '  - venue_analytics view for venue metrics';
    RAISE NOTICE '  - platform_analytics view for admin dashboard';
    RAISE NOTICE '  - daily_analytics view for trend analysis';
    RAISE NOTICE '  - Helper functions for venue management';
    RAISE NOTICE '  - Enhanced RLS policies for security';
    RAISE NOTICE '  - Performance optimization indexes';
END $$;

-- Commit the transaction
COMMIT;