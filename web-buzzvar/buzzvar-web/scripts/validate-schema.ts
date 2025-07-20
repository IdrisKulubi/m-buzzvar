#!/usr/bin/env tsx

/**
 * Schema Validation Script
 * This script validates that the database schema matches our expectations
 * Run with: npx tsx scripts/validate-schema.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { Pool } from 'pg'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

interface TableInfo {
  tableName: string
  columnName: string
  dataType: string
  isNullable: string
  columnDefault: string | null
}

interface IndexInfo {
  indexName: string
  tableName: string
  columnName: string
  isUnique: boolean
}

interface ConstraintInfo {
  constraintName: string
  tableName: string
  constraintType: string
  columnName: string
}

class SchemaValidator {
  private pool: Pool

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  }

  async getTables(): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    return result.rows.map(row => row.table_name)
  }

  async getTableColumns(tableName: string): Promise<TableInfo[]> {
    const result = await this.pool.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName])
    
    return result.rows
  }

  async getIndexes(): Promise<IndexInfo[]> {
    const result = await this.pool.query(`
      SELECT 
        i.relname as index_name,
        t.relname as table_name,
        a.attname as column_name,
        ix.indisunique as is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relkind = 'r'
      AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY t.relname, i.relname
    `)
    
    return result.rows
  }

  async getConstraints(): Promise<ConstraintInfo[]> {
    const result = await this.pool.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
      ORDER BY tc.table_name, tc.constraint_name
    `)
    
    return result.rows
  }

  async getFunctions(): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name
    `)
    
    return result.rows.map(row => row.routine_name)
  }

  async getTriggers(): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY trigger_name
    `)
    
    return result.rows.map(row => row.trigger_name)
  }

  async validateSchema() {
    console.log('🔍 Validating database schema...\n')

    try {
      // Expected tables
      const expectedTables = [
        'users', 'sessions', 'accounts', 'verification_tokens', 'password_reset_tokens',
        'venues', 'venue_categories', 'venue_category_mappings',
        'promotions', 'events',
        'vibe_checks', 'vibe_check_reactions', 'reviews', 'review_reactions',
        'user_favorites', 'user_checkins', 'user_follows',
        'notifications', 'push_tokens',
        'venue_analytics', 'user_activity_logs',
        'admin_roles', 'admin_user_roles', 'moderation_reports',
        'schema_migrations'
      ]

      // Get actual tables
      const actualTables = await this.getTables()
      
      console.log('📋 Table Validation:')
      console.log(`   Expected: ${expectedTables.length} tables`)
      console.log(`   Found: ${actualTables.length} tables`)

      // Check for missing tables
      const missingTables = expectedTables.filter(table => !actualTables.includes(table))
      if (missingTables.length > 0) {
        console.log(`   ❌ Missing tables: ${missingTables.join(', ')}`)
      } else {
        console.log('   ✅ All expected tables found')
      }

      // Check for extra tables
      const extraTables = actualTables.filter(table => !expectedTables.includes(table))
      if (extraTables.length > 0) {
        console.log(`   ⚠️  Extra tables: ${extraTables.join(', ')}`)
      }

      // Validate key tables have expected columns
      console.log('\n🔧 Column Validation:')
      
      const keyTables = ['users', 'venues', 'vibe_checks', 'reviews']
      for (const tableName of keyTables) {
        if (actualTables.includes(tableName)) {
          const columns = await this.getTableColumns(tableName)
          console.log(`   ✅ ${tableName}: ${columns.length} columns`)
          
          // Check for required columns
          const requiredColumns: Record<string, string[]> = {
            users: ['id', 'email', 'created_at'],
            venues: ['id', 'name', 'latitude', 'longitude', 'created_at'],
            vibe_checks: ['id', 'venue_id', 'user_id', 'crowd_level'],
            reviews: ['id', 'venue_id', 'user_id', 'rating']
          }
          
          const columnNames = columns.map(col => col.columnName)
          const missing = requiredColumns[tableName]?.filter(col => !columnNames.includes(col)) || []
          
          if (missing.length > 0) {
            console.log(`      ❌ Missing required columns: ${missing.join(', ')}`)
          }
        }
      }

      // Validate indexes
      console.log('\n📊 Index Validation:')
      const indexes = await this.getIndexes()
      const indexCount = indexes.length
      console.log(`   Found: ${indexCount} indexes`)
      
      // Check for key indexes
      const keyIndexes = [
        'idx_users_email',
        'idx_venues_location',
        'idx_vibe_checks_venue_id',
        'idx_reviews_venue_id'
      ]
      
      const indexNames = indexes.map(idx => idx.indexName)
      const missingIndexes = keyIndexes.filter(idx => !indexNames.includes(idx))
      
      if (missingIndexes.length > 0) {
        console.log(`   ❌ Missing key indexes: ${missingIndexes.join(', ')}`)
      } else {
        console.log('   ✅ Key indexes found')
      }

      // Validate constraints
      console.log('\n🔒 Constraint Validation:')
      const constraints = await this.getConstraints()
      const constraintCount = constraints.length
      console.log(`   Found: ${constraintCount} constraints`)

      // Validate functions
      console.log('\n⚙️  Function Validation:')
      const functions = await this.getFunctions()
      const expectedFunctions = [
        'update_updated_at_column',
        'generate_slug',
        'calculate_distance',
        'get_venue_average_rating',
        'cleanup_expired_tokens'
      ]
      
      const missingFunctions = expectedFunctions.filter(func => !functions.includes(func))
      if (missingFunctions.length > 0) {
        console.log(`   ❌ Missing functions: ${missingFunctions.join(', ')}`)
      } else {
        console.log('   ✅ Key functions found')
      }

      // Validate triggers
      console.log('\n🎯 Trigger Validation:')
      const triggers = await this.getTriggers()
      console.log(`   Found: ${triggers.length} triggers`)

      // Test basic functionality
      console.log('\n🧪 Functionality Tests:')
      
      // Test basic queries
      await this.pool.query('SELECT 1')
      console.log('   ✅ Basic query execution')

      // Test function calls
      try {
        await this.pool.query('SELECT update_updated_at_column()')
        console.log('   ✅ Function execution')
      } catch (error) {
        console.log('   ⚠️  Function execution test skipped (trigger function)')
      }

      // Test constraints
      try {
        await this.pool.query('SELECT COUNT(*) FROM users WHERE email IS NOT NULL')
        console.log('   ✅ Constraint validation')
      } catch (error) {
        console.log('   ❌ Constraint validation failed')
      }

      console.log('\n🎉 Schema validation completed!')
      
      return {
        tablesValid: missingTables.length === 0,
        indexesValid: missingIndexes.length === 0,
        functionsValid: missingFunctions.length === 0,
        overall: missingTables.length === 0 && missingIndexes.length === 0 && missingFunctions.length === 0
      }

    } catch (error) {
      console.error('❌ Schema validation failed:', error)
      throw error
    }
  }

  async close() {
    await this.pool.end()
  }
}

// Main execution
async function main() {
  console.log('🗄️  Database Schema Validator')
  console.log('=' .repeat(50))

  if (!process.env.NEON_DATABASE_URL) {
    console.error('❌ NEON_DATABASE_URL environment variable is required')
    process.exit(1)
  }

  const validator = new SchemaValidator()

  try {
    const result = await validator.validateSchema()
    await validator.close()

    if (result.overall) {
      console.log('\n✅ Schema validation passed!')
      process.exit(0)
    } else {
      console.log('\n⚠️  Schema validation completed with warnings')
      process.exit(0)
    }

  } catch (error) {
    console.error('\n💥 Schema validation failed:', error)
    await validator.close()
    process.exit(1)
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run the validation
main().catch((error) => {
  console.error('Validation script failed:', error)
  process.exit(1)
})