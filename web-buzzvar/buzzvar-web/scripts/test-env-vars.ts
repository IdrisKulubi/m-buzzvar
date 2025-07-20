#!/usr/bin/env tsx

/**
 * Simple script to test environment variable loading
 * Run with: npx tsx scripts/test-env-vars.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(__dirname, '../.env.local') })

console.log('🔧 Environment Variables Test')
console.log('=' .repeat(40))

const envVars = [
  'NEON_DATABASE_URL',
  'NEON_DATABASE_HOST', 
  'NEON_DATABASE_NAME',
  'NEON_DATABASE_USER',
  'NEON_DATABASE_PASSWORD',
  'DB_POOL_MAX',
  'DB_POOL_IDLE_TIMEOUT',
  'DB_POOL_CONNECTION_TIMEOUT'
]

envVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    // Mask sensitive values
    if (varName.includes('PASSWORD') || varName.includes('URL')) {
      const masked = value.substring(0, 10) + '***' + value.substring(value.length - 5)
      console.log(`✅ ${varName}: ${masked}`)
    } else {
      console.log(`✅ ${varName}: ${value}`)
    }
  } else {
    console.log(`❌ ${varName}: Not set`)
  }
})

console.log('\n🎉 Environment variable loading test complete!')