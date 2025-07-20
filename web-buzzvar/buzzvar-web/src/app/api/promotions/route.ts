import { NextRequest, NextResponse } from 'next/server'
import { auth, getUserRole, isAdmin, isVenueOwner } from '@/lib/auth/better-auth-server'
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

    const userRole = await getUserRole(session.user.id)
    const userIsAdmin = await isAdmin(session.user.id)
    const userIsVenueOwner = await isVenueOwner(session.user.id)
    
    if (!userIsVenueOwner && !userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venue_id')
    const type = searchParams.get('type')
    const isActive = searchParams.get('is_active')

    if (!venueId) {
      return NextResponse.json({ error: 'venue_id is required' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      // Check if user owns the venue (unless admin)
      if (!userIsAdmin) {
        const ownershipResult = await client.query(`
          SELECT id FROM venue_owners 
          WHERE user_id = $1 AND venue_id = $2 AND is_active = true
        `, [session.user.id, venueId])

        if (ownershipResult.rows.length === 0) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }

      let query = `
        SELECT * FROM promotions 
        WHERE venue_id = $1
      `
      const params = [venueId]
      let paramIndex = 2

      if (type) {
        query += ` AND promotion_type = $${paramIndex}`
        params.push(type)
        paramIndex++
      }

      if (isActive !== null) {
        query += ` AND is_active = $${paramIndex}`
        params.push(isActive === 'true')
        paramIndex++
      }

      query += ` ORDER BY created_at DESC`

      const result = await client.query(query, params)

      return NextResponse.json({ data: result.rows })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Promotions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(session.user.id)
    const userIsAdmin = await isAdmin(session.user.id)
    const userIsVenueOwner = await isVenueOwner(session.user.id)
    
    if (!userIsVenueOwner && !userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { venue_id, title, description, start_date, end_date, days_of_week, start_time, end_time, promotion_type } = body

    if (!venue_id || !title || !description || !start_date || !end_date || !days_of_week || !promotion_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = await pool.connect()
    try {
      // Check if user owns the venue (unless admin)
      if (!userIsAdmin) {
        const ownershipResult = await client.query(`
          SELECT id FROM venue_owners 
          WHERE user_id = $1 AND venue_id = $2 AND is_active = true
        `, [session.user.id, venue_id])

        if (ownershipResult.rows.length === 0) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }

      const result = await client.query(`
        INSERT INTO promotions (
          venue_id, title, description, start_date, end_date, 
          days_of_week, start_time, end_time, promotion_type, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        venue_id, title, description, start_date, end_date,
        days_of_week, start_time || null, end_time || null, promotion_type, true
      ])

      return NextResponse.json({ data: result.rows[0] }, { status: 201 })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Promotions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}