#!/usr/bin/env tsx

/**
 * Simple database connection test
 */

import { config } from 'dotenv'
import { Pool } from 'pg'

// Load environment variables
config({ path: '.env.local' })

async function testSimpleConnection() {
  console.log('🔍 Testing simple PostgreSQL connection...')
  
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  })

  try {
    console.log('📡 Connecting to database...')
    const client = await pool.connect()
    
    console.log('✅ Connected successfully!')
    
    console.log('🔍 Testing basic query...')
    const result = await client.query('SELECT 1 as test, NOW() as timestamp')
    console.log('✅ Query result:', result.rows[0])
    
    console.log('🔍 Testing table existence...')
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    console.log('✅ Found tables:', tableCheck.rows.map(r => r.table_name))
    
    client.release()
    await pool.end()
    
    console.log('🎉 Simple connection test passed!')
    return true
  } catch (error) {
    console.error('❌ Connection test failed:', error)
    await pool.end()
    return false
  }
}

testSimpleConnection().then(success => {
  process.exit(success ? 0 : 1)
})