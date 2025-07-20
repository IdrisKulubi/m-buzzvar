#!/usr/bin/env tsx

import { Pool } from 'pg'
import { initializeDefaultRoles } from '../lib/auth/better-auth-server'

async function initializeBetterAuth() {
  console.log('🚀 Initializing Better Auth...')
  
  const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL!,
    ssl: process.env.NODE_ENV === 'production',
  })

  try {
    // Test database connection
    console.log('📡 Testing database connection...')
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    console.log('✅ Database connection successful')

    // Initialize default roles
    console.log('👥 Initializing default roles...')
    await initializeDefaultRoles()
    console.log('✅ Default roles initialized')

    // Check if admin users need to be assigned
    console.log('🔐 Checking admin user assignments...')
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || []
    
    if (adminEmails.length > 0) {
      const client = await pool.connect()
      try {
        for (const email of adminEmails) {
          // Check if user exists
          const userResult = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
          )
          
          if (userResult.rows.length > 0) {
            const userId = userResult.rows[0].id
            
            // Check if user already has admin role
            const roleResult = await client.query(`
              SELECT aur.id 
              FROM admin_user_roles aur
              JOIN admin_roles ar ON aur.role_id = ar.id
              WHERE aur.user_id = $1 AND ar.name IN ('admin', 'super_admin') AND aur.is_active = true
            `, [userId])
            
            if (roleResult.rows.length === 0) {
              // Assign admin role
              const adminRoleResult = await client.query(
                'SELECT id FROM admin_roles WHERE name = $1',
                ['admin']
              )
              
              if (adminRoleResult.rows.length > 0) {
                await client.query(`
                  INSERT INTO admin_user_roles (user_id, role_id, is_active)
                  VALUES ($1, $2, true)
                `, [userId, adminRoleResult.rows[0].id])
                
                console.log(`✅ Assigned admin role to ${email}`)
              }
            } else {
              console.log(`ℹ️  ${email} already has admin role`)
            }
          } else {
            console.log(`⚠️  User ${email} not found in database`)
          }
        }
      } finally {
        client.release()
      }
    }

    console.log('🎉 Better Auth initialization completed successfully!')
    
  } catch (error) {
    console.error('❌ Error initializing Better Auth:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the initialization
if (require.main === module) {
  initializeBetterAuth()
}