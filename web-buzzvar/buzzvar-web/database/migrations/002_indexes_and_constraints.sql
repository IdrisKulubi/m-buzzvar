-- Indexes and Constraints for Optimal Performance
-- This script creates all necessary indexes, constraints, and triggers

-- ============================================================================
-- INDEXES FOR AUTHENTICATION TABLES
-- ============================================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_university ON users(university);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);

-- Sessions table indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);

-- Accounts table indexes
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider);
CREATE INDEX idx_accounts_provider_account_id ON accounts(provider_account_id);

-- Verification tokens indexes
CREATE INDEX idx_verification_tokens_identifier ON verification_tokens(identifier);
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_expires_at ON verification_tokens(expires_at);

-- Password reset tokens indexes
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- ============================================================================
-- INDEXES FOR VENUES AND LOCATIONS
-- ============================================================================

-- Venues table indexes
CREATE INDEX idx_venues_name ON venues(name);
CREATE INDEX idx_venues_slug ON venues(slug);
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_state ON venues(state);
CREATE INDEX idx_venues_country ON venues(country);
CREATE INDEX idx_venues_venue_type ON venues(venue_type);
CREATE INDEX idx_venues_is_active ON venues(is_active);
CREATE INDEX idx_venues_is_verified ON venues(is_verified);
CREATE INDEX idx_venues_owner_id ON venues(owner_id);
CREATE INDEX idx_venues_created_at ON venues(created_at);
CREATE INDEX idx_venues_price_range ON venues(price_range);

-- Geospatial index for location-based queries
CREATE INDEX idx_venues_location ON venues USING GIST(ST_Point(longitude, latitude));

-- Text search index for venue names and descriptions
CREATE INDEX idx_venues_text_search ON venues USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Venue categories indexes
CREATE INDEX idx_venue_categories_name ON venue_categories(name);
CREATE INDEX idx_venue_categories_is_active ON venue_categories(is_active);

-- Venue category mappings indexes
CREATE INDEX idx_venue_category_mappings_venue_id ON venue_category_mappings(venue_id);
CREATE INDEX idx_venue_category_mappings_category_id ON venue_category_mappings(category_id);

-- ============================================================================
-- INDEXES FOR PROMOTIONS AND EVENTS
-- ============================================================================

-- Promotions table indexes
CREATE INDEX idx_promotions_venue_id ON promotions(venue_id);
CREATE INDEX idx_promotions_promotion_type ON promotions(promotion_type);
CREATE INDEX idx_promotions_start_date ON promotions(start_date);
CREATE INDEX idx_promotions_end_date ON promotions(end_date);
CREATE INDEX idx_promotions_is_active ON promotions(is_active);
CREATE INDEX idx_promotions_created_by ON promotions(created_by);
CREATE INDEX idx_promotions_date_range ON promotions(start_date, end_date);

-- Events table indexes
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_start_datetime ON events(start_datetime);
CREATE INDEX idx_events_end_datetime ON events(end_datetime);
CREATE INDEX idx_events_is_active ON events(is_active);
CREATE INDEX idx_events_is_featured ON events(is_featured);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_datetime_range ON events(start_datetime, end_datetime);

-- ============================================================================
-- INDEXES FOR VIBE CHECKS AND SOCIAL FEATURES
-- ============================================================================

-- Vibe checks table indexes
CREATE INDEX idx_vibe_checks_venue_id ON vibe_checks(venue_id);
CREATE INDEX idx_vibe_checks_user_id ON vibe_checks(user_id);
CREATE INDEX idx_vibe_checks_created_at ON vibe_checks(created_at);
CREATE INDEX idx_vibe_checks_is_verified ON vibe_checks(is_verified);
-- Composite index for venue and created_at (for date-based queries)
CREATE INDEX idx_vibe_checks_venue_created_at ON vibe_checks(venue_id, created_at);

-- Vibe check reactions indexes
CREATE INDEX idx_vibe_check_reactions_vibe_check_id ON vibe_check_reactions(vibe_check_id);
CREATE INDEX idx_vibe_check_reactions_user_id ON vibe_check_reactions(user_id);

