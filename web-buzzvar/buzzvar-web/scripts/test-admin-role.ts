#!/usr/bin/env tsx

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function testAdminRole() {
  console.log('🧪 Testing admin role functionality...')
  
  try {
    // Import Better Auth configuration
    const { getUserRole, getUserByEmail } = await import('../src/lib/auth/better-auth-server')
    
    console.log('✅ Better Auth functions imported successfully')
    
    // Check admin emails configuration
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []
    console.log('📧 Admin emails configured:', adminEmails)
    
    // Test if your email is in the admin list
    const testEmail = 'kulubiidris@gmail.com'
    const isAdminEmail = adminEmails.includes(testEmail)
    console.log(`📋 Is ${testEmail} an admin email?`, isAdminEmail ? '✅ YES' : '❌ NO')
    
    // Try to get user by email (if they exist in database)
    const user = await getUserByEmail(testEmail)
    if (user) {
      console.log('👤 User found in database:', user.email)
      
      // Test role function
      const role = await getUserRole(user.id)
      console.log('🎭 User role:', role)
      console.log('👑 Is admin?', role === 'admin' ? '✅ YES' : '❌ NO')
    } else {
      console.log('👤 User not found in database (they need to sign in first)')
    }
    
    console.log('\n🎉 Admin role test completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Sign in with Google using kulubiidris@gmail.com')
    console.log('2. Check session to see if role is "admin"')
    console.log('3. Test admin-only features')
    
  } catch (error) {
    console.error('❌ Admin role test failed:', error)
  }
}

testAdminRole()