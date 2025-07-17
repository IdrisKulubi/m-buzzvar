-- Migration: Add vibe_checks table and related functionality
-- Date: 2025-01-17
-- Description: Adds the vibe_checks table with proper constraints, indexes, and RLS policies

-- Create vibe_checks table
CREATE TABLE IF NOT EXISTS public.vibe_checks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    busyness_rating SMALLINT NOT NULL CHECK (busyness_rating >= 1 AND busyness_rating <= 5),
    comment TEXT CHECK (LENGTH(comment) <= 280),
    photo_url TEXT,
    user_latitude DECIMAL(10, 8) NOT NULL,
    user_longitude DECIMAL(11, 8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Constraint: One vibe check per user per venue per hour
    CONSTRAINT unique_user_venue_hour UNIQUE (user_id, venue_id, DATE_TRUNC('hour', created_at))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vibe_checks_venue_recent ON public.vibe_checks(venue_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vibe_checks_recent ON public.vibe_checks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vibe_checks_user ON public.vibe_checks(user_id);

-- Enable RLS
ALTER TABLE public.vibe_checks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ 
BEGIN
    -- Anyone can view vibe checks
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vibe_checks' 
        AND policyname = 'Anyone can view vibe checks'
    ) THEN
        CREATE POLICY "Anyone can view vibe checks" ON public.vibe_checks FOR SELECT USING (true);
    END IF;

    -- Users can insert their own vibe checks
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vibe_checks' 
        AND policyname = 'Users can insert own vibe checks'
    ) THEN
        CREATE POLICY "Users can insert own vibe checks" ON public.vibe_checks FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Users can update their own vibe checks (within 1 hour)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vibe_checks' 
        AND policyname = 'Users can update own recent vibe checks'
    ) THEN
        CREATE POLICY "Users can update own recent vibe checks" ON public.vibe_checks FOR UPDATE 
        USING (auth.uid() = user_id AND created_at > NOW() - INTERVAL '1 hour');
    END IF;

    -- Users can delete their own vibe checks
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vibe_checks' 
        AND policyname = 'Users can delete own vibe checks'
    ) THEN
        CREATE POLICY "Users can delete own vibe checks" ON public.vibe_checks FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Verify the table was created successfully
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vibe_checks') THEN
        RAISE NOTICE 'vibe_checks table created successfully';
    ELSE
        RAISE EXCEPTION 'Failed to create vibe_checks table';
    END IF;
END $$;