-- Reviews table indexes
CREATE INDEX idx_reviews_venue_id ON reviews(venue_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created_at ON reviews(created_at);
CREATE INDEX idx_reviews_is_verified ON reviews(is_verified);

-- Review reactions indexes
CREATE INDEX idx_review_reactions_review_id ON review_reactions(review_id);
CREATE INDEX idx_review_reactions_user_id ON review_reactions(user_id);

-- ============================================================================
-- INDEXES FOR USER INTERACTIONS
-- ============================================================================

-- User favorites indexes
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_venue_id ON user_favorites(venue_id);
CREATE INDEX idx_user_favorites_created_at ON user_favorites(created_at);

-- User check-ins indexes
CREATE INDEX idx_user_checkins_user_id ON user_checkins(user_id);
CREATE INDEX idx_user_checkins_venue_id ON user_checkins(venue_id);
CREATE INDEX idx_user_checkins_checkin_datetime ON user_checkins(checkin_datetime);
CREATE INDEX idx_user_checkins_is_private ON user_checkins(is_private);

-- User follows indexes
CREATE INDEX idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following_id ON user_follows(following_id);
CREATE INDEX idx_user_follows_created_at ON user_follows(created_at);

-- ============================================================================
-- INDEXES FOR NOTIFICATIONS
-- ============================================================================

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_is_sent ON notifications(is_sent);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Push tokens indexes
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_platform ON push_tokens(platform);
CREATE INDEX idx_push_tokens_is_active ON push_tokens(is_active);

-- ============================================================================
-- INDEXES FOR ANALYTICS
-- ============================================================================

-- Venue analytics indexes
CREATE INDEX idx_venue_analytics_venue_id ON venue_analytics(venue_id);
CREATE INDEX idx_venue_analytics_date ON venue_analytics(date);
CREATE INDEX idx_venue_analytics_venue_date ON venue_analytics(venue_id, date);

-- User activity logs indexes
CREATE INDEX idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_action ON user_activity_logs(action);
CREATE INDEX idx_user_activity_logs_resource_type ON user_activity_logs(resource_type);
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- ============================================================================
-- INDEXES FOR ADMIN AND MODERATION
-- ============================================================================

-- Admin roles indexes
CREATE INDEX idx_admin_roles_name ON admin_roles(name);
CREATE INDEX idx_admin_roles_is_active ON admin_roles(is_active);

-- Admin user roles indexes
CREATE INDEX idx_admin_user_roles_user_id ON admin_user_roles(user_id);
CREATE INDEX idx_admin_user_roles_role_id ON admin_user_roles(role_id);
CREATE INDEX idx_admin_user_roles_is_active ON admin_user_roles(is_active);

-- Moderation reports indexes
CREATE INDEX idx_moderation_reports_reporter_id ON moderation_reports(reporter_id);
CREATE INDEX idx_moderation_reports_content_type ON moderation_reports(reported_content_type);
CREATE INDEX idx_moderation_reports_content_id ON moderation_reports(reported_content_id);
CREATE INDEX idx_moderation_reports_status ON moderation_reports(status);
CREATE INDEX idx_moderation_reports_moderator_id ON moderation_reports(moderator_id);
CREATE INDEX idx_moderation_reports_created_at ON moderation_reports(created_at);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Venues by location and type
CREATE INDEX idx_venues_location_type ON venues(venue_type, is_active, city);

-- Active promotions by venue
CREATE INDEX idx_active_promotions ON promotions(venue_id, is_active, start_date, end_date) 
WHERE is_active = TRUE;

-- Upcoming events by venue (without NOW() predicate)
CREATE INDEX idx_upcoming_events ON events(venue_id, is_active, start_datetime) 
WHERE is_active = TRUE;

-- Recent vibe checks by venue
CREATE INDEX idx_recent_vibe_checks ON vibe_checks(venue_id, created_at DESC, is_verified);

-- User activity timeline
CREATE INDEX idx_user_activity_timeline ON user_activity_logs(user_id, created_at DESC);

-- ============================================================================
-- PARTIAL INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

-- Active sessions index (without NOW() predicate)
CREATE INDEX idx_active_sessions ON sessions(user_id, expires_at);

-- Unread notifications only
CREATE INDEX idx_unread_notifications ON notifications(user_id, created_at DESC) 
WHERE is_read = FALSE;

-- Active venues only
CREATE INDEX idx_active_venues_location ON venues USING GIST(ST_Point(longitude, latitude)) 
WHERE is_active = TRUE;

-- Verified vibe checks only
CREATE INDEX idx_verified_vibe_checks ON vibe_checks(venue_id, created_at DESC) 
WHERE is_verified = TRUE;

-- ============================================================================
-- ADDITIONAL CONSTRAINTS
-- ============================================================================

-- Ensure venue coordinates are valid
ALTER TABLE venues ADD CONSTRAINT check_latitude 
CHECK (latitude >= -90 AND latitude <= 90);

ALTER TABLE venues ADD CONSTRAINT check_longitude 
CHECK (longitude >= -180 AND longitude <= 180);

-- Ensure promotion dates are logical
ALTER TABLE promotions ADD CONSTRAINT check_promotion_dates 
CHECK (end_date > start_date);

-- Ensure event dates are logical
ALTER TABLE events ADD CONSTRAINT check_event_dates 
CHECK (end_datetime > start_datetime);

-- Ensure ratings are within valid range
ALTER TABLE reviews ADD CONSTRAINT check_review_rating 
CHECK (rating >= 1 AND rating <= 5);

-- Ensure vibe check values are within valid ranges
ALTER TABLE vibe_checks ADD CONSTRAINT check_crowd_level 
CHECK (crowd_level >= 1 AND crowd_level <= 5);

ALTER TABLE vibe_checks ADD CONSTRAINT check_music_volume 
CHECK (music_volume >= 1 AND music_volume <= 5);

ALTER TABLE vibe_checks ADD CONSTRAINT check_energy_level 
CHECK (energy_level >= 1 AND energy_level <= 5);

-- Ensure wait time is reasonable
ALTER TABLE vibe_checks ADD CONSTRAINT check_wait_time 
CHECK (wait_time >= 0 AND wait_time <= 480); -- Max 8 hours

-- Ensure cover charge is non-negative
ALTER TABLE vibe_checks ADD CONSTRAINT check_cover_charge 
CHECK (cover_charge >= 0);

-- Ensure venue capacity is reasonable
ALTER TABLE venues ADD CONSTRAINT check_venue_capacity 
CHECK (capacity IS NULL OR capacity > 0);

-- Ensure price range is valid
ALTER TABLE venues ADD CONSTRAINT check_price_range 
CHECK (price_range IS NULL OR (price_range >= 1 AND price_range <= 4));

-- Ensure discount percentage is valid
ALTER TABLE promotions ADD CONSTRAINT check_discount_percentage 
CHECK (discount_percentage IS NULL OR (discount_percentage >= 0 AND discount_percentage <= 100));

-- Ensure minimum spend is non-negative
ALTER TABLE promotions ADD CONSTRAINT check_minimum_spend 
CHECK (minimum_spend IS NULL OR minimum_spend >= 0);

-- Ensure max redemptions is positive
ALTER TABLE promotions ADD CONSTRAINT check_max_redemptions 
CHECK (max_redemptions IS NULL OR max_redemptions > 0);

-- Ensure current redemptions doesn't exceed max
ALTER TABLE promotions ADD CONSTRAINT check_current_redemptions 
CHECK (current_redemptions >= 0 AND (max_redemptions IS NULL OR current_redemptions <= max_redemptions));

-- Ensure event capacity constraints
ALTER TABLE events ADD CONSTRAINT check_event_capacity 
CHECK (max_attendees IS NULL OR max_attendees > 0);

ALTER TABLE events ADD CONSTRAINT check_current_attendees 
CHECK (current_attendees >= 0 AND (max_attendees IS NULL OR current_attendees <= max_attendees));

-- Ensure ticket price is non-negative
ALTER TABLE events ADD CONSTRAINT check_ticket_price 
CHECK (ticket_price IS NULL OR ticket_price >= 0);