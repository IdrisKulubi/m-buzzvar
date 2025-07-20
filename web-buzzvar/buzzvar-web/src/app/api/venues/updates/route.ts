import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/neon-client'
import { venues } from '@/lib/database/schema'
import { gte } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    
    if (!since) {
      return NextResponse.json({ error: 'Missing since parameter' }, { status: 400 })
    }

    const sinceDate = new Date(since)
    
    // Query for venue updates since the specified time
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
      .where(gte(venues.updatedAt, sinceDate))
      .orderBy(venues.updatedAt)

    return NextResponse.json(updates)
  } catch (error) {
    console.error('Error fetching venue updates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}