'use client'

import { useState, useEffect, useCallback } from 'react'
import { AnalyticsService } from '@/services/analyticsService'
import { VenueAnalytics, PlatformAnalytics } from '@/lib/types'
import { createClient } from '@/lib/supabase'

export function useVenueAnalytics(venueId?: string, period: string = '7d') {
  const [analytics, setAnalytics] = useState<VenueAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    if (!venueId) return

    setLoading(true)
    setError(null)

    try {
      const data = await AnalyticsService.getVenueAnalytics(venueId, period)
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

  // Set up real-time subscriptions for live updates
  useEffect(() => {
    if (!venueId) return

    const supabase = createClient()

    // Subscribe to vibe check changes
    const vibeCheckSubscription = supabase
      .channel(`vibe-checks-${venueId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vibe_checks',
        filter: `venue_id=eq.${venueId}`
      }, () => {
        // Refresh analytics when new vibe checks are added
        fetchAnalytics()
      })
      .subscribe()

    // Subscribe to view changes
    const viewSubscription = supabase
      .channel(`views-${venueId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'club_views',
        filter: `club_id=eq.${venueId}`
      }, () => {
        // Refresh analytics when new views are recorded
        fetchAnalytics()
      })
      .subscribe()

    // Subscribe to bookmark changes
    const bookmarkSubscription = supabase
      .channel(`bookmarks-${venueId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_bookmarks',
        filter: `venue_id=eq.${venueId}`
      }, () => {
        // Refresh analytics when bookmarks change
        fetchAnalytics()
      })
      .subscribe()

    return () => {
      vibeCheckSubscription.unsubscribe()
      viewSubscription.unsubscribe()
      bookmarkSubscription.unsubscribe()
    }
  }, [venueId, fetchAnalytics])

  const exportAnalytics = useCallback(async (format: 'csv' | 'json') => {
    if (!venueId) return

    try {
      const blob = await AnalyticsService.exportVenueAnalytics(venueId, format)
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
      const data = await AnalyticsService.getPlatformAnalytics()
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

  // Set up real-time subscriptions for platform-wide updates
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to new users
    const userSubscription = supabase
      .channel('platform-users')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'users'
      }, () => {
        fetchAnalytics()
      })
      .subscribe()

    // Subscribe to new venues
    const venueSubscription = supabase
      .channel('platform-venues')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'venues'
      }, () => {
        fetchAnalytics()
      })
      .subscribe()

    // Subscribe to new vibe checks
    const vibeCheckSubscription = supabase
      .channel('platform-vibe-checks')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'vibe_checks'
      }, () => {
        fetchAnalytics()
      })
      .subscribe()

    return () => {
      userSubscription.unsubscribe()
      venueSubscription.unsubscribe()
      vibeCheckSubscription.unsubscribe()
    }
  }, [fetchAnalytics])

  return { 
    analytics, 
    loading, 
    error, 
    refetch: fetchAnalytics
  }
}