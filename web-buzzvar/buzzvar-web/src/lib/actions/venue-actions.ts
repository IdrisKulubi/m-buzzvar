'use server'

import { auth, getUserRole, isAdmin, isVenueOwner } from '@/lib/auth/better-auth-server'
import { headers } from 'next/headers'
import { Pool } from 'pg'
import { revalidatePath } from 'next/cache'

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL!,
  ssl: process.env.NODE_ENV === 'production',
})

export async function getVenuesAction() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return { error: 'Unauthorized' }
    }

    const userIsAdmin = await isAdmin(session.user.id)
    const client = await pool.connect()

    try {
      let query: string
      let params: any[]

      if (userIsAdmin) {
        // Admin can see all venues
        query = `
          SELECT v.*, 
                 COUNT(vc.id) as vibe_check_count,
                 AVG(vc.overall_rating) as average_rating
          FROM venues v
          LEFT JOIN vibe_checks vc ON v.id = vc.venue_id
          GROUP BY v.id
          ORDER BY v.created_at DESC
        `
        params = []
      } else {
        // Venue owners can only see their own venues
        query = `
          SELECT v.*, 
                 COUNT(vc.id) as vibe_check_count,
                 AVG(vc.overall_rating) as average_rating
          FROM venues v
          INNER JOIN venue_owners vo ON v.id = vo.venue_id
          LEFT JOIN vibe_checks vc ON v.id = vc.venue_id
          WHERE vo.user_id = $1 AND vo.is_active = true
          GROUP BY v.id
          ORDER BY v.created_at DESC
        `
        params = [session.user.id]
      }

      const result = await client.query(query, params)
      return { venues: result.rows }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Get venues error:', error)
    return { error: 'Failed to fetch venues' }
  }
}

export async function createVenueAction(venueData: {
  name: string
  description?: string
  address: string
  city: string
  state: string
  zip_code: string
  phone?: string
  website?: string
  venue_type: string
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return { error: 'Unauthorized' }
    }

    const userIsAdmin = await isAdmin(session.user.id)
    const userIsVenueOwner = await isVenueOwner(session.user.id)

    if (!userIsAdmin && !userIsVenueOwner) {
      return { error: 'Insufficient permissions' }
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Create venue
      const venueResult = await client.query(`
        INSERT INTO venues (
          name, description, address, city, state, zip_code, 
          phone, website, venue_type, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        RETURNING *
      `, [
        venueData.name,
        venueData.description,
        venueData.address,
        venueData.city,
        venueData.state,
        venueData.zip_code,
        venueData.phone,
        venueData.website,
        venueData.venue_type
      ])

      const venue = venueResult.rows[0]

      // Assign venue ownership to current user (unless admin creating for someone else)
      await client.query(`
        INSERT INTO venue_owners (user_id, venue_id, role, is_active)
        VALUES ($1, $2, 'owner', true)
      `, [session.user.id, venue.id])

      await client.query('COMMIT')

      revalidatePath('/dashboard')
      revalidatePath('/venues')

      return { venue }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Create venue error:', error)
    return { error: 'Failed to create venue' }
  }
}

export async function updateVenueAction(venueId: string, venueData: {
  name?: string
  description?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  phone?: string
  website?: string
  venue_type?: string
  is_active?: boolean
}) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return { error: 'Unauthorized' }
    }

    const userIsAdmin = await isAdmin(session.user.id)
    const client = await pool.connect()

    try {
      // Check if user owns the venue (unless admin)
      if (!userIsAdmin) {
        const ownershipResult = await client.query(`
          SELECT id FROM venue_owners 
          WHERE user_id = $1 AND venue_id = $2 AND is_active = true
        `, [session.user.id, venueId])

        if (ownershipResult.rows.length === 0) {
          return { error: 'Insufficient permissions' }
        }
      }

      // Build dynamic update query
      const updateFields = []
      const values = []
      let paramIndex = 1

      for (const [key, value] of Object.entries(venueData)) {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`)
          values.push(value)
          paramIndex++
        }
      }

      if (updateFields.length === 0) {
        return { error: 'No fields to update' }
      }

      values.push(venueId)
      const query = `
        UPDATE venues 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `

      const result = await client.query(query, values)

      if (result.rows.length === 0) {
        return { error: 'Venue not found' }
      }

      revalidatePath('/dashboard')
      revalidatePath('/venues')
      revalidatePath(`/venues/${venueId}`)

      return { venue: result.rows[0] }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Update venue error:', error)
    return { error: 'Failed to update venue' }
  }
}

export async function deleteVenueAction(venueId: string) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session) {
      return { error: 'Unauthorized' }
    }

    const userIsAdmin = await isAdmin(session.user.id)
    const client = await pool.connect()

    try {
      // Check if user owns the venue (unless admin)
      if (!userIsAdmin) {
        const ownershipResult = await client.query(`
          SELECT id FROM venue_owners 
          WHERE user_id = $1 AND venue_id = $2 AND is_active = true
        `, [session.user.id, venueId])

        if (ownershipResult.rows.length === 0) {
          return { error: 'Insufficient permissions' }
        }
      }

      // Soft delete the venue
      const result = await client.query(`
        UPDATE venues 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [venueId])

      if (result.rows.length === 0) {
        return { error: 'Venue not found' }
      }

      revalidatePath('/dashboard')
      revalidatePath('/venues')

      return { success: true }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Delete venue error:', error)
    return { error: 'Failed to delete venue' }
  }
}