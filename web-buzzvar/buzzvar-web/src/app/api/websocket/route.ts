import { NextRequest, NextResponse } from 'next/server'
import { getRealtimeServer } from '@/lib/realtime/websocket-server'

export async function GET(request: NextRequest) {
  try {
    // Start the WebSocket server if not already running
    const server = getRealtimeServer(8080)
    const stats = server.getStats()
    
    return NextResponse.json({
      status: 'running',
      port: 8080,
      stats
    })
  } catch (error) {
    console.error('Error starting WebSocket server:', error)
    return NextResponse.json({ error: 'Failed to start WebSocket server' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, channel, data, userId } = body
    
    const server = getRealtimeServer(8080)
    
    switch (action) {
      case 'broadcast':
        if (!channel || !data) {
          return NextResponse.json({ error: 'Missing channel or data' }, { status: 400 })
        }
        server.broadcastToChannel(channel, data, userId)
        return NextResponse.json({ success: true, message: 'Broadcast sent' })
      
      case 'notify':
        if (!userId || !data) {
          return NextResponse.json({ error: 'Missing userId or data' }, { status: 400 })
        }
        server.sendNotification(userId, data)
        return NextResponse.json({ success: true, message: 'Notification sent' })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error handling WebSocket action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}