-- Performance Optimizations for Vibe Checks
-- This migration adds additional indexes and optimizations for better query performance

-- Add composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_venue_created_desc 
ON public.vibe_checks(venue_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_user_venue_created 
ON public.vibe_checks(user_id, venue_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_created_venue 
ON public.vibe_checks(created_at DESC, venue_id);

-- Add partial indexes for recent data (last 24 hours)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_recent_venue 
ON public.vibe_checks(venue_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '24 hours';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_recent_global 
ON public.vibe_checks(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Add index for rate limiting queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_rate_limit 
ON public.vibe_checks(user_id, venue_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Add index for busyness rating aggregations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_venue_rating_created 
ON public.vibe_checks(venue_id, busyness_rating, created_at DESC);

-- Optimize users table for joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_id_name_avatar 
ON public.users(id) INCLUDE (name, avatar_url);

-- Optimize venues table for joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_id_name_address 
ON public.venues(id) INCLUDE (name, address);

-- Add materialized view for venue statistics (updated periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.venue_vibe_stats AS
SELECT 
    v.id as venue_id,
    v.name as venue_name,
    v.address as venue_address,
    COUNT(vc.id) as total_vibe_checks,
    COUNT(CASE WHEN vc.created_at > NOW() - INTERVAL '4 hours' THEN 1 END) as recent_count_4h,
    COUNT(CASE WHEN vc.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as recent_count_24h,
    AVG(CASE WHEN vc.created_at > NOW() - INTERVAL '4 hours' THEN vc.busyness_rating END) as avg_busyness_4h,
    AVG(CASE WHEN vc.created_at > NOW() - INTERVAL '24 hours' THEN vc.busyness_rating END) as avg_busyness_24h,
    MAX(vc.created_at) as latest_vibe_check,
    COUNT(CASE WHEN vc.created_at > NOW() - INTERVAL '2 hours' THEN 1 END) > 0 as has_live_activity
FROM public.venues v
LEFT JOIN public.vibe_checks vc ON v.id = vc.venue_id
GROUP BY v.id, v.name, v.address;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_vibe_stats_venue_id 
ON public.venue_vibe_stats(venue_id);

CREATE INDEX IF NOT EXISTS idx_venue_vibe_stats_recent_count 
ON public.venue_vibe_stats(recent_count_4h DESC);

CREATE INDEX IF NOT EXISTS idx_venue_vibe_stats_live_activity 
ON public.venue_vibe_stats(has_live_activity, recent_count_4h DESC);

-- Function to refresh venue stats materialized view
CREATE OR REPLACE FUNCTION refresh_venue_vibe_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.venue_vibe_stats;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically refresh stats when vibe checks are inserted/updated/deleted
CREATE OR REPLACE FUNCTION trigger_refresh_venue_stats()
RETURNS trigger AS $$
BEGIN
    -- Use pg_notify to trigger async refresh
    PERFORM pg_notify('refresh_venue_stats', '');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic stats refresh (debounced via notification)
DROP TRIGGER IF EXISTS trigger_vibe_check_stats_refresh ON public.vibe_checks;
CREATE TRIGGER trigger_vibe_check_stats_refresh
    AFTER INSERT OR UPDATE OR DELETE ON public.vibe_checks
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_venue_stats();

-- Create function for efficient vibe check queries with caching hints
CREATE OR REPLACE FUNCTION get_venue_vibe_checks_optimized(
    p_venue_id UUID,
    p_hours_back INTEGER DEFAULT 4,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    venue_id UUID,
    user_id UUID,
    busyness_rating SMALLINT,
    comment TEXT,
    photo_url TEXT,
    user_latitude DECIMAL,
    user_longitude DECIMAL,
    created_at TIMESTAMPTZ,
    user_name TEXT,
    user_avatar_url TEXT,
    venue_name TEXT,
    venue_address TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vc.id,
        vc.venue_id,
        vc.user_id,
        vc.busyness_rating,
        vc.comment,
        vc.photo_url,
        vc.user_latitude,
        vc.user_longitude,
        vc.created_at,
        u.name as user_name,
        u.avatar_url as user_avatar_url,
        v.name as venue_name,
        v.address as venue_address
    FROM public.vibe_checks vc
    INNER JOIN public.users u ON vc.user_id = u.id
    INNER JOIN public.venues v ON vc.venue_id = v.id
    WHERE vc.venue_id = p_venue_id
        AND vc.created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    ORDER BY vc.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function for efficient live feed queries
CREATE OR REPLACE FUNCTION get_live_vibe_checks_optimized(
    p_hours_back INTEGER DEFAULT 4,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    venue_id UUID,
    user_id UUID,
    busyness_rating SMALLINT,
    comment TEXT,
    photo_url TEXT,
    user_latitude DECIMAL,
    user_longitude DECIMAL,
    created_at TIMESTAMPTZ,
    user_name TEXT,
    user_avatar_url TEXT,
    venue_name TEXT,
    venue_address TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vc.id,
        vc.venue_id,
        vc.user_id,
        vc.busyness_rating,
        vc.comment,
        vc.photo_url,
        vc.user_latitude,
        vc.user_longitude,
        vc.created_at,
        u.name as user_name,
        u.avatar_url as user_avatar_url,
        v.name as venue_name,
        v.address as venue_address
    FROM public.vibe_checks vc
    INNER JOIN public.users u ON vc.user_id = u.id
    INNER JOIN public.venues v ON vc.venue_id = v.id
    WHERE vc.created_at >= NOW() - (p_hours_back || ' hours')::INTERVAL
    ORDER BY vc.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function for efficient rate limit checking
CREATE OR REPLACE FUNCTION check_user_rate_limit(
    p_user_id UUID,
    p_venue_id UUID
)
RETURNS TABLE (
    can_post BOOLEAN,
    time_until_reset INTEGER,
    last_vibe_check TIMESTAMPTZ
) AS $$
DECLARE
    last_check TIMESTAMPTZ;
    time_diff INTEGER;
BEGIN
    -- Get the most recent vibe check for this user at this venue within the last hour
    SELECT vc.created_at INTO last_check
    FROM public.vibe_checks vc
    WHERE vc.user_id = p_user_id 
        AND vc.venue_id = p_venue_id
        AND vc.created_at > NOW() - INTERVAL '1 hour'
    ORDER BY vc.created_at DESC
    LIMIT 1;
    
    IF last_check IS NULL THEN
        -- No recent vibe check, user can post
        RETURN QUERY SELECT TRUE, 0, NULL::TIMESTAMPTZ;
    ELSE
        -- Calculate time until user can post again
        time_diff := EXTRACT(EPOCH FROM (last_check + INTERVAL '1 hour' - NOW()))::INTEGER;
        
        IF time_diff <= 0 THEN
            -- Rate limit has expired
            RETURN QUERY SELECT TRUE, 0, last_check;
        ELSE
            -- Still rate limited
            RETURN QUERY SELECT FALSE, time_diff, last_check;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add table statistics for query planner optimization
ANALYZE public.vibe_checks;
ANALYZE public.users;
ANALYZE public.venues;

-- Set up automatic statistics collection
ALTER TABLE public.vibe_checks SET (autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE public.users SET (autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE public.venues SET (autovacuum_analyze_scale_factor = 0.05);

-- Create extension for better text search if needed
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN index for text search on comments (if full-text search is needed)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibe_checks_comment_gin 
ON public.vibe_checks USING gin(comment gin_trgm_ops)
WHERE comment IS NOT NULL;

-- Add comments for documentation
COMMENT ON INDEX idx_vibe_checks_venue_created_desc IS 'Optimizes venue-specific vibe check queries ordered by creation time';
COMMENT ON INDEX idx_vibe_checks_user_venue_created IS 'Optimizes user rate limiting queries';
COMMENT ON INDEX idx_vibe_checks_recent_venue IS 'Partial index for recent venue vibe checks (last 24h)';
COMMENT ON INDEX idx_vibe_checks_recent_global IS 'Partial index for recent global vibe checks (last 24h)';
COMMENT ON MATERIALIZED VIEW venue_vibe_stats IS 'Cached venue statistics for improved performance';
COMMENT ON FUNCTION get_venue_vibe_checks_optimized IS 'Optimized function for fetching venue vibe checks with joins';
COMMENT ON FUNCTION get_live_vibe_checks_optimized IS 'Optimized function for fetching live feed vibe checks';
COMMENT ON FUNCTION check_user_rate_limit IS 'Efficient rate limit checking for users';