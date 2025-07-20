#!/usr/bin/env tsx

import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function testNeonConnection() {
  console.log('Testing direct Neon connection...')
  console.log('Database URL:', process.env.NEON_DATABASE_URL?.replace(/:[^:@]*@/, ':***@'))
  
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10000,
  })
  
  try {
    const client = await pool.connect()
    console.log('✅ Connected to Neon database')
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time')
    console.log('✅ Query successful:', result.rows[0])
    
    // Check if Better Auth tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user', 'session', 'account', 'verification')
    `)
    
    console.log('Better Auth tables found:', tablesResult.rows.map(r => r.table_name))
    
    // Check user table structure
    const userTableResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user' 
      ORDER BY ordinal_position
    `)
    
    console.log('User table columns:', userTableResult.rows)
    
    client.release()
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
  } finally {
    await pool.end()
  }
}

testNeonConnection()