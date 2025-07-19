-- Web Admin Portal Database Extensions
-- Migration: 003_web_portal_extensions.sql
-- Description: Add venue ownership management, analytics views, and performance optimizations for web portal

-- ============================================================================
-- 1. VENUE OWNERS TABLE
-- ============================================================================

-- Create venue_owners table to manage venue ownership and roles
CREATE TABLE public.venue_owners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Ensure unique user-venue combinations
    CONSTRAINT unique_user_venue UNIQUE (user_id, venue_id)
);

-- Add indexes for performance
CREATE INDEX idx_venue_owners_user_id ON public.venue_owners(user_id);
CREATE INDEX idx_venue_owners_venue_id ON public.venue_owners(venue_id);
CREATE INDEX idx_venue_owners_role ON public.venue_owners(role);

-- Add updated_at trigger
CREATE TRIGGER update_venue_owners_updated_at 
    BEFORE UPDATE ON public.venue_owners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. RLS POLICIES FOR VENUE OWNERS
-- ============================================================================

-- Enable RLS
ALTER TABLE public.venue_owners ENABLE ROW LEVEL SECURITY;

-- Venue owners can view their associations
CREATE POLICY "Venue owners can view their associations" ON public.venue_owners 
FOR SELECT USING (auth.uid() = user_id);

-- Venue owners can manage their staff (owners can add/remove managers and staff)
CREATE POLICY "Venue owners can manage their staff" ON public.venue_owners 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.venue_owners vo 
        WHERE vo.venue_id = venue_owners.venue_id 
        AND vo.user_id = auth.uid() 
        AND vo.role = 'owner'
    )
);

-- Users can be added as venue owners (for initial venue registration)
CREATE POLICY "Users can be added as venue owners" ON public.venue_owners 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. UPDATE EXISTING POLICIES FOR VENUE MANAGEMENT
-- ============================================================================

-- Drop existing venue policies to add ownership-based access
DROP POLICY IF EXISTS "Anyone can view venues" ON public.venues;
DROP POLICY IF EXISTS "Anyone can view menus" ON public.menus;
DROP POLICY IF EXISTS "Anyone can view promotions" ON public.promotions;

-- New venue policies with ownership support
CREATE POLICY "Anyone can view venues" ON public.venues FOR SELECT USING (true);

CREATE POLICY "Venue owners can update their venues" ON public.venues FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.venue_owners vo 
        WHERE vo.venue_id = venues.id 
        AND vo.user_id = auth.uid()
        AND vo.role IN ('owner', 'manager')
    )
);

CREATE POLICY "Venue owners can insert venues" ON public.venues FOR INSERT WITH CHECK (true);

-- Menu policies with ownership
CREATE POLICY "Anyone can view menus" ON public.menus FOR SELECT USING (true);

CREATE POLICY "Venue owners can manage menus" ON public.menus FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.venue_owners vo 
        WHERE vo.venue_id = menus.venue_id 
        AND vo.user_id = auth.uid()
        AND vo.role IN ('owner', 'manager')
    )
);

-- Promotion policies with ownership
CREATE POLICY "Anyone can view promotions" ON public.promotions FOR SELECT USING (true);

CREATE POLICY "Venue owners can manage promotions" ON public.promotions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.venue_owners vo 
        WHERE vo.venue_id = promotions.venue_id 
        AND vo.user_id = auth.uid()
        AND vo.role IN ('owner', 'manager')
    )
);

-- ============================================================================
-- 4. ANALYTICS VIEWS
-- ============================================================================

