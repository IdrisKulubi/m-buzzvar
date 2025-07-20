import { NextRequest, NextResponse } from 'next/server'
import { auth, getUserRole, isAdmin, isVenueOwner } from '@/lib/auth/better-auth-server'
import { AdminService } from '@/services/adminService'
import { AnalyticsService } from '@/services/analyticsService'
import { headers } from 'next/headers'
import { Pool } from 'pg'

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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const venueId = searchParams.get('venueId')
    const period = searchParams.get('period') || '7d'

    const userRole = await getUserRole(session.user.id)
    const userIsAdmin = await isAdmin(session.user.id)

    switch (type) {
      case 'platform':
        if (!userIsAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }
        const platformAnalytics = await AdminService.getPlatformAnalytics()
        return NextResponse.json({ data: platformAnalytics })

      case 'system-health':
        if (!userIsAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }
        const systemHealth = await AdminService.getSystemHealthMetrics()
        return NextResponse.json({ data: systemHealth })

      case 'real-time':
        if (!userIsAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }
        const realTimeMetrics = await AdminService.getRealTimeMetrics()
        return NextResponse.json({ data: realTimeMetrics })

      case 'venue':
        if (!venueId) {
          return NextResponse.json({ error: 'Venue ID required' }, { status: 400 })
        }
        
        // Check if user owns the venue or is admin
        if (!userIsAdmin) {
          const client = await pool.connect()
          try {
            const result = await client.query(`
              SELECT id FROM venue_owners 
              WHERE venue_id = $1 AND user_id = $2 AND is_active = true
            `, [venueId, session.user.id])

            if (result.rows.length === 0) {
              return NextResponse.json({ error: 'Access denied' }, { status: 403 })
            }
          } finally {
            client.release()
          }
        }

        const venueAnalytics = await AnalyticsService.getVenueAnalytics(venueId, period)
        return NextResponse.json({ data: venueAnalytics })

      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}