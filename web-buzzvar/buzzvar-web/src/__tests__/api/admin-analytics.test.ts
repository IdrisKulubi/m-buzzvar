import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/analytics/route'
import { GET as ExportGET } from '@/app/api/analytics/export/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase'
import { AdminService } from '@/services/adminService'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn()
}))

vi.mock('@/services/adminService', () => ({
  AdminService: {
    getPlatformAnalytics: vi.fn(),
    getSystemHealthMetrics: vi.fn(),
    getRealTimeMetrics: vi.fn(),
    exportPlatformAnalytics: vi.fn()
  }
}))

const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn()
      })
    })
  })
}

describe('Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as any).mockReturnValue(mockSupabase)
    
    // Mock environment variable
    process.env.ADMIN_EMAILS = 'admin@test.com,admin2@test.com'
  })

  describe('GET /api/analytics', () => {
    it('should return platform analytics for admin users', async () => {
      const mockUser = { id: '1', email: 'admin@test.com' }
      const mockAnalytics = {
        total_users: 1000,
        total_venues: 50,
        total_vibe_checks: 2500,
        user_growth: [],
        venue_growth: [],
        engagement_metrics: []
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      ;(AdminService.getPlatformAnalytics as any).mockResolvedValue(mockAnalytics)

      const request = new NextRequest('http://localhost:3000/api/analytics?type=platform')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockAnalytics)
      expect(AdminService.getPlatformAnalytics).toHaveBeenCalled()
    })

    it('should return 403 for non-admin users requesting platform analytics', async () => {
      const mockUser = { id: '1', email: 'user@test.com' }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics?type=platform')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      })

      const request = new NextRequest('http://localhost:3000/api/analytics?type=platform')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return system health metrics for admin users', async () => {
      const mockUser = { id: '1', email: 'admin@test.com' }
      const mockHealth = {
        database: { status: 'healthy', response_time: 50, active_connections: 10 },
        api: { status: 'healthy', error_rate: 0.1, uptime: 99.9 },
        storage: { status: 'healthy', usage_percent: 45, total_size: '2.5 GB' }
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      ;(AdminService.getSystemHealthMetrics as any).mockResolvedValue(mockHealth)

      const request = new NextRequest('http://localhost:3000/api/analytics?type=system-health')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockHealth)
      expect(AdminService.getSystemHealthMetrics).toHaveBeenCalled()
    })

    it('should return real-time metrics for admin users', async () => {
      const mockUser = { id: '1', email: 'admin@test.com' }
      const mockMetrics = {
        vibe_checks_last_hour: 15,
        views_last_hour: 250,
        new_users_last_hour: 3,
        timestamp: '2024-01-01T12:00:00Z'
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      ;(AdminService.getRealTimeMetrics as any).mockResolvedValue(mockMetrics)

      const request = new NextRequest('http://localhost:3000/api/analytics?type=real-time')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockMetrics)
      expect(AdminService.getRealTimeMetrics).toHaveBeenCalled()
    })

    it('should handle venue analytics for venue owners', async () => {
      const mockUser = { id: '1', email: 'owner@test.com' }
      const venueId = 'venue-123'

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock venue ownership check
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: { id: 'ownership-1' },
        error: null
      })

      const request = new NextRequest(`http://localhost:3000/api/analytics?type=venue&venueId=${venueId}`)
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should return 400 for invalid analytics type', async () => {
      const mockUser = { id: '1', email: 'admin@test.com' }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics?type=invalid')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid analytics type')
    })

    it('should handle service errors gracefully', async () => {
      const mockUser = { id: '1', email: 'admin@test.com' }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      ;(AdminService.getPlatformAnalytics as any).mockRejectedValue(new Error('Service error'))

      const request = new NextRequest('http://localhost:3000/api/analytics?type=platform')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('GET /api/analytics/export', () => {
    it('should export platform analytics as CSV for admin users', async () => {
      const mockUser = { id: '1', email: 'admin@test.com' }
      const mockBlob = new Blob(['csv,data'], { type: 'text/csv' })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      ;(AdminService.exportPlatformAnalytics as any).mockResolvedValue(mockBlob)

      const request = new NextRequest('http://localhost:3000/api/analytics/export?type=platform&format=csv')
      const response = await ExportGET(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
      expect(AdminService.exportPlatformAnalytics).toHaveBeenCalledWith('csv')
    })

    it('should export platform analytics as JSON for admin users', async () => {
      const mockUser = { id: '1', email: 'admin@test.com' }
      const mockBlob = new Blob(['{"data": "json"}'], { type: 'application/json' })

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      ;(AdminService.exportPlatformAnalytics as any).mockResolvedValue(mockBlob)

      const request = new NextRequest('http://localhost:3000/api/analytics/export?type=platform&format=json')
      const response = await ExportGET(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(AdminService.exportPlatformAnalytics).toHaveBeenCalledWith('json')
    })

    it('should return 403 for non-admin users', async () => {
      const mockUser = { id: '1', email: 'user@test.com' }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/export?type=platform&format=csv')
      const response = await ExportGET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin access required')
    })

    it('should return 400 for invalid export type', async () => {
      const mockUser = { id: '1', email: 'admin@test.com' }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/analytics/export?type=invalid&format=csv')
      const response = await ExportGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid export type')
    })

    it('should handle export errors gracefully', async () => {
      const mockUser = { id: '1', email: 'admin@test.com' }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      ;(AdminService.exportPlatformAnalytics as any).mockRejectedValue(new Error('Export failed'))

      const request = new NextRequest('http://localhost:3000/api/analytics/export?type=platform&format=csv')
      const response = await ExportGET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})