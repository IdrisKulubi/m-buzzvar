import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/neon-client'
import { promotions } from '@/lib/database/schema'
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
    
    // Query for promotions since the specified time
    const promotionUpdates = await db
      .select({
        id: promotions.id,
        venueId: promotions.venueId,
        title: promotions.title,
        description: promotions.description,
        startDate: promotions.startDate,
        endDate: promotions.endDate,
        status: promotions.isActive,
        createdAt: promotions.createdAt
      })
      .from(promotions)
      .where(
        and(
          eq(promotions.venueId, venueId),
          gte(promotions.updatedAt, sinceDate)
        )
      )
      .orderBy(promotions.updatedAt)

    return NextResponse.json(promotionUpdates)
  } catch (error) {
    console.error('Error fetching promotions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}