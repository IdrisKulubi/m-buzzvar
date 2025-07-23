# Buzzvar Database Setup

This directory contains the database schema and seed data for the Buzzvar app.

## Prerequisites

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project in Supabase
3. Get your project URL and anon key

## Database Setup Steps

### 1. Run the Schema

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Run the SQL to create all tables, indexes, and policies

### 2. Seed the Database

1. In the SQL Editor, copy and paste the contents of `seed.sql`
2. Run the SQL to populate the database with sample venues and promotions

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 4. Enable Authentication Providers (Optional)

For Google OAuth:

1. Go to Authentication > Providers in Supabase
2. Enable Google provider
3. Add your Google OAuth credentials

## Database Structure

### Core Tables

- **users**: User profiles (extends Supabase auth.users)
- **venues**: Club/bar information with location data
- **menus**: Venue menus (drinks, food, specials)
- **promotions**: Time-based promotional offers
- **party_groups**: User-created party groups
- **group_members**: Group membership with approval system
- **messages**: Group chat messages
- **club_views**: User interactions with venues (views, likes, bookmarks)
- **user_bookmarks**: User saved venues
- **vibe_checks**: Real-time venue atmosphere updates with busyness ratings, comments, and photos
- **reviews**: User reviews and ratings for venues

### Key Features

- **Row Level Security (RLS)**: All tables have appropriate security policies
- **Real-time subscriptions**: Messages and group updates are real-time
- **Automatic timestamps**: Created/updated timestamps are handled automatically
- **Geolocation support**: Venues have latitude/longitude for map integration
- **JSON data**: Flexible menu and hours storage using JSON

### Security Policies

- Users can only edit their own profiles
- Venues and menus are publicly readable
- Group creators can manage their groups
- Only group members can see messages
- Users control their own bookmarks and interactions

## Testing the Setup

After running the schema and seed data:

1. Check that all tables exist in the Table Editor
2. Verify sample venues are populated
3. Test authentication by creating a user account
4. Confirm RLS policies are working by testing data access

## Next Steps

1. Set up the mobile app with the database credentials
2. Test the authentication flow
3. Implement the TikTok-style feed using the venues data
4. Add real venue data for your target location
