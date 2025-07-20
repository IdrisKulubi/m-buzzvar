#!/usr/bin/env tsx

import { Pool } from 'pg'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function testConnection() {
  console.log('Testing database connection for Better Auth...')
  
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL!,
    ssl: process.env.NODE_ENV === 'production',
  })

  try {
    const client = await pool.connect()
    console.log('✅ Database connection successful!')
    
    // Check if Better Auth tables exist
    const tables = ['user', 'session', 'account', 'verification']
    
    for (const table of tables) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table])
        
        const exists = result.rows[0].exists
        console.log(`Table "${table}": ${exists ? '✅ EXISTS' : '❌ MISSING'}`)
        
        if (exists) {
          const countResult = await client.query(`SELECT COUNT(*) FROM "${table}"`)
          console.log(`  - Records: ${countResult.rows[0].count}`)
        }
      } catch (error) {
        console.log(`Table "${table}": ❌ ERROR - ${error}`)
      }
    }
    
    client.release()
    await pool.end()
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

testConnection()