-- Venue analytics view with comprehensive metrics
CREATE OR REPLACE VIEW public.venue_analytics AS
SELECT 
    v.id as venue_id,
    v.name as venue_name,
    v.created_at as venue_created_at,
    
    -- View metrics
    COUNT(DISTINCT cv.user_id) as total_views,
    COUNT(DISTINCT CASE WHEN cv.viewed_at > NOW() - INTERVAL '7 days' THEN cv.user_id END) as views_last_7_days,
    COUNT(DISTINCT CASE WHEN cv.viewed_at > NOW() - INTERVAL '30 days' THEN cv.user_id END) as views_last_30_days,
    
    -- Bookmark metrics
    COUNT(DISTINCT ub.user_id) as total_bookmarks,
    COUNT(DISTINCT CASE WHEN ub.created_at > NOW() - INTERVAL '7 days' THEN ub.user_id END) as bookmarks_last_7_days,
    COUNT(DISTINCT CASE WHEN ub.created_at > NOW() - INTERVAL '30 days' THEN ub.user_id END) as bookmarks_last_30_days,
    
    -- Vibe check metrics
    COUNT(DISTINCT vc.id) as total_vibe_checks,
    COUNT(DISTINCT CASE WHEN vc.created_at > NOW() - INTERVAL '7 days' THEN vc.id END) as vibe_checks_last_7_days,
    COUNT(DISTINCT CASE WHEN vc.created_at > NOW() - INTERVAL '30 days' THEN vc.id END) as vibe_checks_last_30_days,
    COALESCE(AVG(vc.busyness_rating), 0) as avg_busyness_rating,
    COALESCE(AVG(CASE WHEN vc.created_at > NOW() - INTERVAL '7 days' THEN vc.busyness_rating END), 0) as avg_busyness_rating_7_days,
    
    -- Review metrics
    COUNT(DISTINCT r.id) as total_reviews,
    COALESCE(AVG(r.rating), 0) as avg_rating,
    
    -- Promotion metrics
    COUNT(DISTINCT p.id) as total_promotions,
    COUNT(DISTINCT CASE WHEN p.is_active = true THEN p.id END) as active_promotions,
    
    -- Party group metrics
    COUNT(DISTINCT pg.id) as total_party_groups,
    COUNT(DISTINCT CASE WHEN pg.date >= CURRENT_DATE THEN pg.id END) as upcoming_party_groups

FROM public.venues v
LEFT JOIN public.club_views cv ON v.id = cv.club_id
LEFT JOIN public.user_bookmarks ub ON v.id = ub.venue_id
LEFT JOIN public.vibe_checks vc ON v.id = vc.venue_id
LEFT JOIN public.reviews r ON v.id = r.venue_id
LEFT JOIN public.promotions p ON v.id = p.venue_id
LEFT JOIN public.party_groups pg ON v.id = pg.venue_id
GROUP BY v.id, v.name, v.created_at;

-- Platform-wide analytics view for admin dashboard
CREATE OR REPLACE VIEW public.platform_analytics AS
SELECT 
    -- User metrics
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT CASE WHEN u.created_at > NOW() - INTERVAL '7 days' THEN u.id END) as new_users_last_7_days,
    COUNT(DISTINCT CASE WHEN u.created_at > NOW() - INTERVAL '30 days' THEN u.id END) as new_users_last_30_days,
    
    -- Venue metrics
    COUNT(DISTINCT v.id) as total_venues,
    COUNT(DISTINCT CASE WHEN v.created_at > NOW() - INTERVAL '7 days' THEN v.id END) as new_venues_last_7_days,
    COUNT(DISTINCT CASE WHEN v.created_at > NOW() - INTERVAL '30 days' THEN v.id END) as new_venues_last_30_days,
    
    -- Engagement metrics
    COUNT(DISTINCT vc.id) as total_vibe_checks,
    COUNT(DISTINCT CASE WHEN vc.created_at > NOW() - INTERVAL '7 days' THEN vc.id END) as vibe_checks_last_7_days,
    COUNT(DISTINCT CASE WHEN vc.created_at > NOW() - INTERVAL '30 days' THEN vc.id END) as vibe_checks_last_30_days,
    
    -- Review metrics
    COUNT(DISTINCT r.id) as total_reviews,
    COALESCE(AVG(r.rating), 0) as platform_avg_rating,
    
    -- Promotion metrics
    COUNT(DISTINCT p.id) as total_promotions,
    COUNT(DISTINCT CASE WHEN p.is_active = true THEN p.id END) as active_promotions,
    
    -- Party group metrics
    COUNT(DISTINCT pg.id) as total_party_groups,
    COUNT(DISTINCT CASE WHEN pg.date >= CURRENT_DATE THEN pg.id END) as upcoming_party_groups,
    
    -- Bookmark metrics
    COUNT(DISTINCT ub.id) as total_bookmarks,
    COUNT(DISTINCT CASE WHEN ub.created_at > NOW() - INTERVAL '7 days' THEN ub.id END) as bookmarks_last_7_days

