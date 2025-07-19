-- Performance Optimizations for Vibe Checks
-- Run this directly in Supabase SQL Editor

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_vibe_checks_venue_created_desc 
ON public.vibe_checks(venue_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vibe_checks_user_venue_created 
ON public.vibe_checks(user_id, venue_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vibe_checks_created_venue 
ON public.vibe_checks(created_at DESC, venue_id);

-- Add index for busyness rating aggregations
CREATE INDEX IF NOT EXISTS idx_vibe_checks_venue_rating_created 
ON public.vibe_checks(venue_id, busyness_rating, created_at DESC);

-- Optimize users table for joins
CREATE INDEX IF NOT EXISTS idx_users_id_name_avatar 
ON public.users(id) INCLUDE (name, avatar_url);

-- Optimize venues table for joins
CREATE INDEX IF NOT EXISTS idx_venues_id_name_address 
ON public.venues(id) INCLUDE (name, address);

-- Add materialized view for venue statistics
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

-- Create indexes on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_vibe_stats_venue_id 
ON public.venue_vibe_stats(venue_id);

CREATE INDEX IF NOT EXISTS idx_venue_vibe_stats_recent_count 
ON public.venue_vibe_stats(recent_count_4h DESC);

CREATE INDEX IF NOT EXISTS idx_venue_vibe_stats_live_activity 
ON public.venue_vibe_stats(has_live_activity, recent_count_4h DESC);

-- Function to refresh venue stats
CREATE OR REPLACE FUNCTION refresh_venue_vibe_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW public.venue_vibe_stats;
END;
$$ LANGUAGE plpgsql;

-- Function for efficient venue vibe check queries
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

-- Function for efficient live feed queries
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

-- Function for rate limit checking
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
    SELECT vc.created_at INTO last_check
    FROM public.vibe_checks vc
    WHERE vc.user_id = p_user_id 
        AND vc.venue_id = p_venue_id
        AND vc.created_at > NOW() - INTERVAL '1 hour'
    ORDER BY vc.created_at DESC
    LIMIT 1;
    
    IF last_check IS NULL THEN
        RETURN QUERY SELECT TRUE, 0, NULL::TIMESTAMPTZ;
    ELSE
        time_diff := EXTRACT(EPOCH FROM (last_check + INTERVAL '1 hour' - NOW()))::INTEGER;
        
        IF time_diff <= 0 THEN
            RETURN QUERY SELECT TRUE, 0, last_check;
        ELSE
            RETURN QUERY SELECT FALSE, time_diff, last_check;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable pg_trgm extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN index for text search on comments (without WHERE clause to avoid immutability issues)
CREATE INDEX IF NOT EXISTS idx_vibe_checks_comment_gin 
ON public.vibe_checks USING gin(comment gin_trgm_ops);

-- Update table statistics
ANALYZE public.vibe_checks;
ANALYZE public.users;
ANALYZE public.venues;

-- Set autovacuum parameters for better performance
ALTER TABLE public.vibe_checks SET (autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE public.users SET (autovacuum_analyze_scale_factor = 0.05);
ALTER TABLE public.venues SET (autovacuum_analyze_scale_factor = 0.05);