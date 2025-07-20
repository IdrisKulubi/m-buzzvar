'use server'

import { auth, getUserRole, isAdmin, isVenueOwner } from '@/lib/auth/better-auth-server'
import { headers } from 'next/headers'
import { Pool } from 'pg'
import { revalidatePath } from 'next/cache'

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL!,
  ssl: process.env.NODE_ENV === 'production',
})

export async function getPromotionsAction(venueId?: string) {
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
      let query: string
      let params: any[]

      if (venueId) {
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

        query = `
          SELECT p.*, v.name as venue_name
          FROM promotions p
          JOIN venues v ON p.venue_id = v.id
          WHERE p.venue_id = $1
          ORDER BY p.created_at DESC
        `
        params = [venueId]
      } else if (userIsAdmin) {
        // Admin can see all promotions
        query = `
          SELECT p.*, v.name as venue_name
          FROM promotions p
          JOIN venues v ON p.venue_id = v.id
          ORDER BY p.created_at DESC
        `
        params = []
      } else {
        // Venue owners can only see their own promotions
        query = `
          SELECT p.*, v.name as venue_name
          FROM promotions p
          JOIN venues v ON p.venue_id = v.id
          JOIN venue_owners vo ON v.id = vo.venue_id
          WHERE vo.user_id = $1 AND vo.is_active = true
          ORDER BY p.created_at DESC
        `
        params = [session.user.id]
      }

      const result = await client.query(query, params)
      return { promotions: result.rows }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Get promotions error:', error)
    return { error: 'Failed to fetch promotions' }
  }
}

export async function createPromotionAction(promotionData: {
  venue_id: string
  title: string
  description: string
  start_date: string
  end_date: string
  days_of_week: string[]
  start_time?: string
  end_time?: string
  promotion_type: string
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
      // Check if user owns the venue (unless admin)
      if (!userIsAdmin) {
        const ownershipResult = await client.query(`
          SELECT id FROM venue_owners 
          WHERE user_id = $1 AND venue_id = $2 AND is_active = true
        `, [session.user.id, promotionData.venue_id])

        if (ownershipResult.rows.length === 0) {
          return { error: 'Insufficient permissions' }
        }
      }

      const result = await client.query(`
        INSERT INTO promotions (
          venue_id, title, description, start_date, end_date, 
          days_of_week, start_time, end_time, promotion_type, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
        RETURNING *
      `, [
        promotionData.venue_id,
        promotionData.title,
        promotionData.description,
        promotionData.start_date,
        promotionData.end_date,
        promotionData.days_of_week,
        promotionData.start_time || null,
        promotionData.end_time || null,
        promotionData.promotion_type
      ])

      revalidatePath('/dashboard')
      revalidatePath('/promotions')
      revalidatePath(`/venues/${promotionData.venue_id}`)

      return { promotion: result.rows[0] }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Create promotion error:', error)
    return { error: 'Failed to create promotion' }
  }
}

export async function updatePromotionAction(promotionId: string, promotionData: {
  title?: string
  description?: string
  start_date?: string
  end_date?: string
  days_of_week?: string[]
  start_time?: string
  end_time?: string
  promotion_type?: string
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
          SELECT p.id FROM promotions p
          JOIN venue_owners vo ON p.venue_id = vo.venue_id
          WHERE p.id = $1 AND vo.user_id = $2 AND vo.is_active = true
        `, [promotionId, session.user.id])

        if (ownershipResult.rows.length === 0) {
          return { error: 'Insufficient permissions' }
        }
      }

      // Build dynamic update query
      const updateFields = []
      const values = []
      let paramIndex = 1

      for (const [key, value] of Object.entries(promotionData)) {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`)
          values.push(value)
          paramIndex++
        }
      }

      if (updateFields.length === 0) {
        return { error: 'No fields to update' }
      }

      values.push(promotionId)
      const query = `
        UPDATE promotions 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `

      const result = await client.query(query, values)

      if (result.rows.length === 0) {
        return { error: 'Promotion not found' }
      }

      revalidatePath('/dashboard')
      revalidatePath('/promotions')

      return { promotion: result.rows[0] }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Update promotion error:', error)
    return { error: 'Failed to update promotion' }
  }
}

export async function deletePromotionAction(promotionId: string) {
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
          SELECT p.id FROM promotions p
          JOIN venue_owners vo ON p.venue_id = vo.venue_id
          WHERE p.id = $1 AND vo.user_id = $2 AND vo.is_active = true
        `, [promotionId, session.user.id])

        if (ownershipResult.rows.length === 0) {
          return { error: 'Insufficient permissions' }
        }
      }

      const result = await client.query(`
        DELETE FROM promotions 
        WHERE id = $1
        RETURNING *
      `, [promotionId])

      if (result.rows.length === 0) {
        return { error: 'Promotion not found' }
      }

      revalidatePath('/dashboard')
      revalidatePath('/promotions')

      return { success: true }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Delete promotion error:', error)
    return { error: 'Failed to delete promotion' }
  }
}