import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useVenueAnalytics, usePlatformAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsService } from '@/services/analyticsService'
import { createClient } from '@/lib/supabase'

// Mock dependencies
vi.mock('@/services/analyticsService')
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn()
}))

const mockSubscription = {
  unsubscribe: vi.fn()
}

const mockSupabase = {
  channel: vi.fn(() => ({
    on: vi.fn(() => ({
      subscribe: vi.fn(() => mockSubscription)
    }))
  }))
}

describe('useVenueAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockReturnValue(mockSupabase)
  })

  it('should fetch venue analytics on mount', async () => {
    const mockAnalytics = {
      venue_id: 'venue-1',
      venue_name: 'Test Venue',
      total_views: 100,
      total_bookmarks: 25,
      total_vibe_checks: 50,
      avg_busyness_rating: 3.5,
      recent_vibe_checks: 10,
      recent_views: 20,
      daily_stats: [],
      peak_hours: []
    }

    vi.spyOn(AnalyticsService, 'getVenueAnalytics').mockResolvedValue(mockAnalytics)

    const { result } = renderHook(() => useVenueAnalytics('venue-1', '7d'))

    expect(result.current.loading).toBe(true)
    expect(result.current.analytics).toBe(null)
    expect(result.current.error).toBe(null)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.analytics).toEqual(mockAnalytics)
    expect(result.current.error).toBe(null)
    expect(AnalyticsService.getVenueAnalytics).toHaveBeenCalledWith('venue-1', '7d')
  })

  it('should handle errors when fetching analytics', async () => {
    const errorMessage = 'Failed to fetch analytics'
    vi.spyOn(AnalyticsService, 'getVenueAnalytics').mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useVenueAnalytics('venue-1', '7d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.analytics).toBe(null)
    expect(result.current.error).toBe(errorMessage)
  })

  it('should not fetch analytics when venueId is not provided', () => {
    vi.spyOn(AnalyticsService, 'getVenueAnalytics')

    renderHook(() => useVenueAnalytics(undefined, '7d'))

    expect(AnalyticsService.getVenueAnalytics).not.toHaveBeenCalled()
  })

  it('should refetch analytics when period changes', async () => {
    const mockAnalytics = {
      venue_id: 'venue-1',
      venue_name: 'Test Venue',
      total_views: 100,
      total_bookmarks: 25,
      total_vibe_checks: 50,
      avg_busyness_rating: 3.5,
      recent_vibe_checks: 10,
      recent_views: 20,
      daily_stats: [],
      peak_hours: []
    }

    vi.spyOn(AnalyticsService, 'getVenueAnalytics').mockResolvedValue(mockAnalytics)

    const { result, rerender } = renderHook(
      ({ period }) => useVenueAnalytics('venue-1', period),
      { initialProps: { period: '7d' } }
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(AnalyticsService.getVenueAnalytics).toHaveBeenCalledWith('venue-1', '7d')

    // Change period
    rerender({ period: '30d' })

    await waitFor(() => {
      expect(AnalyticsService.getVenueAnalytics).toHaveBeenCalledWith('venue-1', '30d')
    })
  })

  it('should provide export functionality', async () => {
    const mockAnalytics = {
      venue_id: 'venue-1',
      venue_name: 'Test Venue',
      total_views: 100,
      total_bookmarks: 25,
      total_vibe_checks: 50,
      avg_busyness_rating: 3.5,
      recent_vibe_checks: 10,
      recent_views: 20,
      daily_stats: [],
      peak_hours: []
    }

    const mockBlob = new Blob(['test'], { type: 'text/csv' })

    vi.spyOn(AnalyticsService, 'getVenueAnalytics').mockResolvedValue(mockAnalytics)
    vi.spyOn(AnalyticsService, 'exportVenueAnalytics').mockResolvedValue(mockBlob)

    // Mock DOM methods
    const mockCreateElement = vi.fn(() => ({
      href: '',
      download: '',
      click: vi.fn()
    }))
    const mockCreateObjectURL = vi.fn(() => 'blob:url')
    const mockRevokeObjectURL = vi.fn()

    Object.defineProperty(document, 'createElement', { value: mockCreateElement })
    Object.defineProperty(document.body, 'appendChild', { value: vi.fn() })
    Object.defineProperty(document.body, 'removeChild', { value: vi.fn() })
    Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL })

    const { result } = renderHook(() => useVenueAnalytics('venue-1', '7d'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.exportAnalytics('csv')

    expect(AnalyticsService.exportVenueAnalytics).toHaveBeenCalledWith('venue-1', 'csv')
  })
})

describe('usePlatformAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockReturnValue(mockSupabase)
  })

  it('should fetch platform analytics on mount', async () => {
    const mockAnalytics = {
      total_users: 1000,
      total_venues: 50,
      total_vibe_checks: 500,
      total_promotions: 100,
      new_users_week: 25,
      new_venues_week: 5,
      new_vibe_checks_week: 75,
      user_growth: [],
      venue_growth: [],
      engagement_metrics: []
    }

    vi.spyOn(AnalyticsService, 'getPlatformAnalytics').mockResolvedValue(mockAnalytics)

    const { result } = renderHook(() => usePlatformAnalytics())

    expect(result.current.loading).toBe(true)
    expect(result.current.analytics).toBe(null)
    expect(result.current.error).toBe(null)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.analytics).toEqual(mockAnalytics)
    expect(result.current.error).toBe(null)
    expect(AnalyticsService.getPlatformAnalytics).toHaveBeenCalled()
  })

  it('should handle errors when fetching platform analytics', async () => {
    const errorMessage = 'Failed to fetch platform analytics'
    vi.spyOn(AnalyticsService, 'getPlatformAnalytics').mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => usePlatformAnalytics())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.analytics).toBe(null)
    expect(result.current.error).toBe(errorMessage)
  })

  it('should provide refetch functionality', async () => {
    const mockAnalytics = {
      total_users: 1000,
      total_venues: 50,
      total_vibe_checks: 500,
      total_promotions: 100,
      new_users_week: 25,
      new_venues_week: 5,
      new_vibe_checks_week: 75,
      user_growth: [],
      venue_growth: [],
      engagement_metrics: []
    }

    vi.spyOn(AnalyticsService, 'getPlatformAnalytics').mockResolvedValue(mockAnalytics)

    const { result } = renderHook(() => usePlatformAnalytics())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(AnalyticsService.getPlatformAnalytics).toHaveBeenCalledTimes(1)

    // Call refetch
    result.current.refetch()

    await waitFor(() => {
      expect(AnalyticsService.getPlatformAnalytics).toHaveBeenCalledTimes(2)
    })
  })
})