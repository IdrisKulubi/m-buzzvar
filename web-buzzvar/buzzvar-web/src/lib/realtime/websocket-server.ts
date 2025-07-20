import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { parse } from 'url'

interface ClientConnection {
  ws: WebSocket
  userId?: string
  subscriptions: Set<string>
  lastPing: number
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'pong'
  channel?: string
  data?: any
}

interface BroadcastMessage {
  type: 'broadcast' | 'notification'
  channel: string
  data: any
  timestamp: number
}

export class RealtimeServer {
  private wss: WebSocketServer
  private clients: Map<string, ClientConnection> = new Map()
  private channels: Map<string, Set<string>> = new Map()
  private pingInterval: NodeJS.Timeout
  private port: number

  constructor(port: number = 8080) {
    this.port = port
    const server = createServer()
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    })
    
    this.wss.on('connection', this.handleConnection.bind(this))
    
    // Start ping/pong heartbeat
    this.pingInterval = setInterval(this.pingClients.bind(this), 30000)
    
    server.listen(port, () => {
      console.log(`WebSocket server running on port ${port}`)
    })
  }

  private handleConnection(ws: WebSocket, request: any) {
    const clientId = crypto.randomUUID()
    const url = parse(request.url, true)
    const userId = url.query.userId as string
    
    const client: ClientConnection = {
      ws,
      userId,
      subscriptions: new Set(),
      lastPing: Date.now(),
    }
    
    this.clients.set(clientId, client)
    console.log(`Client ${clientId} connected${userId ? ` (user: ${userId})` : ''}`)

    ws.on('message', (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString())
        this.handleMessage(clientId, message)
      } catch (error) {
        console.error('Invalid message format:', error)
        this.sendError(ws, 'Invalid message format')
      }
    })

    ws.on('close', () => {
      this.handleDisconnection(clientId)
    })

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error)
      this.handleDisconnection(clientId)
    })

    // Send welcome message
    this.sendMessage(ws, {
      type: 'connected',
      clientId,
      timestamp: Date.now()
    })
  }

  private handleMessage(clientId: string, message: WebSocketMessage) {
    const client = this.clients.get(clientId)
    if (!client) return

    switch (message.type) {
      case 'subscribe':
        if (message.channel) {
          this.subscribeToChannel(clientId, message.channel)
        }
        break
      
      case 'unsubscribe':
        if (message.channel) {
          this.unsubscribeFromChannel(clientId, message.channel)
        }
        break
      
      case 'ping':
        client.lastPing = Date.now()
        this.sendMessage(client.ws, { type: 'pong', timestamp: Date.now() })
        break
      
      default:
        this.sendError(client.ws, `Unknown message type: ${message.type}`)
    }
  }

  private subscribeToChannel(clientId: string, channel: string) {
    const client = this.clients.get(clientId)
    if (!client) return

    client.subscriptions.add(channel)
    
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set())
    }
    this.channels.get(channel)!.add(clientId)

    this.sendMessage(client.ws, {
      type: 'subscribed',
      channel,
      timestamp: Date.now()
    })

    console.log(`Client ${clientId} subscribed to channel: ${channel}`)
  }

  private unsubscribeFromChannel(clientId: string, channel: string) {
    const client = this.clients.get(clientId)
    if (!client) return

    client.subscriptions.delete(channel)
    
    const channelClients = this.channels.get(channel)
    if (channelClients) {
      channelClients.delete(clientId)
      if (channelClients.size === 0) {
        this.channels.delete(channel)
      }
    }

    this.sendMessage(client.ws, {
      type: 'unsubscribed',
      channel,
      timestamp: Date.now()
    })

    console.log(`Client ${clientId} unsubscribed from channel: ${channel}`)
  }

  private handleDisconnection(clientId: string) {
    const client = this.clients.get(clientId)
    if (!client) return

    // Remove from all channels
    client.subscriptions.forEach(channel => {
      const channelClients = this.channels.get(channel)
      if (channelClients) {
        channelClients.delete(clientId)
        if (channelClients.size === 0) {
          this.channels.delete(channel)
        }
      }
    })

    this.clients.delete(clientId)
    console.log(`Client ${clientId} disconnected`)
  }

  private pingClients() {
    const now = Date.now()
    const staleThreshold = 60000 // 1 minute

    this.clients.forEach((client, clientId) => {
      if (now - client.lastPing > staleThreshold) {
        console.log(`Removing stale client: ${clientId}`)
        client.ws.terminate()
        this.handleDisconnection(clientId)
      } else if (client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, { type: 'ping', timestamp: now })
      }
    })
  }

  private sendMessage(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      error,
      timestamp: Date.now()
    })
  }

  // Public methods for broadcasting
  public broadcastToChannel(channel: string, data: any, excludeUserId?: string) {
    const message: BroadcastMessage = {
      type: 'broadcast',
      channel,
      data,
      timestamp: Date.now(),
    }

    const channelClients = this.channels.get(channel)
    if (!channelClients) return

    let sentCount = 0
    channelClients.forEach((clientId) => {
      const client = this.clients.get(clientId)
      if (client && client.ws.readyState === WebSocket.OPEN) {
        // Skip if this is the user who triggered the update
        if (excludeUserId && client.userId === excludeUserId) {
          return
        }
        
        this.sendMessage(client.ws, message)
        sentCount++
      }
    })

    console.log(`Broadcasted to ${sentCount} clients in channel: ${channel}`)
  }

  public sendNotification(userId: string, data: any) {
    let sentCount = 0
    
    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, {
          type: 'notification',
          data,
          timestamp: Date.now()
        })
        sentCount++
      }
    })

    console.log(`Sent notification to ${sentCount} connections for user: ${userId}`)
  }

  public getStats() {
    return {
      totalClients: this.clients.size,
      totalChannels: this.channels.size,
      channels: Array.from(this.channels.entries()).map(([channel, clients]) => ({
        channel,
        clientCount: clients.size
      }))
    }
  }

  public close() {
    clearInterval(this.pingInterval)
    this.wss.close()
    this.clients.clear()
    this.channels.clear()
  }
}

// Singleton instance
let realtimeServer: RealtimeServer | null = null

export function getRealtimeServer(port?: number): RealtimeServer {
  if (!realtimeServer) {
    realtimeServer = new RealtimeServer(port)
  }
  return realtimeServer
}

export function closeRealtimeServer() {
  if (realtimeServer) {
    realtimeServer.close()
    realtimeServer = null
  }
}