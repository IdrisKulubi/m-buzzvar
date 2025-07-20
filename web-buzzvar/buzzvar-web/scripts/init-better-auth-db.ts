#!/usr/bin/env tsx

import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL!,
  ssl: process.env.NODE_ENV === 'production',
})

async function initializeBetterAuthTables() {
  const client = await pool.connect()
  
  try {
    console.log('Initializing Better Auth database tables...')

    // Create Better Auth required tables
    await client.query(`
      -- Better Auth user table (if not exists)
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        "emailVerified" BOOLEAN DEFAULT FALSE,
        name TEXT,
        image TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await client.query(`
      -- Better Auth session table
      CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        token TEXT UNIQUE NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE
      );
    `)

    await client.query(`
      -- Better Auth account table (for OAuth)
      CREATE TABLE IF NOT EXISTS "account" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP,
        "refreshTokenExpiresAt" TIMESTAMP,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "user"(id) ON DELETE CASCADE,
        UNIQUE("providerId", "accountId")
      );
    `)

    await client.query(`
      -- Better Auth verification table
      CREATE TABLE IF NOT EXISTS "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Initialize default admin roles
    await client.query(`
      INSERT INTO admin_roles (name, description, permissions)
      VALUES 
        ('user', 'Regular user with basic permissions', ARRAY['view_venues', 'create_vibe_checks', 'create_reviews', 'favorite_venues']),
        ('venue_owner', 'Venue owner with venue management permissions', ARRAY['view_venues', 'create_vibe_checks', 'create_reviews', 'favorite_venues', 'manage_own_venues', 'create_promotions', 'create_events', 'view_venue_analytics']),
        ('admin', 'Administrator with full platform permissions', ARRAY['view_venues', 'create_vibe_checks', 'create_reviews', 'favorite_venues', 'manage_own_venues', 'create_promotions', 'create_events', 'view_venue_analytics', 'manage_all_venues', 'moderate_content', 'manage_users', 'view_admin_analytics']),
        ('super_admin', 'Super administrator with all permissions', ARRAY['*'])
      ON CONFLICT (name) DO NOTHING;
    `)

    console.log('✅ Better Auth database tables initialized successfully!')
    
    // Test the connection
    const result = await client.query('SELECT COUNT(*) FROM "user"')
    console.log(`📊 Current user count: ${result.rows[0].count}`)

  } catch (error) {
    console.error('❌ Error initializing Better Auth database:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the initialization
initializeBetterAuthTables()
  .then(() => {
    console.log('🎉 Database initialization completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Database initialization failed:', error)
    process.exit(1)
  })