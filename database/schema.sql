-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT,
    email TEXT NOT NULL,
    university TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Venues table
CREATE TABLE public.venues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT, -- JSON string with lat/lng or address
    contact TEXT, -- Phone number or contact info
    hours TEXT, -- Operating hours as JSON or text
    cover_image_url TEXT,
    cover_video_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menus table
CREATE TABLE public.menus (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'food', 'drinks', 'specials'
    content TEXT, -- JSON string or text content
    image_url TEXT, -- URL to menu image
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotions table
CREATE TABLE public.promotions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Party groups table
CREATE TABLE public.party_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TIME NOT NULL,
    max_size INTEGER NOT NULL DEFAULT 10,
    creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group members table
CREATE TABLE public.group_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES public.party_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    approved BOOLEAN DEFAULT FALSE,
    role TEXT DEFAULT 'member', -- 'creator', 'admin', 'member'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Messages table for group chat
CREATE TABLE public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    group_id UUID REFERENCES public.party_groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- 'text', 'image', 'system'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Club views/interactions table (for analytics and recommendations)
CREATE TABLE public.club_views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    club_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    interaction_type TEXT DEFAULT 'view', -- 'view', 'like', 'bookmark', 'share'
    UNIQUE(club_id, user_id, interaction_type)
);

-- User bookmarks/likes table
CREATE TABLE public.user_bookmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, venue_id)
);

-- Create indexes for better performance
CREATE INDEX idx_venues_location ON public.venues(latitude, longitude);
CREATE INDEX idx_party_groups_date ON public.party_groups(date);
CREATE INDEX idx_party_groups_venue ON public.party_groups(venue_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_messages_group ON public.messages(group_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_club_views_user ON public.club_views(user_id);
CREATE INDEX idx_club_views_club ON public.club_views(club_id);

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Venues policies (public read access)
CREATE POLICY "Anyone can view venues" ON public.venues FOR SELECT USING (true);

-- Menus policies (public read access)
CREATE POLICY "Anyone can view menus" ON public.menus FOR SELECT USING (true);

-- Promotions policies (public read access)
CREATE POLICY "Anyone can view promotions" ON public.promotions FOR SELECT USING (true);

-- Party groups policies
CREATE POLICY "Anyone can view public groups" ON public.party_groups FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create groups" ON public.party_groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their groups" ON public.party_groups FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete their groups" ON public.party_groups FOR DELETE USING (auth.uid() = creator_id);

-- Group members policies
CREATE POLICY "Group members can view group membership" ON public.group_members FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.group_members gm 
        WHERE gm.group_id = group_members.group_id 
        AND gm.user_id = auth.uid()
        AND gm.approved = true
    )
);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Group creators can manage members" ON public.group_members FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.party_groups pg 
        WHERE pg.id = group_id 
        AND pg.creator_id = auth.uid()
    )
);

-- Messages policies
CREATE POLICY "Group members can view messages" ON public.messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.group_members gm 
        WHERE gm.group_id = messages.group_id 
        AND gm.user_id = auth.uid()
        AND gm.approved = true
    )
);
CREATE POLICY "Group members can send messages" ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.group_members gm 
        WHERE gm.group_id = messages.group_id 
        AND gm.user_id = auth.uid()
        AND gm.approved = true
    )
);

-- Club views policies
CREATE POLICY "Users can view their own interactions" ON public.club_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create interactions" ON public.club_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their interactions" ON public.club_views FOR UPDATE USING (auth.uid() = user_id);

-- User bookmarks policies
CREATE POLICY "Users can view their bookmarks" ON public.user_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookmarks" ON public.user_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their bookmarks" ON public.user_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON public.menus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_party_groups_updated_at BEFORE UPDATE ON public.party_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically add group creator as approved member
CREATE OR REPLACE FUNCTION add_creator_to_group()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.group_members (group_id, user_id, approved, role)
    VALUES (NEW.id, NEW.creator_id, true, 'creator');
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER add_creator_to_group_trigger
    AFTER INSERT ON public.party_groups
    FOR EACH ROW EXECUTE FUNCTION add_creator_to_group(); 

-- Reviews Table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  UNIQUE (user_id, venue_id)
);

-- RLS Policies for Reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow authenticated users to insert" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update their own review" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);

-- View to get venues with their average rating and review count
CREATE OR REPLACE VIEW public.venues_with_ratings AS
SELECT
  v.*,
  COALESCE(AVG(r.rating), 0)::float AS average_rating,
  COUNT(r.id) AS review_count
FROM
  public.venues v
LEFT JOIN
  public.reviews r ON v.id = r.venue_id
GROUP BY
  v.id; 