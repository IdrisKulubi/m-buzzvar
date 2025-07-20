import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnalyticsService } from '@/services/analyticsService'
import { createClient } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn()
}))

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn()
            }))
          }))
        }))
      })),
      gte: vi.fn(() => ({
        order: vi.fn(),
        lt: vi.fn(() => ({
          order: vi.fn()
        }))
      }))
    }))
  }))
}

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockReturnValue(mockSupabase)
  })

  describe('getVenueAnalytics', () => {
    it('should fetch venue analytics successfully', async () => {
      const mockBasicAnalytics = {
        venue_id: 'venue-1',
        venue_name: 'Test Venue',
        total_views: 100,
        total_bookmarks: 25,
        total_vibe_checks: 50,
        avg_busyness_rating: 3.5,
        recent_vibe_checks: 10,
        recent_views: 20
      }

      const mockVibeChecks = [
        { created_at: '2024-01-01T12:00:00Z', busyness_rating: 4 },
        { created_at: '2024-01-02T14:00:00Z', busyness_rating: 3 }
      ]

      const mockViews = [
        { created_at: '2024-01-01T10:00:00Z' },
        { created_at: '2024-01-02T16:00:00Z' }
      ]

      // Mock the chain of calls for basic analytics
      const mockSingle = vi.fn().mockResolvedValue({ data: mockBasicAnalytics, error: null })
      const mockOrder = vi.fn().mockResolvedValue({ data: mockVibeChecks, error: null })
      const mockOrder2 = vi.fn().mockResolvedValue({ data: mockViews, error: null })

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'venue_analytics') {
          return {
            select: () => ({
              eq: () => ({
                single: mockSingle
              })
            })
          }
        } else if (table === 'vibe_checks') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  lte: () => ({
                    order: mockOrder
                  })
                })
              })
            })
          }
        } else if (table === 'club_views') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  lte: () => ({
                    order: mockOrder2
                  })
                })
              })
            })
          }
        }
      })

      const result = await AnalyticsService.getVenueAnalytics('venue-1', '7d')

      expect(result).toEqual(expect.objectContaining({
        venue_id: 'venue-1',
        venue_name: 'Test Venue',
        total_views: 100,
        total_bookmarks: 25,
        total_vibe_checks: 50,
        avg_busyness_rating: 3.5,
        recent_vibe_checks: 10,
        recent_views: 20,
        daily_stats: expect.any(Array),
        peak_hours: expect.any(Array)
      }))
    })

    it('should handle errors when fetching basic analytics', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      })

      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: mockSingle
          })
        })
      })

      await expect(AnalyticsService.getVenueAnalytics('venue-1', '7d'))
        .rejects.toThrow('Failed to fetch venue analytics')
    })

    it('should process different time periods correctly', async () => {
      const mockBasicAnalytics = {
        venue_id: 'venue-1',
        venue_name: 'Test Venue',
        total_views: 100,
        total_bookmarks: 25,
        total_vibe_checks: 50,
        avg_busyness_rating: 3.5,
        recent_vibe_checks: 10,
        recent_views: 20
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: mockBasicAnalytics, error: null })
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'venue_analytics') {
          return {
            select: () => ({
              eq: () => ({
                single: mockSingle
              })
            })
          }
        }
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                lte: () => ({
                  order: mockOrder
                })
              })
            })
          })
        }
      })

      // Test different periods
      const periods = ['1d', '7d', '30d', '90d']
      
      for (const period of periods) {
        const result = await AnalyticsService.getVenueAnalytics('venue-1', period)
        expect(result).toBeDefined()
        expect(result.venue_id).toBe('venue-1')
      }
    })
  })

  describe('getPlatformAnalytics', () => {
    it('should fetch platform analytics successfully', async () => {
      const mockPlatformAnalytics = {
        total_users: 1000,
        total_venues: 50,
        total_vibe_checks: 500,
        total_promotions: 100,
        new_users_week: 25,
        new_venues_week: 5,
        new_vibe_checks_week: 75
      }

      const mockUserGrowth = [
        { created_at: '2024-01-01T10:00:00Z' },
        { created_at: '2024-01-02T10:00:00Z' }
      ]

      const mockVenueGrowth = [
        { created_at: '2024-01-01T10:00:00Z' }
      ]

      const mockSingle = vi.fn().mockResolvedValue({ data: mockPlatformAnalytics, error: null })
      const mockOrder = vi.fn()
        .mockResolvedValueOnce({ data: mockUserGrowth, error: null })
        .mockResolvedValueOnce({ data: mockVenueGrowth, error: null })

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'platform_analytics') {
          return {
            select: () => ({
              single: mockSingle
            })
          }
        }
        return {
          select: () => ({
            gte: () => ({
              order: mockOrder,
              lt: () => ({
                order: mockOrder
              })
            })
          })
        }
      })

      const result = await AnalyticsService.getPlatformAnalytics()

      expect(result).toEqual(expect.objectContaining({
        total_users: 1000,
        total_venues: 50,
        total_vibe_checks: 500,
        total_promotions: 100,
        new_users_week: 25,
        new_venues_week: 5,
        new_vibe_checks_week: 75,
        user_growth: expect.any(Array),
        venue_growth: expect.any(Array),
        engagement_metrics: expect.any(Array)
      }))
    })

    it('should handle errors when fetching platform analytics', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database error' } 
      })

      mockSupabase.from.mockReturnValue({
        select: () => ({
          single: mockSingle
        })
      })

      await expect(AnalyticsService.getPlatformAnalytics())
        .rejects.toThrow('Failed to fetch platform analytics')
    })
  })

  describe('exportVenueAnalytics', () => {
    it('should export analytics as JSON', async () => {
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

      // Mock the getVenueAnalytics method
      vi.spyOn(AnalyticsService, 'getVenueAnalytics').mockResolvedValue(mockAnalytics)

      const result = await AnalyticsService.exportVenueAnalytics('venue-1', 'json')

      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('application/json')
    })

    it('should export analytics as CSV', async () => {
      const mockAnalytics = {
        venue_id: 'venue-1',
        venue_name: 'Test Venue',
        total_views: 100,
        total_bookmarks: 25,
        total_vibe_checks: 50,
        avg_busyness_rating: 3.5,
        recent_vibe_checks: 10,
        recent_views: 20,
        daily_stats: [
          { date: '2024-01-01', views: 10, vibe_checks: 5, avg_busyness: 3.5 }
        ],
        peak_hours: []
      }

      // Mock the getVenueAnalytics method
      vi.spyOn(AnalyticsService, 'getVenueAnalytics').mockResolvedValue(mockAnalytics)

      const result = await AnalyticsService.exportVenueAnalytics('venue-1', 'csv')

      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('text/csv')
    })
  })
})