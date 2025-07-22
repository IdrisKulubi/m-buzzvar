# Web Portal Database Extensions - Migration 003

## Overview

This migration adds the necessary database schema extensions to support the Web Admin Portal functionality. It introduces venue ownership management, comprehensive analytics views, and performance optimizations while maintaining full compatibility with the existing mobile app.

## Changes Made

### 1. New Tables

#### `venue_owners`
- Manages venue ownership and staff roles
- Links users to venues with role-based permissions
- Supports roles: `owner`, `manager`, `staff`
- Includes unique constraints to prevent duplicate associations

### 2. Analytics Views

#### `venue_analytics`
- Comprehensive metrics for individual venues
- Includes views, bookmarks, vibe checks, reviews, and promotions
- Provides both total and time-period specific metrics (7-day, 30-day)

#### `platform_analytics`
- Platform-wide statistics for admin dashboard
- Aggregates user growth, venue adoption, and engagement metrics
- Provides growth trends and system health indicators

#### `daily_analytics`
- Daily trend data for the last 30 days
- Tracks new users, venues, vibe checks, reviews, and bookmarks
- Useful for generating charts and identifying patterns

### 3. New Functions

#### `get_user_venues(user_uuid)`
- Returns all venues owned/managed by a specific user
- Includes venue details and ownership role

#### `is_venue_owner(user_uuid, venue_uuid)`
- Checks if a user has owner/manager access to a venue
- Used for authorization in the web portal

#### `get_venue_analytics_detailed(venue_uuid, days_back)`
- Returns detailed daily analytics for a specific venue
- Configurable time period (default 30 days)

### 4. Enhanced RLS Policies

- Updated venue, menu, and promotion policies to support ownership-based access
- Venue owners can now manage their venues, menus, and promotions
- Maintains public read access for mobile app compatibility

### 5. Performance Optimizations

- Added indexes for analytics queries
- Composite indexes for common query patterns
- Partial indexes for active data only

## Files

- `003_web_portal_extensions.sql` - Main migration script
- `003_web_portal_extensions_rollback.sql` - Rollback script
- `test_web_portal_schema.sql` - Test script to verify changes
- `003_web_portal_extensions_README.md` - This documentation

## Usage

### Running the Migration

```sql
-- Apply the migration
\i apps/m-buzzvar/database/migrations/003_web_portal_extensions.sql
```

### Testing the Migration

```sql
-- Run the test script to verify everything works
\i apps/m-buzzvar/database/test_web_portal_schema.sql
```

### Rolling Back (if needed)

```sql
-- Rollback the migration
\i apps/m-buzzvar/database/migrations/003_web_portal_extensions_rollback.sql
```

## Web Portal Integration

### Venue Ownership Setup

When a user registers as a venue owner in the web portal:

```sql
-- Create venue ownership record
INSERT INTO public.venue_owners (user_id, venue_id, role)
VALUES (user_id, venue_id, 'owner');
```

### Checking Permissions

```sql
-- Check if user can manage a venue
SELECT is_venue_owner(user_id, venue_id);

-- Get all venues for a user
SELECT * FROM get_user_venues(user_id);
```

### Analytics Queries

```sql
-- Get venue analytics
SELECT * FROM public.venue_analytics WHERE venue_id = 'venue-uuid';

-- Get platform analytics (admin only)
SELECT * FROM public.platform_analytics;

-- Get daily trends
SELECT * FROM public.daily_analytics ORDER BY date;

-- Get detailed venue analytics
SELECT * FROM get_venue_analytics_detailed('venue-uuid', 30);
```

## Security Considerations

1. **Row Level Security**: All new tables have RLS enabled with appropriate policies
2. **Function Security**: Functions use `SECURITY DEFINER` to ensure proper access control
3. **Role-based Access**: Venue management is restricted to owners and managers
4. **Data Isolation**: Users can only access their own venue data

## Performance Impact

- New indexes improve query performance for analytics
- Views are optimized for common dashboard queries
- Functions use efficient query patterns
- Minimal impact on existing mobile app queries

## Compatibility

- Fully backward compatible with existing mobile app
- No changes to existing table structures
- All existing RLS policies preserved
- Mobile app functionality unaffected

## Requirements Addressed

This migration addresses the following requirements from the Web Admin Portal spec:

- **2.6**: Venue information management with ownership
- **4.5**: Analytics and reporting system
- **6.4**: Admin venue management capabilities
- **8.5**: Platform-wide analytics for administrators

## Testing

The migration includes comprehensive tests for:

- Table creation and constraints
- RLS policy functionality
- Analytics view accuracy
- Function behavior
- Index creation
- Data integrity
- Performance benchmarks

Run the test script after applying the migration to ensure everything works correctly.