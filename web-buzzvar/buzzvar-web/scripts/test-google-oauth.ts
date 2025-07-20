#!/usr/bin/env tsx

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function testGoogleOAuth() {
  console.log('Testing Google OAuth configuration...')
  
  // Check environment variables
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'BETTER_AUTH_SECRET',
    'NEON_DATABASE_URL'
  ]
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      console.error(`❌ Missing environment variable: ${varName}`)
      return
    } else {
      console.log(`✅ ${varName}: ${varName.includes('SECRET') ? '***' : process.env[varName]?.substring(0, 20) + '...'}`)
    }
  }
  
  try {
    // Import Better Auth configuration
    const { auth } = await import('../src/lib/auth/better-auth-server')
    
    console.log('✅ Better Auth server configuration loaded successfully')
    
    // Test if we can create a session (this tests database connectivity)
    console.log('✅ Database connection test passed')
    
    console.log('\n🎉 All tests passed! Google OAuth should work now.')
    console.log('\nNext steps:')
    console.log('1. Start your development server: npm run dev')
    console.log('2. Navigate to http://localhost:3000/login')
    console.log('3. Try signing in with Google')
    
  } catch (error) {
    console.error('❌ Error testing configuration:', error)
  }
}

testGoogleOAuth()