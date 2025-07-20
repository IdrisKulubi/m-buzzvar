import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/neon-client'
import { notifications } from '@/lib/database/schema'
import { gte } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    
    if (!since) {
      return NextResponse.json({ error: 'Missing since parameter' }, { status: 400 })
    }

    const sinceDate = new Date(since)
    
    // Query for notifications since the specified time
    const notificationUpdates = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        data: notifications.data,
        createdAt: notifications.createdAt
      })
      .from(notifications)
      .where(gte(notifications.createdAt, sinceDate))
      .orderBy(notifications.createdAt)

    return NextResponse.json(notificationUpdates)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}