import { RealtimeClient } from './websocket-client-web'

export interface VenueUpdate {
  id: string
  name?: string
  description?: string
  status?: 'active' | 'inactive'
  updatedAt: string
  updatedBy: string
}

export interface VibeCheckUpdate {
  id: string
  venueId: string
  userId: string
  rating: number
  comment?: string
  createdAt: string
}

export interface PromotionUpdate {
  id: string
  venueId: string
  title: string
  description: string
  startDate: string
  endDate: string
  status: 'active' | 'inactive' | 'expired'
  createdAt: string
}

export interface NotificationData {
  id: string
  type: 'venue_update' | 'vibe_check' | 'promotion' | 'system'
  title: string
  message: string
  data?: any
  createdAt: string
}

export class RealtimeService {
  private client: RealtimeClient
  private fallbackPollingInterval: number = 30000 // 30 seconds
  private pollingTimers: Map<string, NodeJS.Timeout> = new Map()
  private isPollingEnabled: boolean = false

  constructor(wsUrl: string, userId?: string) {
    this.client = new RealtimeClient({
      url: wsUrl,
      userId,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000
    })

    // Set up connection monitoring for fallback polling
    this.client.on('connected', () => {
      console.log('WebSocket connected, disabling polling fallback')
      this.disablePolling()
    })

    this.client.on('disconnected', () => {
      console.log('WebSocket disconnected, enabling polling fallback')
      this.enablePolling()
    })

    this.client.on('error', (error) => {
      console.error('WebSocket error, enabling polling fallback:', error)
      this.enablePolling()
    })
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect()
    } catch (error) {
      console.error('Failed to connect to WebSocket, falling back to polling:', error)
      this.enablePolling()
    }
  }

  disconnect(): void {
    this.client.disconnect()
    this.disablePolling()
  }

  // Venue-related subscriptions
  subscribeToVenueUpdates(callback: (update: VenueUpdate) => void): () => void {
    const channel = 'venue_updates'
    
    const unsubscribeWs = this.client.subscribe(channel, callback)
    
    // Set up polling fallback
    const pollVenueUpdates = () => {
      if (this.isPollingEnabled) {
        this.pollVenueUpdates(callback)
      }
    }
    
    this.setupPolling(channel, pollVenueUpdates)
    
    return () => {
      unsubscribeWs()
      this.clearPolling(channel)
    }
  }

  subscribeToVenueSpecific(venueId: string, callback: (update: VenueUpdate) => void): () => void {
    const channel = `venue:${venueId}`
    
    const unsubscribeWs = this.client.subscribe(channel, callback)
    
    const pollVenueSpecific = () => {
      if (this.isPollingEnabled) {
        this.pollVenueSpecific(venueId, callback)
      }
    }
    
    this.setupPolling(channel, pollVenueSpecific)
    
    return () => {
      unsubscribeWs()
      this.clearPolling(channel)
    }
  }

  // Vibe check subscriptions
  subscribeToVibeChecks(venueId: string, callback: (vibeCheck: VibeCheckUpdate) => void): () => void {
    const channel = `vibe_checks:${venueId}`
    
    const unsubscribeWs = this.client.subscribe(channel, callback)
    
    const pollVibeChecks = () => {
      if (this.isPollingEnabled) {
        this.pollVibeChecks(venueId, callback)
      }
    }
    
    this.setupPolling(channel, pollVibeChecks)
    
    return () => {
      unsubscribeWs()
      this.clearPolling(channel)
    }
  }

  // Promotion subscriptions
  subscribeToPromotions(venueId: string, callback: (promotion: PromotionUpdate) => void): () => void {
    const channel = `promotions:${venueId}`
    
    const unsubscribeWs = this.client.subscribe(channel, callback)
    
    const pollPromotions = () => {
      if (this.isPollingEnabled) {
        this.pollPromotions(venueId, callback)
      }
    }
    
    this.setupPolling(channel, pollPromotions)
    
    return () => {
      unsubscribeWs()
      this.clearPolling(channel)
    }
  }

  // Notification subscriptions
  subscribeToNotifications(callback: (notification: NotificationData) => void): () => void {
    const unsubscribeWs = this.client.on('notification', callback)
    
    const pollNotifications = () => {
      if (this.isPollingEnabled) {
        this.pollNotifications(callback)
      }
    }
    
    this.setupPolling('notifications', pollNotifications)
    
    return () => {
      unsubscribeWs()
      this.clearPolling('notifications')
    }
  }

  // Polling fallback methods
  private enablePolling(): void {
    this.isPollingEnabled = true
    console.log('Polling fallback enabled')
  }

  private disablePolling(): void {
    this.isPollingEnabled = false
    this.pollingTimers.forEach((timer) => clearInterval(timer))
    this.pollingTimers.clear()
    console.log('Polling fallback disabled')
  }

  private setupPolling(channel: string, pollFunction: () => void): void {
    if (!this.pollingTimers.has(channel)) {
      const timer = setInterval(pollFunction, this.fallbackPollingInterval)
      this.pollingTimers.set(channel, timer)
    }
  }

  private clearPolling(channel: string): void {
    const timer = this.pollingTimers.get(channel)
    if (timer) {
      clearInterval(timer)
      this.pollingTimers.delete(channel)
    }
  }

  // Polling API calls
  private async pollVenueUpdates(callback: (update: VenueUpdate) => void): Promise<void> {
    try {
      const response = await fetch('/api/venues/updates?since=' + this.getLastUpdateTime('venues'))
      if (response.ok) {
        const updates: VenueUpdate[] = await response.json()
        updates.forEach(callback)
        this.setLastUpdateTime('venues', new Date().toISOString())
      }
    } catch (error) {
      console.error('Failed to poll venue updates:', error)
    }
  }

  private async pollVenueSpecific(venueId: string, callback: (update: VenueUpdate) => void): Promise<void> {
    try {
      const response = await fetch(`/api/venues/${venueId}/updates?since=` + this.getLastUpdateTime(`venue:${venueId}`))
      if (response.ok) {
        const update: VenueUpdate = await response.json()
        if (update) {
          callback(update)
          this.setLastUpdateTime(`venue:${venueId}`, new Date().toISOString())
        }
      }
    } catch (error) {
      console.error('Failed to poll venue specific updates:', error)
    }
  }

  private async pollVibeChecks(venueId: string, callback: (vibeCheck: VibeCheckUpdate) => void): Promise<void> {
    try {
      const response = await fetch(`/api/venues/${venueId}/vibe-checks?since=` + this.getLastUpdateTime(`vibe_checks:${venueId}`))
      if (response.ok) {
        const vibeChecks: VibeCheckUpdate[] = await response.json()
        vibeChecks.forEach(callback)
        this.setLastUpdateTime(`vibe_checks:${venueId}`, new Date().toISOString())
      }
    } catch (error) {
      console.error('Failed to poll vibe checks:', error)
    }
  }

  private async pollPromotions(venueId: string, callback: (promotion: PromotionUpdate) => void): Promise<void> {
    try {
      const response = await fetch(`/api/venues/${venueId}/promotions?since=` + this.getLastUpdateTime(`promotions:${venueId}`))
      if (response.ok) {
        const promotions: PromotionUpdate[] = await response.json()
        promotions.forEach(callback)
        this.setLastUpdateTime(`promotions:${venueId}`, new Date().toISOString())
      }
    } catch (error) {
      console.error('Failed to poll promotions:', error)
    }
  }

  private async pollNotifications(callback: (notification: NotificationData) => void): Promise<void> {
    try {
      const response = await fetch('/api/notifications?since=' + this.getLastUpdateTime('notifications'))
      if (response.ok) {
        const notifications: NotificationData[] = await response.json()
        notifications.forEach(callback)
        this.setLastUpdateTime('notifications', new Date().toISOString())
      }
    } catch (error) {
      console.error('Failed to poll notifications:', error)
    }
  }

  // Helper methods for tracking last update times
  private getLastUpdateTime(key: string): string {
    return localStorage.getItem(`realtime_last_update_${key}`) || new Date(Date.now() - 60000).toISOString()
  }

  private setLastUpdateTime(key: string, time: string): void {
    localStorage.setItem(`realtime_last_update_${key}`, time)
  }

  // Utility methods
  getConnectionState() {
    return this.client.getConnectionState()
  }

  isConnected(): boolean {
    return this.client.getConnectionState().isConnected
  }
}

// Singleton instance for the web app
let realtimeService: RealtimeService | null = null

export function getRealtimeService(wsUrl?: string, userId?: string): RealtimeService {
  if (!realtimeService && wsUrl) {
    realtimeService = new RealtimeService(wsUrl, userId)
  }
  return realtimeService!
}

export function closeRealtimeService(): void {
  if (realtimeService) {
    realtimeService.disconnect()
    realtimeService = null
  }
}