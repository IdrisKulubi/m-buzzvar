# BuzzVar Database Schema Design

## Overview
This document outlines the complete database schema for the BuzzVar platform, supporting both the mobile app and the upcoming Next.js admin/club owner web application. The web application will communicate with the same database as the mobile app, ensuring data consistency across platforms.

## Core Entities

### 1. Users Table
Primary user authentication and profile information.

```sql
users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  auth_provider VARCHAR(50) DEFAULT 'email', -- 'email', 'google', 'apple'
  auth_provider_id VARCHAR(255)
)
```

### 2. User Profiles Table
Extended user information for mobile app users.

```sql
user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  username VARCHAR(50) UNIQUE,
  bio TEXT,
  avatar_url VARCHAR(500),
  date_of_birth DATE,
  gender VARCHAR(20),
  location_city VARCHAR(100),
  location_country VARCHAR(100),
  preferences JSONB, -- user preferences for recommendations
  privacy_settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### 3. Admin Users Table
Admin-specific user information for web dashboard.

```sql
admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'super_admin', 'admin', 'moderator'
  permissions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id)
)
```

### 4. Venues Table
Club/venue information managed by club owners.

```sql
venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(500),
  instagram VARCHAR(100),
  facebook VARCHAR(100),
  twitter VARCHAR(100),
  cover_image_url VARCHAR(500),
  logo_url VARCHAR(500),
  venue_type VARCHAR(50), -- 'nightclub', 'bar', 'restaurant', 'lounge'
  capacity INTEGER,
  dress_code VARCHAR(100),
  age_restriction INTEGER,
  opening_hours JSONB, -- {day: {open: "20:00", close: "03:00"}}
  amenities JSONB, -- ['vip_area', 'outdoor_seating', 'live_music']
  price_range VARCHAR(10), -- '$', '$$', '$$$', '$$$$'
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### 5. Venue Owners Table
Relationship between users and venues they manage.

```sql
venue_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'owner', -- 'owner', 'manager', 'staff'
  permissions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, venue_id)
)
```

### 6. Events Table
Events/parties at venues.

```sql
events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  cover_image_url VARCHAR(500),
  ticket_price DECIMAL(10, 2),
  ticket_url VARCHAR(500),
  capacity INTEGER,
  event_type VARCHAR(50), -- 'party', 'concert', 'special_event'
  dress_code VARCHAR(100),
  age_restriction INTEGER,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
)
```

### 7. Promotions Table
Marketing promotions for venues.

```sql
promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  promotion_type VARCHAR(50), -- 'discount', 'free_drink', 'vip_access', 'happy_hour'
  discount_percentage INTEGER,
  discount_amount DECIMAL(10, 2),
  promo_code VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  days_of_week JSONB, -- ['monday', 'tuesday', ...]
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  terms_conditions TEXT,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
)
```

### 8. User Interactions Table
Track user engagement with venues/events.

```sql
user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  interaction_type VARCHAR(50) NOT NULL, -- 'like', 'save', 'share', 'check_in', 'review'
  metadata JSONB, -- additional data like rating, comment, etc.
  created_at TIMESTAMP DEFAULT NOW()
)
```

### 9. Reviews Table
User reviews for venues.

```sql
reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  visit_date DATE,
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, venue_id)
)
```

### 10. Analytics Tables

#### User Analytics
```sql
user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  session_count INTEGER DEFAULT 0,
  session_duration INTEGER DEFAULT 0, -- in seconds
  venues_viewed INTEGER DEFAULT 0,
  events_viewed INTEGER DEFAULT 0,
  interactions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
)
```

#### Venue Analytics
```sql
venue_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  check_ins INTEGER DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(venue_id, date)
)
```

#### System Analytics
```sql
system_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_venues INTEGER DEFAULT 0,
  active_venues INTEGER DEFAULT 0,
  total_events INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date)
)
```

### 11. Notifications Table
Push notifications and in-app messages.

```sql
notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50), -- 'promotion', 'event', 'system', 'social'
  related_venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  related_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  is_sent BOOLEAN DEFAULT false,
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### 12. User Sessions Table
Track user sessions for analytics.

```sql
user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE,
  device_info JSONB,
  ip_address INET,
  location_data JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration INTEGER -- in seconds
)
```

### 13. Venue Images Table
Multiple images for venues.

```sql
venue_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  image_url VARCHAR(500) NOT NULL,
  image_type VARCHAR(50), -- 'cover', 'interior', 'exterior', 'menu', 'event'
  caption VARCHAR(200),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### 14. Saved Venues Table
User's saved/favorite venues.

```sql
saved_venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, venue_id)
)
```

### 15. Report System Table
User reports for content moderation.

```sql
reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  report_type VARCHAR(50) NOT NULL, -- 'inappropriate_content', 'fake_info', 'spam', 'harassment'
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES admin_users(id)
)
```

## Indexes for Performance

```sql
-- User-related indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- Venue-related indexes
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_venue_type ON venues(venue_type);
CREATE INDEX idx_venues_is_active ON venues(is_active);
CREATE INDEX idx_venues_location ON venues USING GIST(point(longitude, latitude));

-- Event-related indexes
CREATE INDEX idx_events_venue_id ON events(venue_id);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_is_active ON events(is_active);

-- Analytics indexes
CREATE INDEX idx_user_analytics_date ON user_analytics(date);
CREATE INDEX idx_venue_analytics_date ON venue_analytics(date);
CREATE INDEX idx_system_analytics_date ON system_analytics(date);

-- Interaction indexes
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_venue_id ON user_interactions(venue_id);
CREATE INDEX idx_user_interactions_type ON user_interactions(interaction_type);
```

## Key Relationships

1. **Users → User Profiles**: One-to-one relationship for mobile app users
2. **Users → Admin Users**: One-to-one relationship for admin dashboard users
3. **Users → Venue Owners**: Many-to-many relationship (users can own multiple venues)
4. **Venues → Events**: One-to-many relationship
5. **Venues → Promotions**: One-to-many relationship
6. **Users → Reviews**: Many-to-many through reviews table
7. **Users → Saved Venues**: Many-to-many relationship
8. **Venues → Analytics**: One-to-many relationship for tracking

## Admin Dashboard Features Supported

### Super Admin Features:
- View all system analytics
- Manage admin users
- Moderate content (venues, reviews, users)
- System configuration

### Admin Features:
- View venue analytics
- Moderate venues and reviews
- Manage user reports
- Send notifications

### Club Owner Features:
- Manage their venues
- Create and manage events
- Create and manage promotions
- View venue-specific analytics
- Upload venue images
- Respond to reviews

## Mobile App Features Supported

- User registration and profiles
- Venue discovery and search
- Event browsing
- Reviews and ratings
- Save favorite venues
- Social interactions
- Push notifications
- Location-based recommendations

This schema provides a solid foundation for both your mobile app and the upcoming Next.js admin dashboard.