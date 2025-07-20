import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdminService } from '@/services/adminService'
import { createClient } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn()
}))

describe('AdminService', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a fresh mock for each test
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn()
      }
    }
    
    ;(createClient as any).mockReturnValue(mockSupabase)
  })

  describe('getPlatformAnalytics', () => {
    it('should fetch platform analytics successfully', async () => {
      const mockBasicAnalytics = {
        total_users: 1000,
        total_venues: 50,
        total_vibe_checks: 2500,
        total_promotions: 75,
        new_users_week: 25,
        new_venues_week: 3,
        new_vibe_checks_week: 150
      }

      const mockUserGrowthData = [
        { created_at: '2024-01-01T00:00:00Z' },
        { created_at: '2024-01-02T00:00:00Z' },
        { created_at: '2024-01-02T12:00:00Z' }
      ]

      const mockVenueGrowthData = [
        { created_at: '2024-01-01T00:00:00Z' },
        { created_at: '2024-01-03T00:00:00Z' }
      ]

      // Mock the query chains
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'platform_analytics') {
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockBasicAnalytics,
                error: null
              })
            })
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockUserGrowthData,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'venues') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockVenueGrowthData,
                  error: null
                })
              })
            })
          }
        }
        // For engagement metrics queries
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [{ id: '1' }, { id: '2' }],
              error: null
            })
          })
        }
      })

      const result = await AdminService.getPlatformAnalytics()

      expect(result).toEqual(
        expect.objectContaining({
          total_users: 1000,
          total_venues: 50,
          total_vibe_checks: 2500,
          total_promotions: 75,
          new_users_week: 25,
          new_venues_week: 3,
          new_vibe_checks_week: 150,
          user_growth: expect.any(Array),
          venue_growth: expect.any(Array),
          engagement_metrics: expect.any(Array)
        })
      )

      expect(mockSupabase.from).toHaveBeenCalledWith('platform_analytics')
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSupabase.from).toHaveBeenCalledWith('venues')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      })

      await expect(AdminService.getPlatformAnalytics()).rejects.toThrow('Failed to fetch platform analytics')
    })

    it('should process growth data correctly', async () => {
      const mockBasicAnalytics = {
        total_users: 100,
        total_venues: 10,
        total_vibe_checks: 500,
        total_promotions: 20,
        new_users_week: 5,
        new_venues_week: 1,
        new_vibe_checks_week: 30
      }

      const mockUserGrowthData = [
        { created_at: '2024-01-01T10:00:00Z' },
        { created_at: '2024-01-01T14:00:00Z' }, // Same day
        { created_at: '2024-01-02T09:00:00Z' }
      ]

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'platform_analytics') {
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockBasicAnalytics,
                error: null
              })
            })
          }
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockUserGrowthData,
                  error: null
                })
              })
            })
          }
        }
        // For other tables and engagement metrics
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      const result = await AdminService.getPlatformAnalytics()

      expect(result.user_growth).toEqual([
        { date: '2024-01-01', count: 2 },
        { date: '2024-01-02', count: 1 }
      ])
    })
  })

  describe('getSystemHealthMetrics', () => {
    it('should return system health metrics', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ id: '1' }],
            error: null
          })
        })
      })

      const result = await AdminService.getSystemHealthMetrics()

      expect(result).toEqual(
        expect.objectContaining({
          database: expect.objectContaining({
            status: expect.any(String),
            response_time: expect.any(Number),
            active_connections: expect.any(Number)
          }),
          api: expect.objectContaining({
            status: expect.any(String),
            error_rate: expect.any(Number),
            uptime: expect.any(Number)
          }),
          storage: expect.objectContaining({
            status: expect.any(String),
            usage_percent: expect.any(Number),
            total_size: expect.any(String)
          })
        })
      )
    })

    it('should handle database health check failures', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Connection failed' }
          })
        })
      })

      const result = await AdminService.getSystemHealthMetrics()

      // The method logs the error but still returns a status based on response time
      expect(result.database.status).toMatch(/healthy|slow/)
      expect(result.database.response_time).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getRealTimeMetrics', () => {
    it('should fetch real-time metrics successfully', async () => {
      const mockVibeChecks = [{ id: '1' }, { id: '2' }]
      const mockViews = [{ id: '1' }, { id: '2' }, { id: '3' }]
      const mockUsers = [{ id: '1' }]

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) { // vibe_checks
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({
                data: mockVibeChecks,
                error: null
              })
            })
          }
        }
        if (callCount === 2) { // club_views
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({
                data: mockViews,
                error: null
              })
            })
          }
        }
        if (callCount === 3) { // users
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({
                data: mockUsers,
                error: null
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        }
      })

      const result = await AdminService.getRealTimeMetrics()

      expect(result).toEqual({
        vibe_checks_last_hour: 2,
        views_last_hour: 3,
        new_users_last_hour: 1,
        timestamp: expect.any(String)
      })
    })

    it('should handle errors in real-time metrics', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Query failed' }
          })
        })
      })

      const result = await AdminService.getRealTimeMetrics()

      expect(result).toEqual({
        vibe_checks_last_hour: 0,
        views_last_hour: 0,
        new_users_last_hour: 0,
        timestamp: expect.any(String)
      })
    })
  })

  describe('exportPlatformAnalytics', () => {
    it('should export analytics as JSON', async () => {
      const mockAnalytics = {
        total_users: 100,
        total_venues: 10,
        user_growth: [],
        venue_growth: [],
        engagement_metrics: []
      }

      // Mock the getPlatformAnalytics method
      vi.spyOn(AdminService, 'getPlatformAnalytics').mockResolvedValue(mockAnalytics as any)

      const result = await AdminService.exportPlatformAnalytics('json')

      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('application/json')
    })

    it('should export analytics as CSV', async () => {
      const mockAnalytics = {
        total_users: 100,
        total_venues: 10,
        total_vibe_checks: 500,
        total_promotions: 20,
        new_users_week: 5,
        new_venues_week: 1,
        new_vibe_checks_week: 30,
        user_growth: [{ date: '2024-01-01', count: 2 }],
        venue_growth: [{ date: '2024-01-01', count: 1 }],
        engagement_metrics: [{ metric: 'Views', value: 100, change: 10 }]
      }

      vi.spyOn(AdminService, 'getPlatformAnalytics').mockResolvedValue(mockAnalytics as any)

      const result = await AdminService.exportPlatformAnalytics('csv')

      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('text/csv')
    })
  })
})