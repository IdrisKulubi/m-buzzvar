-- Buzzvar Mobile App Database Schema
-- This script creates the necessary tables for the standalone mobile app

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'venue_owner', 'admin', 'super_admin')),
    university VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Venues table
CREATE TABLE IF NOT EXISTS venues (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    owner_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotions table
CREATE TABLE IF NOT EXISTS promotions (
    id VARCHAR(255) PRIMARY KEY,
    venue_id VARCHAR(255) NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vibe checks table (for user interactions)
CREATE TABLE IF NOT EXISTS vibe_checks (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id VARCHAR(255) NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, venue_id)
);

-- User sessions table (for authentication)
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Venue categories table
CREATE TABLE IF NOT EXISTS venue_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Venue category associations
CREATE TABLE IF NOT EXISTS venue_category_associations (
    venue_id VARCHAR(255) NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    category_id VARCHAR(255) NOT NULL REFERENCES venue_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (venue_id, category_id)
);

-- User favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id VARCHAR(255) NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, venue_id)
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    venue_id VARCHAR(255) REFERENCES venues(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_venues_owner_id ON venues(owner_id);
CREATE INDEX IF NOT EXISTS idx_venues_location ON venues(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_promotions_venue_id ON promotions(venue_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vibe_checks_venue_id ON vibe_checks(venue_id);
CREATE INDEX IF NOT EXISTS idx_vibe_checks_user_id ON vibe_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_access_token ON user_sessions(access_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_venue_id ON user_favorites(venue_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_venue_id ON analytics_events(venue_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Insert default venue categories
INSERT INTO venue_categories (id, name, description, icon) VALUES
    ('cat_nightclub', 'Nightclub', 'Dance clubs and nightlife venues', '🕺'),
    ('cat_bar', 'Bar', 'Bars and pubs', '🍺'),
    ('cat_restaurant', 'Restaurant', 'Dining establishments', '🍽️'),
    ('cat_cafe', 'Cafe', 'Coffee shops and cafes', '☕'),
    ('cat_lounge', 'Lounge', 'Relaxed social venues', '🛋️'),
    ('cat_sports_bar', 'Sports Bar', 'Sports viewing venues', '⚽'),
    ('cat_rooftop', 'Rooftop', 'Rooftop venues with views', '🏙️'),
    ('cat_live_music', 'Live Music', 'Venues with live performances', '🎵')
ON CONFLICT (name) DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vibe_checks_updated_at BEFORE UPDATE ON vibe_checks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for active promotions with venue information
CREATE OR REPLACE VIEW active_promotions_with_venues AS
SELECT 
    p.*,
    v.name as venue_name,
    v.address as venue_address,
    v.latitude as venue_latitude,
    v.longitude as venue_longitude
FROM promotions p
JOIN venues v ON p.venue_id = v.id
WHERE p.is_active = true 
    AND p.start_date <= NOW() 
    AND p.end_date >= NOW();

-- Create a view for venue statistics
CREATE OR REPLACE VIEW venue_statistics AS
SELECT 
    v.id,
    v.name,
    v.owner_id,
    COUNT(DISTINCT p.id) as total_promotions,
    COUNT(DISTINCT CASE WHEN p.is_active = true THEN p.id END) as active_promotions,
    COUNT(DISTINCT vc.id) as total_vibe_checks,
    AVG(vc.rating) as average_rating,
    COUNT(DISTINCT uf.user_id) as favorite_count
FROM venues v
LEFT JOIN promotions p ON v.id = p.venue_id
LEFT JOIN vibe_checks vc ON v.id = vc.venue_id
LEFT JOIN user_favorites uf ON v.id = uf.venue_id
GROUP BY v.id, v.name, v.owner_id;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;