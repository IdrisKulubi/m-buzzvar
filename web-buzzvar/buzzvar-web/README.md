# Buzzvar Web Admin Portal

A Next.js web application that provides venue owners and platform administrators with comprehensive management capabilities for the Buzzvar platform.

## Features

- **Venue Management**: Update venue information, hours, and media
- **Promotion Management**: Create and manage special events and offers  
- **Analytics Dashboard**: Track engagement and customer insights
- **Admin Panel**: Platform-wide management for administrators
- **Real-time Sync**: Immediate synchronization with mobile app

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **State Management**: React hooks and context

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── auth/              # Authentication components
│   ├── dashboard/         # Dashboard components
│   ├── venue/             # Venue management components
│   ├── promotions/        # Promotion management components
│   ├── analytics/         # Analytics components
│   └── admin/             # Admin components
├── lib/                   # Utility libraries
│   ├── supabase.ts        # Supabase client configuration
│   ├── auth.ts            # Authentication utilities
│   └── types.ts           # TypeScript type definitions
├── hooks/                 # Custom React hooks
├── services/              # API service layer
└── middleware.ts          # Route protection middleware
```

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.local` and configure the following:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ADMIN_EMAILS=admin@example.com,admin2@example.com
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Development

- **Build**: `npm run build`
- **Start production**: `npm start`
- **Lint**: `npm run lint`

## Implementation Status

This is the foundational setup. Individual features will be implemented in subsequent tasks:

- [ ] Authentication system (Task 2)
- [ ] Database schema extensions (Task 3)  
- [ ] Core UI components (Task 4)
- [ ] Venue management (Task 5)
- [ ] Promotion management (Task 6)
- [ ] Analytics system (Task 7)
- [ ] Admin management (Task 8)
- [ ] Real-time synchronization (Task 9)
- [ ] Error handling (Task 10)
- [ ] File upload system (Task 11)
- [ ] Performance optimizations (Task 12)
- [ ] Testing suite (Task 13)
- [ ] Deployment configuration (Task 14)

## Architecture

The application follows a modular architecture with clear separation of concerns:

- **Pages**: Next.js App Router for routing and layouts
- **Components**: Reusable UI components organized by feature
- **Services**: API interaction layer with Supabase
- **Hooks**: Custom React hooks for state management
- **Types**: Comprehensive TypeScript definitions
- **Middleware**: Route protection and authentication

## Database Integration

The portal integrates directly with the existing Supabase database used by the mobile app, ensuring real-time synchronization of all data. Additional tables and views will be created for admin-specific functionality.