FROM public.users u
CROSS JOIN public.venues v
LEFT JOIN public.vibe_checks vc ON true
LEFT JOIN public.reviews r ON true
LEFT JOIN public.promotions p ON true
LEFT JOIN public.party_groups pg ON true
LEFT JOIN public.user_bookmarks ub ON true;

-- Daily analytics view for trend analysis
CREATE OR REPLACE VIEW public.daily_analytics AS
SELECT 
    date_trunc('day', generate_series(
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE,
        INTERVAL '1 day'
    )) as date,
    
    -- Daily user registrations
    COALESCE(u.new_users, 0) as new_users,
    
    -- Daily venue registrations
    COALESCE(v.new_venues, 0) as new_venues,
    
    -- Daily vibe checks
    COALESCE(vc.vibe_checks, 0) as vibe_checks,
    
    -- Daily reviews
    COALESCE(r.reviews, 0) as reviews,
    
    -- Daily bookmarks
    COALESCE(ub.bookmarks, 0) as bookmarks

FROM generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    INTERVAL '1 day'
) as dates(date)

LEFT JOIN (
    SELECT date_trunc('day', created_at) as date, COUNT(*) as new_users
    FROM public.users
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY date_trunc('day', created_at)
) u ON dates.date = u.date

LEFT JOIN (
    SELECT date_trunc('day', created_at) as date, COUNT(*) as new_venues
    FROM public.venues
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY date_trunc('day', created_at)
) v ON dates.date = v.date

LEFT JOIN (
    SELECT date_trunc('day', created_at) as date, COUNT(*) as vibe_checks
    FROM public.vibe_checks
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY date_trunc('day', created_at)
) vc ON dates.date = vc.date

LEFT JOIN (
    SELECT date_trunc('day', created_at) as date, COUNT(*) as reviews
    FROM public.reviews
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY date_trunc('day', created_at)
) r ON dates.date = r.date

LEFT JOIN (
    SELECT date_trunc('day', created_at) as date, COUNT(*) as bookmarks
    FROM public.user_bookmarks
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY date_trunc('day', created_at)
) ub ON dates.date = ub.date

ORDER BY dates.date;

-- ============================================================================
-- 5. PERFORMANCE OPTIMIZATION INDEXES
-- ============================================================================

-- Indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_club_views_viewed_at ON public.club_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_user_bookmarks_created_at ON public.user_bookmarks(created_at);
CREATE INDEX IF NOT EXISTS idx_vibe_checks_created_at_venue ON public.vibe_checks(created_at, venue_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON public.promotions(is_active, venue_id);
CREATE INDEX IF NOT EXISTS idx_party_groups_date_venue ON public.party_groups(date, venue_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_venues_created_location ON public.venues(created_at, latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_users_created_university ON public.users(created_at, university);

-- Partial indexes for active data
CREATE INDEX IF NOT EXISTS idx_promotions_active_dates ON public.promotions(venue_id, start_date, end_date) 
WHERE is_active = true;

-- ============================================================================
-- 6. FUNCTIONS FOR WEB PORTAL
-- ============================================================================

-- Function to get venue ownership for a user
CREATE OR REPLACE FUNCTION get_user_venues(user_uuid UUID)
RETURNS TABLE (
    venue_id UUID,
    venue_name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vo.venue_id,
        v.name as venue_name,
        vo.role,
        vo.created_at
    FROM public.venue_owners vo
    JOIN public.venues v ON vo.venue_id = v.id
    WHERE vo.user_id = user_uuid
    ORDER BY vo.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is venue owner/manager
CREATE OR REPLACE FUNCTION is_venue_owner(user_uuid UUID, venue_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.venue_owners 
        WHERE user_id = user_uuid 
        AND venue_id = venue_uuid 
        AND role IN ('owner', 'manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get venue analytics for a specific venue
CREATE OR REPLACE FUNCTION get_venue_analytics_detailed(venue_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    metric_date DATE,
    daily_views BIGINT,
    daily_bookmarks BIGINT,
    daily_vibe_checks BIGINT,
    avg_busyness_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        date_trunc('day', generate_series(
            CURRENT_DATE - INTERVAL '1 day' * days_back,
            CURRENT_DATE,
            INTERVAL '1 day'
        ))::DATE as metric_date,
        
        COALESCE(cv.daily_views, 0) as daily_views,
        COALESCE(ub.daily_bookmarks, 0) as daily_bookmarks,
        COALESCE(vc.daily_vibe_checks, 0) as daily_vibe_checks,
        COALESCE(vc.avg_busyness_rating, 0) as avg_busyness_rating
        
    FROM generate_series(
        CURRENT_DATE - INTERVAL '1 day' * days_back,
        CURRENT_DATE,
        INTERVAL '1 day'
    ) as dates(date)
    
    LEFT JOIN (
        SELECT 
            date_trunc('day', viewed_at)::DATE as date, 
            COUNT(DISTINCT user_id) as daily_views
        FROM public.club_views
        WHERE club_id = venue_uuid
        AND viewed_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
        GROUP BY date_trunc('day', viewed_at)::DATE
    ) cv ON dates.date::DATE = cv.date
    
    LEFT JOIN (
        SELECT 
            date_trunc('day', created_at)::DATE as date, 
            COUNT(*) as daily_bookmarks
        FROM public.user_bookmarks
        WHERE venue_id = venue_uuid
        AND created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
        GROUP BY date_trunc('day', created_at)::DATE
    ) ub ON dates.date::DATE = ub.date
    
    LEFT JOIN (
        SELECT 
            date_trunc('day', created_at)::DATE as date, 
            COUNT(*) as daily_vibe_checks,
            AVG(busyness_rating) as avg_busyness_rating
        FROM public.vibe_checks
        WHERE venue_id = venue_uuid
        AND created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
        GROUP BY date_trunc('day', created_at)::DATE
    ) vc ON dates.date::DATE = vc.date
    
    ORDER BY dates.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant access to analytics views for authenticated users
GRANT SELECT ON public.venue_analytics TO authenticated;
GRANT SELECT ON public.platform_analytics TO authenticated;
GRANT SELECT ON public.daily_analytics TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_venues(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_venue_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_venue_analytics_detailed(UUID, INTEGER) TO authenticated;

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.venue_owners IS 'Manages venue ownership and staff roles for the web admin portal';
COMMENT ON VIEW public.venue_analytics IS 'Comprehensive analytics view for individual venues';
COMMENT ON VIEW public.platform_analytics IS 'Platform-wide analytics for admin dashboard';
COMMENT ON VIEW public.daily_analytics IS 'Daily trend analytics for the last 30 days';
COMMENT ON FUNCTION get_user_venues(UUID) IS 'Returns all venues owned/managed by a user';
COMMENT ON FUNCTION is_venue_owner(UUID, UUID) IS 'Checks if user has owner/manager access to venue';
COMMENT ON FUNCTION get_venue_analytics_detailed(UUID, INTEGER) IS 'Returns detailed daily analytics for a venue';