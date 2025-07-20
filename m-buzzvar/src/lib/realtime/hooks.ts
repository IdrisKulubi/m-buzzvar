import { useEffect, useState, useCallback, useRef } from 'react'
import { getRealtimeService, RealtimeServiceMobile, VenueUpdate, VibeCheckUpdate, PromotionUpdate, NotificationData } from './realtime-service-mobile'

// Hook for managing realtime connection
export function useRealtime(wsUrl: string, apiBaseUrl: string, userId?: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const serviceRef = useRef<RealtimeServiceMobile | null>(null)

  useEffect(() => {
    const service = getRealtimeService(wsUrl, apiBaseUrl, userId)
    serviceRef.current = service

    const checkConnection = () => {
      const state = service.getConnectionState()
      setIsConnected(state.isConnected)
    }

    // Initial connection
    service.connect().catch(err => {
      console.error('Failed to connect to realtime service:', err)
      setError(err.message)
    })

    // Check connection state periodically
    const interval = setInterval(checkConnection, 1000)

    return () => {
      clearInterval(interval)
      // Don't disconnect here as it's a singleton
    }
  }, [wsUrl, apiBaseUrl, userId])

  return {
    service: serviceRef.current,
    isConnected,
    error
  }
}

// Hook for venue updates
export function useVenueUpdates(service: RealtimeServiceMobile | null, callback: (update: VenueUpdate) => void) {
  useEffect(() => {
    if (!service) return

    const unsubscribe = service.subscribeToVenueUpdates(callback)
    return unsubscribe
  }, [service, callback])
}

// Hook for specific venue updates
export function useVenueSpecific(service: RealtimeServiceMobile | null, venueId: string, callback: (update: VenueUpdate) => void) {
  useEffect(() => {
    if (!service || !venueId) return

    const unsubscribe = service.subscribeToVenueSpecific(venueId, callback)
    return unsubscribe
  }, [service, venueId, callback])
}

// Hook for vibe checks
export function useVibeChecks(service: RealtimeServiceMobile | null, venueId: string, callback: (vibeCheck: VibeCheckUpdate) => void) {
  useEffect(() => {
    if (!service || !venueId) return

    const unsubscribe = service.subscribeToVibeChecks(venueId, callback)
    return unsubscribe
  }, [service, venueId, callback])
}

// Hook for promotions
export function usePromotions(service: RealtimeServiceMobile | null, venueId: string, callback: (promotion: PromotionUpdate) => void) {
  useEffect(() => {
    if (!service || !venueId) return

    const unsubscribe = service.subscribeToPromotions(venueId, callback)
    return unsubscribe
  }, [service, venueId, callback])
}

// Hook for notifications
export function useNotifications(service: RealtimeServiceMobile | null, callback: (notification: NotificationData) => void) {
  useEffect(() => {
    if (!service) return

    const unsubscribe = service.subscribeToNotifications(callback)
    return unsubscribe
  }, [service, callback])
}

// Combined hook for venue dashboard
export function useVenueDashboard(
  service: RealtimeServiceMobile | null,
  venueId: string,
  callbacks: {
    onVenueUpdate?: (update: VenueUpdate) => void
    onVibeCheck?: (vibeCheck: VibeCheckUpdate) => void
    onPromotion?: (promotion: PromotionUpdate) => void
  }
) {
  const [updates, setUpdates] = useState<{
    venue: VenueUpdate | null
    vibeChecks: VibeCheckUpdate[]
    promotions: PromotionUpdate[]
  }>({
    venue: null,
    vibeChecks: [],
    promotions: []
  })

  const handleVenueUpdate = useCallback((update: VenueUpdate) => {
    setUpdates(prev => ({ ...prev, venue: update }))
    callbacks.onVenueUpdate?.(update)
  }, [callbacks.onVenueUpdate])

  const handleVibeCheck = useCallback((vibeCheck: VibeCheckUpdate) => {
    setUpdates(prev => ({
      ...prev,
      vibeChecks: [vibeCheck, ...prev.vibeChecks.slice(0, 9)] // Keep last 10
    }))
    callbacks.onVibeCheck?.(vibeCheck)
  }, [callbacks.onVibeCheck])

  const handlePromotion = useCallback((promotion: PromotionUpdate) => {
    setUpdates(prev => ({
      ...prev,
      promotions: [promotion, ...prev.promotions.slice(0, 4)] // Keep last 5
    }))
    callbacks.onPromotion?.(promotion)
  }, [callbacks.onPromotion])

  useVenueSpecific(service, venueId, handleVenueUpdate)
  useVibeChecks(service, venueId, handleVibeCheck)
  usePromotions(service, venueId, handlePromotion)

  return updates
}

// Hook for managing connection state with automatic reconnection
export function useRealtimeConnection(wsUrl: string, apiBaseUrl: string, userId?: string) {
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    reconnectAttempts: 0,
    lastConnected: null as Date | null,
    error: null as string | null
  })

  const serviceRef = useRef<RealtimeServiceMobile | null>(null)

  useEffect(() => {
    const service = getRealtimeService(wsUrl, apiBaseUrl, userId)
    serviceRef.current = service

    const updateConnectionState = () => {
      const state = service.getConnectionState()
      setConnectionState(prev => ({
        ...prev,
        isConnected: state.isConnected,
        reconnectAttempts: state.reconnectAttempts,
        lastConnected: state.isConnected ? new Date() : prev.lastConnected
      }))
    }

    // Initial connection
    service.connect()
      .then(() => {
        setConnectionState(prev => ({ ...prev, error: null }))
      })
      .catch(err => {
        setConnectionState(prev => ({ ...prev, error: err.message }))
      })

    // Monitor connection state
    const interval = setInterval(updateConnectionState, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [wsUrl, apiBaseUrl, userId])

  const reconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.connect().catch(err => {
        setConnectionState(prev => ({ ...prev, error: err.message }))
      })
    }
  }, [])

  return {
    ...connectionState,
    service: serviceRef.current,
    reconnect
  }
}