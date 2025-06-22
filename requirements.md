# Buzzvar App – Expo + Supabase Requirements (2025)

## 1. User Stories (Mobile App)

### 1.1. Authentication & Profile
- **AS A** new user, **I WANT TO** sign up via email/password or Google (Supabase Auth) **SO THAT I CAN** use the app.
- **AS A** returning user, **I WANT TO** log in securely **SO THAT I CAN** continue where I left off.
- **AS A** user, **I WANT TO** view and edit my profile (name, university, profile picture) **SO THAT I CAN** personalize my experience.

---

### 1.2. Club Discovery (TikTok-Style Feed)
- **AS A** user, **I WANT TO** swipe vertically through full-screen club cards **SO THAT I CAN** quickly discover nearby or trending venues.
- **AS A** user, **I WANT TO** see for each club:
  - Name & Description
  - Cover Image or Video
  - Location on Map
  - Operating Hours & Contact Info
  - Menus (as image or text)
  - Current Promotions
- **AS A** user, **I WANT TO** like/bookmark clubs **SO THAT I CAN** revisit them later.
- **AS A** user, **I WANT TO** view a detailed page after tapping a club **SO THAT I CAN** get more info or directions.

---

### 1.3. Party Group Planning
- **AS A** user, **I WANT TO** create a party group with:
  - Group Name, Venue, Date, Time, Max Size
- **AS A** user, **I WANT TO** browse and join public groups **SO THAT I CAN** meet new people.
- **AS A** user, **I WANT TO** request to join or auto-join a group **SO THAT I CAN** be included.
- **AS A** user, **I WANT TO** chat with members of my group **SO THAT WE CAN** coordinate easily.
- **AS A** user, **I WANT TO** see who’s in my group **SO THAT I KNOW** who’s coming.

---

### 1.4. Venue Admin Portal (Web)
- **AS A** venue owner, **I WANT TO** log in and manage my venue profile.
- **AS A** venue owner, **I WANT TO**:
  - Edit venue info (name, hours, location, contact)
  - Upload photos/videos to appear in the feed
  - Add/edit menu (text or image)
  - Create promotions (with optional start/end dates)

---

## 2. Technical Architecture

### 2.1. Tech Stack
- **Frontend (Mobile)**: Expo + React Native + Tailwind (via `nativewind`)
- **Backend**: Supabase (Auth, DB, Realtime, Storage)
- **Admin Panel**: Web (optional: Next.js with Supabase Admin)

---

### 2.2. Database Schema (Supabase PostgreSQL)

#### `users`
- id, name, email, university, avatar_url

#### `venues`
- id, name, description, location, contact, hours, cover_image/video_url

#### `menus`
- id, venue_id, type, content (text or image URL)

#### `promotions`
- id, venue_id, title, description, start_date, end_date

#### `party_groups`
- id, name, venue_id, date, time, max_size, creator_id

#### `group_members`
- id, group_id, user_id, approved

#### `messages`
- id, group_id, sender_id, content, timestamp

#### `club_views`
- id, club_id, user_id, viewed_at

---

## 3. UI/UX Design

### 3.1. TikTok-Style Club Feed
- **Vertical Swipe Feed** using `FlatList` with `pagingEnabled`
- **Each Club Card** includes:
  - Full-screen image/video
  - Overlay text: name, vibe, open status
  - Button: "View More", "Like", "Share"
- **Details Page** after tapping a club

### 3.2. Navigation
- Bottom tab bar: Home (Feed), Groups, Chat, Profile

### 3.3. Maps & Location
- Use `react-native-maps` or Expo MapView to show venues
- Use `expo-location` for proximity-based sorting

---

## 4. Features & Components

| Feature                     | Implementation                              |
|-----------------------------|----------------------------------------------|
| Authentication              | Supabase Auth + Expo Secure Store            |
| Swipe Feed                  | `FlatList` with `pagingEnabled`              |
| Image/Video Storage         | Supabase Storage                             |
| Realtime Chat               | Supabase Realtime (channels/messages)        |
| Party Group Management      | Supabase tables with filters & logic         |
| Profile Editing             | Form inputs + image upload                   |
| Push Notifications          | Expo Push (optional, v2 release)             |
| Bookmark/Likes              | Supabase table `club_likes` (optional)       |

---

## 5. Testing & Deployment

### Development
- `expo start` for dev mode
- Local `.env` for Supabase keys
- Tailwind debugging via `nativewind`

### Deployment
- `eas build` for Android & iOS
- Supabase: managed hosting (no separate backend needed)
- OTA updates: Expo Updates

---

## 6. MVP Checklist (Definition of Done)

- ✅ Swipe-based Club Discovery UI
- ✅ Supabase Auth + User Profile
- ✅ Club Detail Page with Map
- ✅ Group Creation + Join Flow
- ✅ In-Group Chat (basic text)
- ✅ Venue Admin Web Portal (basic info + uploads)
- ✅ Like/Bookmark support (optional)
- ✅ Fully working on Android (iOS optional for MVP)
- ✅ Database deployed and seeded
- ✅ App builds & runs on Expo

---

## 7. Folder Structure

/buzzvar-app
├── /assets                   # Static assets like icons, logos, etc.
├── /src
│   ├── /actions              # Server-like logic: DB queries, inserts, updates
│   │   ├── auth.ts           # Sign up, login, get user profile
│   │   ├── clubs.ts          # Fetch clubs, club by ID, bookmark logic
│   │   ├── groups.ts         # Create/join groups, get user groups
│   │   ├── chat.ts           # Send message, get group messages
│   │   ├── venues.ts         # Admin: update menus, offers, info
│   │   └── utils.ts          # Shared helpers for actions
│   ├── /components           # Shared UI components (Card, Button, Avatar, etc.)
│   ├── /lib
│   │   ├── supabase.ts       # Supabase client instance
│   │   ├── constants.ts      # App-wide config (colors, roles)
│   │   └── hooks.ts          # Custom hooks (e.g., useUser, useLocation)
│   ├── /screens              # Navigation-level screens
│   │   ├── Feed.tsx          # TikTok-style Club Feed
│   │   ├── ClubDetails.tsx   # Detailed club info + map
│   │   ├── Groups.tsx        # Group listing page
│   │   ├── GroupDetails.tsx  # Chat and member list
│   │   ├── Chat.tsx          # Real-time messages
│   │   └── Profile.tsx       # Edit and view user profile
│   ├── /navigation           # Tab/bottom navigation setup
│   ├── /store                # Zustand (or context) for global state (optional)
│   └── /styles               # Tailwind config or custom styles
├── .env                      # Supabase keys and secrets
├── app.json                  # Expo config
├── tailwind.config.js        # Tailwind setup for NativeWind
└── tsconfig.json             # TypeScript config






## 8. Future Upgrades (Post-MVP Ideas)
- Video background music for club cards
- User-generated content or reviews
- In-app ticketing or RSVP for events
- Push notifications for group messages
- Live club activity feed (via Supabase Realtime)

---
