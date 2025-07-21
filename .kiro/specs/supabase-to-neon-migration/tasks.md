# Supabase to Neon DB + Better Auth Migration Implementation Plan

- [x] 1. Set up Neon DB infrastructure and initial configuration

  - Create Neon DB project and configure database instance
  - Set up connection pooling and performance optimization settings
  - Configure environment variables for both mobile and web applications
  - Set up monitoring and alerting for database health
  - Test database connectivity from both applications
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Migrate database schema from Supabase to Neon DB

  - Export existing Supabase schema and analyze table structures
  - Create migration scripts for all existing tables (users, venues, promotions, vibe_checks, etc.)
  - Add Better Auth required tables (sessions, accounts, verification_tokens)
  - Create indexes and constraints for optimal performance
  - Set up database triggers and functions if needed
  - Test schema migration on staging environment
  - Validate all foreign key relationships and constraints
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_

- [ ] 4. Set up Better Auth server infrastructure

  - Install and configure Better Auth with Expo plugin
  - Set up Better Auth database connection to Neon DB
  - Configure email/password authentication with verification
  - Set up Google OAuth provider for both web and mobile
  - Configure session management and security settings
  - Set up rate limiting and security middleware
  - Create custom role management system (admin, venue_owner, user)
  - Test authentication flows in development environment
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Update Next.js web portal authentication system

  - Replace Supabase Auth client with Better Auth client
  - Update all authentication-related API routes
  - Modify middleware for route protection with Better Auth
  - Update user session management and context providers
  - Implement Google OAuth flow for web application
  - Update role-based access control logic
  - Modify all authenticated API calls to use Better Auth sessions
  - Test all authentication flows and protected routes
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Update Expo mobile app authentication system

  - Install Better Auth Expo client and configure SecureStore
  - Replace Supabase Auth calls with Better Auth client
  - Update Google OAuth implementation for mobile
  - Modify session persistence and automatic login logic
  - Update all authenticated API requests to include Better Auth cookies
  - Implement deep linking for OAuth callbacks
  - Update user context and state management
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7. Replace Supabase database client with direct PostgreSQL connections

  - Install and configure Drizzle ORM for type-safe database operations
  - Create database schema definitions using Drizzle
  - Replace all Supabase client database calls in web portal
  - Replace all Supabase client database calls in mobile app
  - Implement connection pooling and error handling
  - Create database service layer with retry logic
  - Update all CRUD operations to use direct PostgreSQL queries
  - Test all database operations and ensure data consistency
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2_

- [x] 8. Implement real-time updates without Supabase Realtime


  - Set up WebSocket server for real-time functionality
  - Create WebSocket client integration for web portal
  - Create WebSocket client integration for mobile app
  - Implement channel-based subscriptions for venue updates
  - Add real-time notifications for vibe checks and promotions
  - Create connection management and reconnection logic
  - Test real-time updates across both platforms
  - Implement fallback polling for unreliable connections
  - _Requirements: 5.4, 6.3, 6.4_

- [x] 9. Migrate file storage from Supabase Storage to Cloudflare R2






  - Set up Cloudflare R2 bucket with proper permissions and CORS
  - Create file upload service with signed URL generation
  - Migrate existing files from Supabase Storage to Cloudflare R2
  - Update all file upload endpoints in web portal
  - Update all file upload functionality in mobile app
  - Implement image optimization and compression
  - Update database records with new Cloudflare R2 URLs
  - Test file upload, download, and deletion operations
  - _Requirements: 5.5, 6.5_




-
