import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/neon-client'
import { vibeChecks } from '@/lib/database/schema'
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
    
    // Query for vibe checks since the specified time
    const vibeCheckUpdates = await db
      .select({
        id: vibeChecks.id,
        venueId: vibeChecks.venueId,
        userId: vibeChecks.userId,
        rating: vibeChecks.energyLevel, // Using energyLevel as rating
        comment: vibeChecks.notes,
        createdAt: vibeChecks.createdAt
      })
      .from(vibeChecks)
      .where(
        and(
          eq(vibeChecks.venueId, venueId),
          gte(vibeChecks.createdAt, sinceDate)
        )
      )
      .orderBy(vibeChecks.createdAt)

    return NextResponse.json(vibeCheckUpdates)
  } catch (error) {
    console.error('Error fetching vibe checks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}