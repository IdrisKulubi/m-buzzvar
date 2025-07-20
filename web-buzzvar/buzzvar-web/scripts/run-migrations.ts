#!/usr/bin/env tsx

/**
 * Database Migration Runner
 * This script runs all database migrations in order
 * Run with: npx tsx scripts/run-migrations.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { Pool } from 'pg'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

interface Migration {
  id: string
  name: string
  sql: string
}

class MigrationRunner {
  private pool: Pool

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  }

  async initialize() {
    // Create migrations tracking table if it doesn't exist
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `)
  }

  async getExecutedMigrations(): Promise<string[]> {
    const result = await this.pool.query(
      'SELECT id FROM schema_migrations ORDER BY executed_at'
    )
    return result.rows.map(row => row.id)
  }

  async executeMigration(migration: Migration) {
    const client = await this.pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Execute the migration SQL
      await client.query(migration.sql)
      
      // Record the migration as executed
      await client.query(
        'INSERT INTO schema_migrations (id, name) VALUES ($1, $2)',
        [migration.id, migration.name]
      )
      
      await client.query('COMMIT')
      console.log(`✅ Migration ${migration.id} (${migration.name}) executed successfully`)
    } catch (error) {
      await client.query('ROLLBACK')
      console.error(`❌ Migration ${migration.id} failed:`, error)
      throw error
    } finally {
      client.release()
    }
  }

  async runMigrations() {
    console.log('🚀 Starting database migrations...\n')

    // Define migrations in order
    const migrations: Migration[] = [
      {
        id: '001',
        name: 'Initial Schema',
        sql: readFileSync(resolve(__dirname, '../database/migrations/001_initial_schema.sql'), 'utf8')
      },
      {
        id: '002',
        name: 'Indexes and Constraints',
        sql: readFileSync(resolve(__dirname, '../database/migrations/002_indexes_and_constraints.sql'), 'utf8')
      },
      {
        id: '003',
        name: 'Triggers and Functions',
        sql: readFileSync(resolve(__dirname, '../database/migrations/003_triggers_and_functions.sql'), 'utf8')
      }
    ]

    try {
      await this.initialize()
      const executedMigrations = await this.getExecutedMigrations()

      console.log(`📋 Found ${migrations.length} migrations`)
      console.log(`📊 ${executedMigrations.length} migrations already executed\n`)

      let executedCount = 0

      for (const migration of migrations) {
        if (executedMigrations.includes(migration.id)) {
          console.log(`⏭️  Skipping migration ${migration.id} (${migration.name}) - already executed`)
          continue
        }

        console.log(`🔄 Executing migration ${migration.id} (${migration.name})...`)
        await this.executeMigration(migration)
        executedCount++
      }

      if (executedCount === 0) {
        console.log('\n✨ All migrations are up to date!')
      } else {
        console.log(`\n🎉 Successfully executed ${executedCount} migration(s)!`)
      }

    } catch (error) {
      console.error('\n💥 Migration failed:', error)
      throw error
    }
  }

  async close() {
    await this.pool.end()
  }
}

// Validation function
async function validateEnvironment() {
  if (!process.env.NEON_DATABASE_URL) {
    console.error('❌ NEON_DATABASE_URL environment variable is required')
    process.exit(1)
  }

  console.log('✅ Environment validation passed')
}

// Test database connection
async function testConnection() {
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    console.log('✅ Database connection successful')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Main execution
async function main() {
  console.log('🗄️  Database Migration Runner')
  console.log('=' .repeat(50))

  try {
    // Validate environment
    await validateEnvironment()

    // Test database connection
    await testConnection()

    // Run migrations
    const runner = new MigrationRunner()
    await runner.runMigrations()
    await runner.close()

    console.log('\n🏁 Migration process completed successfully!')
    process.exit(0)

  } catch (error) {
    console.error('\n💥 Migration process failed:', error)
    process.exit(1)
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run the migrations
main().catch((error) => {
  console.error('Migration script failed:', error)
  process.exit(1)
})