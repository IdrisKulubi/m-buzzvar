#!/usr/bin/env tsx

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function testBetterAuthInit() {
  console.log('Testing Better Auth initialization...')
  console.log('Database URL:', process.env.NEON_DATABASE_URL?.replace(/:[^:@]*@/, ':***@'))
  
  try {
    // Import Better Auth configuration
    const { auth } = await import('../src/lib/auth/better-auth-server')
    
    console.log('✅ Better Auth imported successfully')
    
    // Try to get session (this will test database connection)
    const session = await auth.api.getSession({
      headers: new Headers(),
    })
    
    console.log('✅ Better Auth session check successful:', session ? 'Session exists' : 'No session')
    
  } catch (error) {
    console.error('❌ Better Auth initialization failed:', error)
    
    // Try to get more specific error information
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    process.exit(1)
  }
}

testBetterAuthInit()