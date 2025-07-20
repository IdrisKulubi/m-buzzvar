'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface WebSocketMessage {
  type: string
  channel?: string
  data?: any
  timestamp?: number
  error?: string
  clientId?: string
}

interface RealtimeClientOptions {
  url: string
  userId?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

interface ChannelSubscription {
  channel: string
  callback: (data: any) => void
}

export class RealtimeClient {
  private ws: WebSocket | null = null
  private url: string
  private userId?: string
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private heartbeatInterval: number
  private reconnectAttempts = 0
  private subscriptions = new Map<string, Set<(data: any) => void>>()
  private isConnected = false
  private shouldReconnect = true
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private connectionPromise: Promise<void> | null = null
  private eventListeners = new Map<string, Set<(data: any) => void>>()

  constructor(options: RealtimeClientOptions) {
    this.url = options.url
    this.userId = options.userId
    this.reconnectInterval = options.reconnectInterval || 3000
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10
    this.heartbeatInterval = options.heartbeatInterval || 30000
  }

  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const wsUrl = new URL(this.url)
        if (this.userId) {
          wsUrl.searchParams.set('userId', this.userId)
        }

        this.ws = new WebSocket(wsUrl.toString())

        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.emit('connected', { timestamp: Date.now() })
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.isConnected = false
          this.stopHeartbeat()
          this.emit('disconnected', { code: event.code, reason: event.reason })
          
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.emit('error', { error })
          reject(error)
        }

      } catch (error) {
        reject(error)
      }
    })

    return this.connectionPromise
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'connected':
        console.log('WebSocket connection confirmed:', message.clientId)
        break

      case 'broadcast':
        if (message.channel && message.data) {
          this.notifySubscribers(message.channel, message.data)
        }
        break

      case 'notification':
        if (message.data) {
          this.emit('notification', message.data)
        }
        break

      case 'subscribed':
        console.log('Subscribed to channel:', message.channel)
        this.emit('subscribed', { channel: message.channel })
        break

      case 'unsubscribed':
        console.log('Unsubscribed from channel:', message.channel)
        this.emit('unsubscribed', { channel: message.channel })
        break

      case 'ping':
        this.send({ type: 'pong' })
        break

      case 'pong':
        // Heartbeat response received
        break

      case 'error':
        console.error('WebSocket server error:', message.error)
        this.emit('error', { error: message.error })
        break

      default:
        console.warn('Unknown message type:', message.type)
    }
  }

  private notifySubscribers(channel: string, data: any) {
    const callbacks = this.subscriptions.get(channel)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in subscription callback:', error)
        }
      })
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error('Error in event listener:', error)
        }
      })
    }
  }

  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, message not sent:', message)
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' })
    }, this.heartbeatInterval)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000)
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    this.reconnectTimer = setTimeout(() => {
      this.connectionPromise = null
      this.connect().catch(error => {
        console.error('Reconnect failed:', error)
      })
    }, delay)
  }

  // Public methods
  subscribe(channel: string, callback: (data: any) => void) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set())
    }
    this.subscriptions.get(channel)!.add(callback)

    // Send subscription message if connected
    if (this.isConnected) {
      this.send({ type: 'subscribe', channel })
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channel, callback)
    }
  }

  unsubscribe(channel: string, callback?: (data: any) => void) {
    const callbacks = this.subscriptions.get(channel)
    if (callbacks) {
      if (callback) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.subscriptions.delete(channel)
          if (this.isConnected) {
            this.send({ type: 'unsubscribe', channel })
          }
        }
      } else {
        // Unsubscribe all callbacks for this channel
        this.subscriptions.delete(channel)
        if (this.isConnected) {
          this.send({ type: 'unsubscribe', channel })
        }
      }
    }
  }

  on(event: string, listener: (data: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)

    // Return remove listener function
    return () => {
      const listeners = this.eventListeners.get(event)
      if (listeners) {
        listeners.delete(listener)
        if (listeners.size === 0) {
          this.eventListeners.delete(event)
        }
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false
    this.stopHeartbeat()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnected = false
    this.connectionPromise = null
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: Array.from(this.subscriptions.keys())
    }
  }
}

// React hook for using the realtime client
export function useRealtimeClient(options: RealtimeClientOptions) {
  const clientRef = useRef<RealtimeClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    clientRef.current = new RealtimeClient(options)
    
    const client = clientRef.current
    
    const handleConnected = () => setIsConnected(true)
    const handleDisconnected = () => setIsConnected(false)
    const handleError = (data: any) => setError(data.error)

    client.on('connected', handleConnected)
    client.on('disconnected', handleDisconnected)
    client.on('error', handleError)

    client.connect().catch(err => {
      console.error('Failed to connect to WebSocket:', err)
      setError(err.message)
    })

    return () => {
      client.disconnect()
    }
  }, [options.url, options.userId])

  const subscribe = useCallback((channel: string, callback: (data: any) => void) => {
    return clientRef.current?.subscribe(channel, callback)
  }, [])

  const unsubscribe = useCallback((channel: string, callback?: (data: any) => void) => {
    clientRef.current?.unsubscribe(channel, callback)
  }, [])

  return {
    client: clientRef.current,
    isConnected,
    error,
    subscribe,
    unsubscribe
  }
}

// Hook for subscribing to a specific channel
export function useChannelSubscription(
  client: RealtimeClient | null,
  channel: string,
  callback: (data: any) => void,
  enabled = true
) {
  useEffect(() => {
    if (!client || !enabled) return

    const unsubscribe = client.subscribe(channel, callback)
    return unsubscribe
  }, [client, channel, callback, enabled])
}