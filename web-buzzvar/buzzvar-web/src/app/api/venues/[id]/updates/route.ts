import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/neon-client'
import { venues } from '@/lib/database/schema'
import { eq, gte, and } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    const { id } = await params
    const venueId = id
    
    if (!since) {
      return NextResponse.json({ error: 'Missing since parameter' }, { status: 400 })
    }

    const sinceDate = new Date(since)
    
    // Query for specific venue updates since the specified time
    const updates = await db
      .select({
        id: venues.id,
        name: venues.name,
        description: venues.description,
        status: venues.isActive,
        updatedAt: venues.updatedAt,
        updatedBy: venues.ownerId
      })
      .from(venues)
      .where(
        and(
          eq(venues.id, venueId),
          gte(venues.updatedAt, sinceDate)
        )
      )
      .orderBy(venues.updatedAt)
      .limit(1)

    const update = updates[0] || null
    return NextResponse.json(update)
  } catch (error) {
    console.error('Error fetching venue specific updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}