import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics'

// Mock fetch
global.fetch = vi.fn()

const mockPlatformAnalytics = {
  total_users: 1000,
  total_venues: 50,
  total_vibe_checks: 2500,
  total_promotions: 75,
  new_users_week: 25,
  new_venues_week: 3,
  new_vibe_checks_week: 150,
  user_growth: [],
  venue_growth: [],
  engagement_metrics: []
}

const mockSystemHealth = {
  database: { status: 'healthy', response_time: 45, active_connections: 12 },
  api: { status: 'healthy', error_rate: 0.5, uptime: 99.9 },
  storage: { status: 'warning', usage_percent: 85, total_size: '2.5 GB' }
}

const mockRealTimeMetrics = {
  vibe_checks_last_hour: 15,
  views_last_hour: 250,
  new_users_last_hour: 3,
  timestamp: '2024-01-01T12:00:00Z'
}

describe('useAdminAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    
    // Mock successful API responses
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('type=platform')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockPlatformAnalytics })
        })
      }
      if (url.includes('type=system-health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockSystemHealth })
        })
      }
      if (url.includes('type=real-time')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockRealTimeMetrics })
        })
      }
      if (url.includes('export')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['test'], { type: 'text/csv' }))
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAdminAnalytics())

    expect(result.current.loading).toBe(true)
    expect(result.current.analytics).toBe(null)
    expect(result.current.systemHealth).toBe(null)
    expect(result.current.realTimeMetrics).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('should fetch all data on mount', async () => {
    const { result } = renderHook(() => useAdminAnalytics())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.analytics).toEqual(mockPlatformAnalytics)
    expect(result.current.systemHealth).toEqual(mockSystemHealth)
    expect(result.current.realTimeMetrics).toEqual(mockRealTimeMetrics)
    expect(result.current.error).toBe(null)

    expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=platform')
    expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=system-health')
    expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=real-time')
  })

  it('should handle analytics fetch error', async () => {
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('type=platform')) {
        return Promise.resolve({
          ok: false,
          status: 500
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: {} })
      })
    })

    const { result } = renderHook(() => useAdminAnalytics())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load platform analytics')
    expect(result.current.analytics).toBe(null)
  })

  it('should handle system health fetch error gracefully', async () => {
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('type=system-health')) {
        return Promise.resolve({
          ok: false,
          status: 500
        })
      }
      if (url.includes('type=platform')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockPlatformAnalytics })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: {} })
      })
    })

    const { result } = renderHook(() => useAdminAnalytics())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should not set error for system health failures
    expect(result.current.error).toBe(null)
    expect(result.current.analytics).toEqual(mockPlatformAnalytics)
    expect(result.current.systemHealth).toBe(null)
  })

  it('should refresh all data when refreshAll is called', async () => {
    const { result } = renderHook(() => useAdminAnalytics())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    vi.clearAllMocks()

    await act(async () => {
      await result.current.refreshAll()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=platform')
    expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=system-health')
    expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=real-time')
  })

  it('should export analytics successfully', async () => {
    // Mock DOM methods
    const mockClick = vi.fn()
    const mockAppendChild = vi.fn()
    const mockRemoveChild = vi.fn()
    
    document.createElement = vi.fn(() => ({
      href: '',
      download: '',
      click: mockClick,
    })) as any
    
    document.body.appendChild = mockAppendChild
    document.body.removeChild = mockRemoveChild

    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = vi.fn()

    const { result } = renderHook(() => useAdminAnalytics())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const success = await result.current.exportAnalytics('csv')
      expect(success).toBe(true)
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/analytics/export?type=platform&format=csv')
    expect(mockClick).toHaveBeenCalled()
  })

  it('should handle export errors', async () => {
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('export')) {
        return Promise.resolve({
          ok: false,
          status: 500
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: {} })
      })
    })

    const { result } = renderHook(() => useAdminAnalytics())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await expect(
      act(async () => {
        await result.current.exportAnalytics('csv')
      })
    ).rejects.toThrow('Failed to export analytics')
  })

  it('should set up periodic updates', async () => {
    const { result } = renderHook(() => useAdminAnalytics())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    vi.clearAllMocks()

    // Fast-forward 30 seconds (real-time metrics interval)
    act(() => {
      vi.advanceTimersByTime(30000)
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=real-time')
    })

    vi.clearAllMocks()

    // Fast-forward 2 minutes (system health interval)
    act(() => {
      vi.advanceTimersByTime(120000)
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=system-health')
    })

    vi.clearAllMocks()

    // Fast-forward 5 minutes (analytics interval)
    act(() => {
      vi.advanceTimersByTime(300000)
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=platform')
    })
  })

  it('should clean up intervals on unmount', async () => {
    const { result, unmount } = renderHook(() => useAdminAnalytics())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalledTimes(3) // Three intervals should be cleared
  })

  it('should handle individual fetch methods', async () => {
    const { result } = renderHook(() => useAdminAnalytics())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    vi.clearAllMocks()

    // Test individual fetch methods
    await act(async () => {
      await result.current.fetchAnalytics()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=platform')

    vi.clearAllMocks()

    await act(async () => {
      await result.current.fetchSystemHealth()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=system-health')

    vi.clearAllMocks()

    await act(async () => {
      await result.current.fetchRealTimeMetrics()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=real-time')
  })
})