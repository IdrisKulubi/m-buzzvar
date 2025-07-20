'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClientAnalyticsService } from '@/services/client/analyticsService'
import { VenueAnalytics, PlatformAnalytics } from '@/lib/types'

export function useVenueAnalytics(venueId?: string, period: string = '7d') {
  const [analytics, setAnalytics] = useState<VenueAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    if (!venueId) return

    setLoading(true)
    setError(null)

    try {
      const data = await ClientAnalyticsService.getVenueAnalytics(venueId, period)
      setAnalytics(data)
    } catch (err) {
      console.error('Error fetching venue analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }, [venueId, period])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Set up real-time subscriptions for live updates using WebSocket
  useEffect(() => {
    if (!venueId) return

    // TODO: Implement WebSocket-based real-time updates
    // This will be handled by the WebSocket server for real-time analytics updates
    const interval = setInterval(() => {
      fetchAnalytics()
    }, 30000) // Refresh every 30 seconds as fallback

    return () => {
      clearInterval(interval)
    }
  }, [venueId, fetchAnalytics])

  const exportAnalytics = useCallback(async (format: 'csv' | 'json') => {
    if (!venueId) return

    try {
      const blob = await ClientAnalyticsService.exportVenueAnalytics(venueId, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `venue-analytics-${venueId}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to export analytics')
    }
  }, [venueId])

  return { 
    analytics, 
    loading, 
    error, 
    refetch: fetchAnalytics,
    exportAnalytics
  }
}

export function usePlatformAnalytics() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await ClientAnalyticsService.getPlatformAnalytics()
      setAnalytics(data)
    } catch (err) {
      console.error('Error fetching platform analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch platform analytics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Set up real-time subscriptions for platform-wide updates using WebSocket
  useEffect(() => {
    // TODO: Implement WebSocket-based real-time updates
    // This will be handled by the WebSocket server for real-time platform analytics
    const interval = setInterval(() => {
      fetchAnalytics()
    }, 60000) // Refresh every minute as fallback

    return () => {
      clearInterval(interval)
    }
  }, [fetchAnalytics])

  return { 
    analytics, 
    loading, 
    error, 
    refetch: fetchAnalytics
  }
}