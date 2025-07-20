#!/usr/bin/env tsx

/**
 * Supabase Data Export Script
 * This script exports data from Supabase for migration to Neon DB
 * Run with: npx tsx scripts/export-supabase-data.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { writeFileSync, mkdirSync } from 'fs'
import { Pool } from 'pg'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

interface ExportResult {
  table: string
  count: number
  file: string
}

class SupabaseDataExporter {
  private pool: Pool
  private exportDir: string

  constructor() {
    // Use the legacy Supabase URL for export
    const supabaseUrl = process.env.POSTGRES_URL
    if (!supabaseUrl) {
      throw new Error('POSTGRES_URL (Supabase) environment variable is required for export')
    }

    this.pool = new Pool({
      connectionString: supabaseUrl,
      ssl: { rejectUnauthorized: false }
    })

    this.exportDir = resolve(__dirname, '../database/exports')
    
    // Create export directory if it doesn't exist
    try {
      mkdirSync(this.exportDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  }

  async testConnection() {
    try {
      const client = await this.pool.connect()
      await client.query('SELECT 1')
      client.release()
      console.log('✅ Supabase connection successful')
      return true
    } catch (error) {
      console.error('❌ Supabase connection failed:', error)
      return false
    }
  }

  async getTableList(): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE 'sql_%'
      ORDER BY table_name
    `)
    return result.rows.map(row => row.table_name)
  }

  async exportTable(tableName: string): Promise<ExportResult> {
    console.log(`📤 Exporting table: ${tableName}`)

    try {
      // Get table data
      const result = await this.pool.query(`SELECT * FROM "${tableName}"`)
      const data = result.rows

      // Create export file
      const fileName = `${tableName}.json`
      const filePath = resolve(this.exportDir, fileName)
      
      const exportData = {
        table: tableName,
        exported_at: new Date().toISOString(),
        count: data.length,
        data: data
      }

      writeFileSync(filePath, JSON.stringify(exportData, null, 2))

      console.log(`   ✅ Exported ${data.length} rows to ${fileName}`)

      return {
        table: tableName,
        count: data.length,
        file: fileName
      }

    } catch (error) {
      console.error(`   ❌ Failed to export ${tableName}:`, error)
      throw error
    }
  }

  async exportAuthUsers(): Promise<ExportResult> {
    console.log('📤 Exporting auth.users (Supabase Auth)')

    try {
      // Export Supabase auth users
      const result = await this.pool.query(`
        SELECT 
          id,
          email,
          email_confirmed_at,
          created_at,
          updated_at,
          last_sign_in_at,
          raw_user_meta_data,
          raw_app_meta_data
        FROM auth.users
      `)
      
      const data = result.rows

      const fileName = 'auth_users.json'
      const filePath = resolve(this.exportDir, fileName)
      
      const exportData = {
        table: 'auth.users',
        exported_at: new Date().toISOString(),
        count: data.length,
        data: data
      }

      writeFileSync(filePath, JSON.stringify(exportData, null, 2))

      console.log(`   ✅ Exported ${data.length} auth users to ${fileName}`)

      return {
        table: 'auth.users',
        count: data.length,
        file: fileName
      }

    } catch (error) {
      console.error('   ❌ Failed to export auth.users:', error)
      // This might fail if we don't have access to auth schema
      console.log('   ⚠️  Skipping auth.users export (access denied)')
      return {
        table: 'auth.users',
        count: 0,
        file: 'skipped'
      }
    }
  }

  async exportSchema(): Promise<void> {
    console.log('📋 Exporting database schema')

    try {
      // Export table definitions
      const schemaResult = await this.pool.query(`
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `)

      // Export constraints
      const constraintsResult = await this.pool.query(`
        SELECT 
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `)

      // Export indexes
      const indexesResult = await this.pool.query(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `)

      const schemaExport = {
        exported_at: new Date().toISOString(),
        tables: schemaResult.rows,
        constraints: constraintsResult.rows,
        indexes: indexesResult.rows
      }

      const schemaFile = resolve(this.exportDir, 'schema_export.json')
      writeFileSync(schemaFile, JSON.stringify(schemaExport, null, 2))

      console.log('   ✅ Schema exported to schema_export.json')

    } catch (error) {
      console.error('   ❌ Failed to export schema:', error)
      throw error
    }
  }

  async exportAll(): Promise<ExportResult[]> {
    console.log('🚀 Starting Supabase data export...\n')

    const results: ExportResult[] = []

    try {
      // Test connection first
      const connected = await this.testConnection()
      if (!connected) {
        throw new Error('Cannot connect to Supabase database')
      }

      // Export schema first
      await this.exportSchema()

      // Export auth users
      const authResult = await this.exportAuthUsers()
      results.push(authResult)

      // Get all public tables
      const tables = await this.getTableList()
      console.log(`\n📋 Found ${tables.length} tables to export:`)
      tables.forEach(table => console.log(`   - ${table}`))
      console.log()

      // Export each table
      for (const table of tables) {
        try {
          const result = await this.exportTable(table)
          results.push(result)
        } catch (error) {
          console.error(`Failed to export table ${table}:`, error)
          // Continue with other tables
        }
      }

      // Create summary
      const summary = {
        exported_at: new Date().toISOString(),
        total_tables: results.length,
        total_records: results.reduce((sum, r) => sum + r.count, 0),
        tables: results
      }

      const summaryFile = resolve(this.exportDir, 'export_summary.json')
      writeFileSync(summaryFile, JSON.stringify(summary, null, 2))

      console.log('\n📊 Export Summary:')
      console.log(`   Total tables: ${summary.total_tables}`)
      console.log(`   Total records: ${summary.total_records}`)
      console.log(`   Export directory: ${this.exportDir}`)

      return results

    } catch (error) {
      console.error('💥 Export failed:', error)
      throw error
    }
  }

  async close() {
    await this.pool.end()
  }
}

// Main execution
async function main() {
  console.log('📦 Supabase Data Export Tool')
  console.log('=' .repeat(50))

  // Check if Supabase URL is available
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL (Supabase) environment variable is required')
    console.log('   Please ensure your .env.local file contains the Supabase connection string')
    process.exit(1)
  }

  const exporter = new SupabaseDataExporter()

  try {
    const results = await exporter.exportAll()
    await exporter.close()

    console.log('\n🎉 Export completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Review the exported data in database/exports/')
    console.log('2. Run the migration script to import data to Neon DB')
    console.log('3. Validate the migrated data')

    process.exit(0)

  } catch (error) {
    console.error('\n💥 Export failed:', error)
    await exporter.close()
    process.exit(1)
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run the export
main().catch((error) => {
  console.error('Export script failed:', error)
  process.exit(1)
})