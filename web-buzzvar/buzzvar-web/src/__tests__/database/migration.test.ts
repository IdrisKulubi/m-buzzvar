import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { promotionService, venueService, analyticsService, adminService } from '@/lib/database/services'
import { checkDatabaseHealth } from '@/lib/database/neon-client'

describe('Database Migration Tests', () => {
  beforeAll(async () => {
    // Ensure database is healthy before running tests
    const health = await checkDatabaseHealth()
    if (health.status !== 'healthy') {
      throw new Error(`Database is not healthy: ${health.error}`)
    }
  })

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      const health = await checkDatabaseHealth()
      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBeDefined()
      expect(health.dbTimestamp).toBeDefined()
    })

    it('should have connection pool stats', async () => {
      const health = await checkDatabaseHealth()
      expect(health.connectionCount).toBeGreaterThanOrEqual(0)
      expect(health.idleCount).toBeGreaterThanOrEqual(0)
      expect(health.waitingCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Promotion Service', () => {
    it('should handle empty venue promotions', async () => {
      const promotions = await promotionService.getVenuePromotions('non-existent-venue')
      expect(Array.isArray(promotions)).toBe(true)
      expect(promotions.length).toBe(0)
    })

    it('should get promotion templates', () => {
      const templates = promotionService.getPromotionTemplates()
      expect(Array.isArray(templates)).toBe(true)
      expect(templates.length).toBeGreaterThan(0)
      expect(templates[0]).toHaveProperty('id')
      expect(templates[0]).toHaveProperty('name')
      expect(templates[0]).toHaveProperty('defaultData')
    })
  })

  describe('Venue Service', () => {
    it('should handle empty venue list', async () => {
      const venues = await venueService.getVenues({}, 10, 0)
      expect(Array.isArray(venues)).toBe(true)
    })

    it('should get venue types', async () => {
      const types = await venueService.getVenueTypes()
      expect(Array.isArray(types)).toBe(true)
    })

    it('should get venue cities', async () => {
      const cities = await venueService.getVenueCities()
      expect(Array.isArray(cities)).toBe(true)
    })
  })

  describe('Analytics Service', () => {
    it('should get platform analytics', async () => {
      const analytics = await analyticsService.getPlatformAnalytics('7d')
      expect(analytics).toHaveProperty('totalUsers')
      expect(analytics).toHaveProperty('totalVenues')
      expect(analytics).toHaveProperty('totalVibeChecks')
      expect(analytics).toHaveProperty('totalReviews')
      expect(analytics).toHaveProperty('topVenues')
      expect(analytics).toHaveProperty('growthData')
    })

    it('should get venue analytics for non-existent venue', async () => {
      const analytics = await analyticsService.getVenueAnalytics('non-existent-venue', '7d')
      expect(analytics).toHaveProperty('venueId', 'non-existent-venue')
      expect(analytics).toHaveProperty('totalViews', 0)
      expect(analytics).toHaveProperty('dailyStats')
      expect(Array.isArray(analytics.dailyStats)).toBe(true)
    })
  })

  describe('Admin Service', () => {
    it('should get system stats', async () => {
      const stats = await adminService.getSystemStats()
      expect(stats).toHaveProperty('totalUsers')
      expect(stats).toHaveProperty('activeUsers')
      expect(stats).toHaveProperty('totalVenues')
      expect(stats).toHaveProperty('activeVenues')
      expect(stats).toHaveProperty('verifiedVenues')
      expect(stats).toHaveProperty('pendingReports')
      expect(typeof stats.totalUsers).toBe('number')
      expect(typeof stats.activeUsers).toBe('number')
    })

    it('should get growth data', async () => {
      const growthData = await adminService.getGrowthData(7)
      expect(Array.isArray(growthData)).toBe(true)
    })

    it('should get engagement data', async () => {
      const engagementData = await adminService.getEngagementData(7)
      expect(Array.isArray(engagementData)).toBe(true)
    })
  })

  describe('Service Health Checks', () => {
    it('should have healthy promotion service', async () => {
      const health = await promotionService.healthCheck()
      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBeDefined()
    })

    it('should have healthy venue service', async () => {
      const health = await venueService.healthCheck()
      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBeDefined()
    })

    it('should have healthy analytics service', async () => {
      const health = await analyticsService.healthCheck()
      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBeDefined()
    })

    it('should have healthy admin service', async () => {
      const health = await adminService.healthCheck()
      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test with invalid venue ID format
      await expect(venueService.getVenueById('invalid-uuid-format')).rejects.toThrow()
    })

    it('should handle connection pool stats', async () => {
      const stats = await promotionService.getConnectionPoolStats()
      expect(stats).toHaveProperty('totalCount')
      expect(stats).toHaveProperty('idleCount')
      expect(stats).toHaveProperty('waitingCount')
      expect(stats).toHaveProperty('timestamp')
    })
  })
})