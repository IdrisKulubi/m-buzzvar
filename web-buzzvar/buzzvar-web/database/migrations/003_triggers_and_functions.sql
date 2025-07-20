-- Database Triggers and Functions
-- This script creates all necessary triggers, functions, and stored procedures

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN lower(
        regexp_replace(
            regexp_replace(
                regexp_replace(input_text, '[^a-zA-Z0-9\s-]', '', 'g'),
                '\s+', '-', 'g'
            ),
            '-+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate distance between two points (in miles)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN (
        3959 * acos(
            cos(radians(lat1)) * 
            cos(radians(lat2)) * 
            cos(radians(lon2) - radians(lon1)) + 
            sin(radians(lat1)) * 
            sin(radians(lat2))
        )
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get venue average rating
CREATE OR REPLACE FUNCTION get_venue_average_rating(venue_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    avg_rating DECIMAL;
BEGIN
    SELECT CAST(AVG(rating) AS DECIMAL(3,2)) INTO avg_rating
    FROM reviews 
    WHERE venue_id = venue_uuid;
    
    RETURN COALESCE(avg_rating, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get venue review count
CREATE OR REPLACE FUNCTION get_venue_review_count(venue_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    review_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO review_count
    FROM reviews 
    WHERE venue_id = venue_uuid;
    
    RETURN COALESCE(review_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get latest vibe check for venue
CREATE OR REPLACE FUNCTION get_latest_vibe_check(venue_uuid UUID)
RETURNS TABLE(
    crowd_level INTEGER,
    music_volume INTEGER,
    energy_level INTEGER,
    wait_time INTEGER,
    cover_charge DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vc.crowd_level,
        vc.music_volume,
        vc.energy_level,
        vc.wait_time,
        vc.cover_charge,
        vc.created_at
    FROM vibe_checks vc
    WHERE vc.venue_id = venue_uuid
    ORDER BY vc.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Clean up expired verification tokens
    DELETE FROM verification_tokens WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up expired password reset tokens
    DELETE FROM password_reset_tokens WHERE expires_at < NOW();
    
    -- Clean up expired sessions
    DELETE FROM sessions WHERE expires_at < NOW();
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Users table trigger
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sessions table trigger
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Accounts table trigger
CREATE TRIGGER update_accounts_updated_at 
    BEFORE UPDATE ON accounts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Venues table trigger
CREATE TRIGGER update_venues_updated_at 
    BEFORE UPDATE ON venues 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Promotions table trigger
CREATE TRIGGER update_promotions_updated_at 
    BEFORE UPDATE ON promotions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Events table trigger
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Vibe checks table trigger
CREATE TRIGGER update_vibe_checks_updated_at 
    BEFORE UPDATE ON vibe_checks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Reviews table trigger
CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Push tokens table trigger
CREATE TRIGGER update_push_tokens_updated_at 
    BEFORE UPDATE ON push_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Venue analytics table trigger
CREATE TRIGGER update_venue_analytics_updated_at 
    BEFORE UPDATE ON venue_analytics 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGERS FOR BUSINESS LOGIC
-- ============================================================================

-- Auto-generate venue slug from name
CREATE OR REPLACE FUNCTION auto_generate_venue_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug = generate_slug(NEW.name);
        
        -- Ensure uniqueness by appending number if needed
        WHILE EXISTS (SELECT 1 FROM venues WHERE slug = NEW.slug AND id != COALESCE(NEW.id, CAST('00000000-0000-0000-0000-000000000000' AS UUID))) LOOP
            NEW.slug = NEW.slug || '-' || CAST(floor(random() * 1000) AS TEXT);
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_generate_venue_slug_trigger
    BEFORE INSERT OR UPDATE ON venues
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_venue_slug();

-- Update helpful count when vibe check reactions change
CREATE OR REPLACE FUNCTION update_vibe_check_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.reaction_type = 'helpful' THEN
            UPDATE vibe_checks 
            SET helpful_count = helpful_count + 1 
            WHERE id = NEW.vibe_check_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.reaction_type = 'helpful' AND NEW.reaction_type != 'helpful' THEN
            UPDATE vibe_checks 
            SET helpful_count = helpful_count - 1 
            WHERE id = NEW.vibe_check_id;
        ELSIF OLD.reaction_type != 'helpful' AND NEW.reaction_type = 'helpful' THEN
            UPDATE vibe_checks 
            SET helpful_count = helpful_count + 1 
            WHERE id = NEW.vibe_check_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.reaction_type = 'helpful' THEN
            UPDATE vibe_checks 
            SET helpful_count = helpful_count - 1 
            WHERE id = OLD.vibe_check_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vibe_check_helpful_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON vibe_check_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_vibe_check_helpful_count();

-- Update helpful count when review reactions change
CREATE OR REPLACE FUNCTION update_review_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.reaction_type = 'helpful' THEN
            UPDATE reviews 
            SET helpful_count = helpful_count + 1 
            WHERE id = NEW.review_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.reaction_type = 'helpful' AND NEW.reaction_type != 'helpful' THEN
            UPDATE reviews 
            SET helpful_count = helpful_count - 1 
            WHERE id = NEW.review_id;
        ELSIF OLD.reaction_type != 'helpful' AND NEW.reaction_type = 'helpful' THEN
            UPDATE reviews 
            SET helpful_count = helpful_count + 1 
            WHERE id = NEW.review_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.reaction_type = 'helpful' THEN
            UPDATE reviews 
            SET helpful_count = helpful_count - 1 
            WHERE id = OLD.review_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_review_helpful_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON review_reactions
    FOR EACH ROW
    EXECUTE FUNCTION update_review_helpful_count();

-- Update promotion redemption count
CREATE OR REPLACE FUNCTION update_promotion_redemption_count()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be triggered by a promotion_redemptions table
    -- For now, we'll create a placeholder function
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update event attendee count
CREATE OR REPLACE FUNCTION update_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be triggered by an event_attendees table
    -- For now, we'll create a placeholder function
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log user activity
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert activity log for certain actions
    IF TG_TABLE_NAME = 'user_checkins' AND TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_logs (user_id, action, resource_type, resource_id, metadata)
        VALUES (NEW.user_id, 'checkin', 'venue', NEW.venue_id, 
                json_build_object('checkin_datetime', NEW.checkin_datetime));
    ELSIF TG_TABLE_NAME = 'user_favorites' AND TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_logs (user_id, action, resource_type, resource_id)
        VALUES (NEW.user_id, 'favorite', 'venue', NEW.venue_id);
    ELSIF TG_TABLE_NAME = 'user_favorites' AND TG_OP = 'DELETE' THEN
        INSERT INTO user_activity_logs (user_id, action, resource_type, resource_id)
        VALUES (OLD.user_id, 'unfavorite', 'venue', OLD.venue_id);
    ELSIF TG_TABLE_NAME = 'reviews' AND TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_logs (user_id, action, resource_type, resource_id, metadata)
        VALUES (NEW.user_id, 'review', 'venue', NEW.venue_id,
                json_build_object('rating', NEW.rating));
    ELSIF TG_TABLE_NAME = 'vibe_checks' AND TG_OP = 'INSERT' THEN
        INSERT INTO user_activity_logs (user_id, action, resource_type, resource_id, metadata)
        VALUES (NEW.user_id, 'vibe_check', 'venue', NEW.venue_id,
                json_build_object('crowd_level', NEW.crowd_level, 'energy_level', NEW.energy_level));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create activity logging triggers
CREATE TRIGGER log_checkin_activity
    AFTER INSERT ON user_checkins
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_favorite_activity
    AFTER INSERT OR DELETE ON user_favorites
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_review_activity
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

CREATE TRIGGER log_vibe_check_activity
    AFTER INSERT ON vibe_checks
    FOR EACH ROW
    EXECUTE FUNCTION log_user_activity();

-- ============================================================================
-- ANALYTICS TRIGGERS
-- ============================================================================

-- Update venue analytics when certain actions occur
CREATE OR REPLACE FUNCTION update_venue_analytics()
RETURNS TRIGGER AS $$
DECLARE
    target_date DATE := CURRENT_DATE;
    target_venue_id UUID;
BEGIN
    -- Determine venue_id based on the table
    IF TG_TABLE_NAME = 'user_checkins' THEN
        target_venue_id := COALESCE(NEW.venue_id, OLD.venue_id);
    ELSIF TG_TABLE_NAME = 'vibe_checks' THEN
        target_venue_id := COALESCE(NEW.venue_id, OLD.venue_id);
    ELSIF TG_TABLE_NAME = 'reviews' THEN
        target_venue_id := COALESCE(NEW.venue_id, OLD.venue_id);
    ELSIF TG_TABLE_NAME = 'user_favorites' THEN
        target_venue_id := COALESCE(NEW.venue_id, OLD.venue_id);
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Insert or update venue analytics
    INSERT INTO venue_analytics (venue_id, date, checkins, vibe_checks, reviews, favorites)
    VALUES (target_venue_id, target_date, 0, 0, 0, 0)
    ON CONFLICT (venue_id, date) DO NOTHING;

    -- Update specific metrics based on the action
    IF TG_TABLE_NAME = 'user_checkins' AND TG_OP = 'INSERT' THEN
        UPDATE venue_analytics 
        SET checkins = checkins + 1 
        WHERE venue_id = target_venue_id AND date = target_date;
    ELSIF TG_TABLE_NAME = 'vibe_checks' AND TG_OP = 'INSERT' THEN
        UPDATE venue_analytics 
        SET vibe_checks = vibe_checks + 1 
        WHERE venue_id = target_venue_id AND date = target_date;
    ELSIF TG_TABLE_NAME = 'reviews' AND TG_OP = 'INSERT' THEN
        UPDATE venue_analytics 
        SET reviews = reviews + 1 
        WHERE venue_id = target_venue_id AND date = target_date;
    ELSIF TG_TABLE_NAME = 'user_favorites' AND TG_OP = 'INSERT' THEN
        UPDATE venue_analytics 
        SET favorites = favorites + 1 
        WHERE venue_id = target_venue_id AND date = target_date;
    ELSIF TG_TABLE_NAME = 'user_favorites' AND TG_OP = 'DELETE' THEN
        UPDATE venue_analytics 
        SET favorites = GREATEST(favorites - 1, 0)
        WHERE venue_id = target_venue_id AND date = target_date;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create analytics triggers
CREATE TRIGGER update_venue_analytics_checkins
    AFTER INSERT ON user_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_venue_analytics();

CREATE TRIGGER update_venue_analytics_vibe_checks
    AFTER INSERT ON vibe_checks
    FOR EACH ROW
    EXECUTE FUNCTION update_venue_analytics();

CREATE TRIGGER update_venue_analytics_reviews
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_venue_analytics();

CREATE TRIGGER update_venue_analytics_favorites
    AFTER INSERT OR DELETE ON user_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_venue_analytics();

-- ============================================================================
-- NOTIFICATION TRIGGERS
-- ============================================================================

-- Create notification when user gets a new follower
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        NEW.following_id,
        'follow',
        'New Follower',
        'Someone started following you!',
        json_build_object('follower_id', NEW.follower_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_follow_notification_trigger
    AFTER INSERT ON user_follows
    FOR EACH ROW
    EXECUTE FUNCTION create_follow_notification();

-- Create notification for new reviews on user's venues
CREATE OR REPLACE FUNCTION create_venue_review_notification()
RETURNS TRIGGER AS $$
DECLARE
    venue_owner_id UUID;
BEGIN
    -- Get the venue owner
    SELECT owner_id INTO venue_owner_id
    FROM venues
    WHERE id = NEW.venue_id;

    -- Create notification for venue owner if exists and not the reviewer
    IF venue_owner_id IS NOT NULL AND venue_owner_id != NEW.user_id THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            venue_owner_id,
            'review',
            'New Review',
            'Your venue received a new review!',
            json_build_object('venue_id', NEW.venue_id, 'review_id', NEW.id, 'rating', NEW.rating)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_venue_review_notification_trigger
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION create_venue_review_notification();

-- ============================================================================
-- CLEANUP FUNCTIONS AND SCHEDULED TASKS
-- ============================================================================

-- Function to archive old data
CREATE OR REPLACE FUNCTION archive_old_data()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER := 0;
BEGIN
    -- Archive old user activity logs (older than 1 year)
    DELETE FROM user_activity_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Archive old notifications (older than 6 months and read)
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '6 months' AND is_read = TRUE;
    
    -- Clean up old venue analytics (older than 2 years)
    DELETE FROM venue_analytics 
    WHERE date < CURRENT_DATE - INTERVAL '2 years';
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update venue statistics (can be called periodically)
CREATE OR REPLACE FUNCTION update_venue_statistics()
RETURNS VOID AS $$
BEGIN
    -- This function could update cached statistics
    -- For now, it's a placeholder for future enhancements
    RETURN;
END;
$$ LANGUAGE plpgsql;