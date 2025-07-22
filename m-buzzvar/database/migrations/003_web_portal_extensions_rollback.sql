-- Rollback Script for Web Portal Extensions
-- Migration: 003_web_portal_extensions_rollback.sql
-- Description: Rollback all changes made by 003_web_portal_extensions.sql

-- ============================================================================
-- 1. DROP FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS get_venue_analytics_detailed(UUID, INTEGER);
DROP FUNCTION IF EXISTS is_venue_owner(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_venues(UUID);

-- ============================================================================
-- 2. DROP VIEWS
-- ============================================================================

DROP VIEW IF EXISTS public.daily_analytics;
DROP VIEW IF EXISTS public.platform_analytics;
DROP VIEW IF EXISTS public.venue_analytics;

-- ============================================================================
-- 3. DROP INDEXES
-- ============================================================================

-- Drop performance optimization indexes
DROP INDEX IF EXISTS idx_party_groups_upcoming;
DROP INDEX IF EXISTS idx_promotions_active_dates;
DROP INDEX IF EXISTS idx_users_created_university;
DROP INDEX IF EXISTS idx_venues_created_location;
DROP INDEX IF EXISTS idx_party_groups_date_venue;
DROP INDEX IF EXISTS idx_promotions_active;
DROP INDEX IF EXISTS idx_reviews_created_at;
DROP INDEX IF EXISTS idx_vibe_checks_created_at_venue;
DROP INDEX IF EXISTS idx_user_bookmarks_created_at;
DROP INDEX IF EXISTS idx_club_views_viewed_at;

-- Drop venue_owners indexes
DROP INDEX IF EXISTS idx_venue_owners_role;
DROP INDEX IF EXISTS idx_venue_owners_venue_id;
DROP INDEX IF EXISTS idx_venue_owners_user_id;

-- ============================================================================
-- 4. DROP POLICIES
-- ============================================================================

-- Drop new venue management policies
DROP POLICY IF EXISTS "Venue owners can manage promotions" ON public.promotions;
DROP POLICY IF EXISTS "Venue owners can manage menus" ON public.menus;
DROP POLICY IF EXISTS "Venue owners can insert venues" ON public.venues;
DROP POLICY IF EXISTS "Venue owners can update their venues" ON public.venues;

-- Drop venue_owners policies
DROP POLICY IF EXISTS "Users can be added as venue owners" ON public.venue_owners;
DROP POLICY IF EXISTS "Venue owners can manage their staff" ON public.venue_owners;
DROP POLICY IF EXISTS "Venue owners can view their associations" ON public.venue_owners;

-- ============================================================================
-- 5. DROP TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_venue_owners_updated_at ON public.venue_owners;

-- ============================================================================
-- 6. DROP TABLES
-- ============================================================================

DROP TABLE IF EXISTS public.venue_owners;

-- ============================================================================
-- 7. RESTORE ORIGINAL POLICIES
-- ============================================================================

-- Restore original venue policies
CREATE POLICY "Anyone can view venues" ON public.venues FOR SELECT USING (true);

-- Restore original menu policies
CREATE POLICY "Anyone can view menus" ON public.menus FOR SELECT USING (true);

-- Restore original promotion policies
CREATE POLICY "Anyone can view promotions" ON public.promotions FOR SELECT USING (true);

-- ============================================================================
-- 8. REVOKE GRANTS
-- ============================================================================

-- Note: Cannot revoke grants on dropped objects, but documenting what was granted
-- REVOKE SELECT ON public.venue_analytics FROM authenticated;
-- REVOKE SELECT ON public.platform_analytics FROM authenticated;
-- REVOKE SELECT ON public.daily_analytics FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION get_user_venues(UUID) FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION is_venue_owner(UUID, UUID) FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION get_venue_analytics_detailed(UUID, INTEGER) FROM authenticated;

-- ============================================================================
-- 9. COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== WEB PORTAL EXTENSIONS ROLLBACK COMPLETED ===';
    RAISE NOTICE 'All changes from 003_web_portal_extensions.sql have been reverted.';
    RAISE NOTICE 'Database is restored to its previous state.';
END $$;