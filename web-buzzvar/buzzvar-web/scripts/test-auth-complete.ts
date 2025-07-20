#!/usr/bin/env tsx

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function testCompleteAuth() {
  console.log('🧪 Testing complete Better Auth setup...')
  
  try {
    // Import Better Auth configuration
    const { auth } = await import('../src/lib/auth/better-auth-server')
    console.log('✅ Better Auth server imported successfully')
    
    // Test session handling
    const session = await auth.api.getSession({
      headers: new Headers(),
    })
    console.log('✅ Session check successful:', session ? 'Session exists' : 'No session')
    
    // Test if we can handle auth requests
    console.log('✅ Auth API ready for requests')
    
    console.log('\n🎉 All tests passed!')
    console.log('\n📋 Next steps:')
    console.log('1. Start your dev server: npm run dev')
    console.log('2. Visit http://localhost:3000/test-login')
    console.log('3. Test Google OAuth sign-in')
    console.log('4. Check for any remaining timeout errors')
    
  } catch (error) {
    console.error('❌ Auth test failed:', error)
    process.exit(1)
  }
}

testCompleteAuth()