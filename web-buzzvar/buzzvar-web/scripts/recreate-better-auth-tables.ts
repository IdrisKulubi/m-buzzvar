#!/usr/bin/env tsx

import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false
  }
})

async function recreateBetterAuthTables() {
  const client = await pool.connect()
  
  try {
    console.log('Dropping existing Better Auth tables...')

    // Drop existing tables in correct order (due to foreign keys)
    await client.query('DROP TABLE IF EXISTS "session" CASCADE;')
    await client.query('DROP TABLE IF EXISTS "account" CASCADE;')
    await client.query('DROP TABLE IF EXISTS "verification" CASCADE;')
    await client.query('DROP TABLE IF EXISTS "user" CASCADE;')

    console.log('Creating Better Auth tables with exact schema...')

    // Create user table
    await client.query(`
      CREATE TABLE "user" (
        "id" TEXT PRIMARY KEY,
        "email" TEXT UNIQUE NOT NULL,
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        "name" TEXT,
        "image" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    // Create session table
    await client.query(`
      CREATE TABLE "session" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "token" TEXT UNIQUE NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `)

    // Create account table
    await client.query(`
      CREATE TABLE "account" (
        "id" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP,
        "refreshTokenExpiresAt" TIMESTAMP,
        "scope" TEXT,
        "password" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE,
        UNIQUE("providerId", "accountId")
      );
    `)

    // Create verification table
    await client.query(`
      CREATE TABLE "verification" (
        "id" TEXT PRIMARY KEY,
        "identifier" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    console.log('✅ Better Auth tables recreated successfully!')

    // Test the tables
    const tables = ['user', 'session', 'account', 'verification']
    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM "${table}"`)
      console.log(`Table "${table}": ${result.rows[0].count} records`)
    }

  } catch (error) {
    console.error('❌ Error recreating Better Auth tables:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

// Run the recreation
recreateBetterAuthTables()
  .then(() => {
    console.log('🎉 Better Auth tables recreation completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Better Auth tables recreation failed:', error)
    process.exit(1)
  })