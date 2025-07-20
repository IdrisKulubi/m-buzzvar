import { auth, getUserRole } from "@/lib/auth/better-auth-server"
import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL!,
  ssl: process.env.NODE_ENV === 'production',
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getUserRole(session.user.id)
    
    // Get permissions for the user's role
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT permissions
        FROM admin_roles
        WHERE name = $1 AND is_active = true
      `, [role])
      
      const permissions = result.rows[0]?.permissions || ['view_venues', 'create_vibe_checks', 'create_reviews', 'favorite_venues']
      
      return NextResponse.json({ 
        permissions,
        role,
        user: session.user 
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}