import { adminService, analyticsService, type UserFilters, type UserManagement, type GrowthData, type EngagementData, type PlatformAnalytics } from '@/lib/database/services'
import type { User, Venue } from '@/lib/database/schema'

export class AdminService {
  static async getPlatformAnalytics(period: string = '30d'): Promise<PlatformAnalytics> {
    return await analyticsService.getPlatformAnalytics(period)
  }

  static async getUsers(filters?: UserFilters, limit: number = 50, offset: number = 0): Promise<UserManagement[]> {
    return await adminService.getUsers(filters, limit, offset)
  }

  static async getUserById(userId: string): Promise<UserManagement | null> {
    return await adminService.getUserById(userId)
  }

  static async updateUser(userId: string, updates: {
    name?: string
    university?: string
    is_active?: boolean
  }): Promise<User> {
    return await adminService.updateUser(userId, updates)
  }

  static async deleteUser(userId: string): Promise<void> {
    return await adminService.deleteUser(userId)
  }

  static async getVenues(filters?: any, limit: number = 50, offset: number = 0): Promise<Venue[]> {
    return await adminService.getVenues(filters, limit, offset)
  }

  static async updateVenue(venueId: string, updates: {
    is_verified?: boolean
    is_active?: boolean
  }): Promise<Venue> {
    return await adminService.updateVenue(venueId, updates)
  }

  static async getGrowthData(days: number = 30): Promise<GrowthData[]> {
    return await adminService.getGrowthData(days)
  }

  static async getEngagementData(days: number = 30): Promise<EngagementData[]> {
    return await adminService.getEngagementData(days)
  }

  static async getSystemStats(): Promise<{
    totalUsers: number
    activeUsers: number
    totalVenues: number
    activeVenues: number
    verifiedVenues: number
    pendingReports: number
  }> {
    return await adminService.getSystemStats()
  }

  static async getSystemHealthMetrics() {
    try {
      // Test database connectivity
      const startTime = Date.now()
      const healthCheck = await adminService.healthCheck()
      const queryTime = Date.now() - startTime

      // Get recent error rates (simulated - in real app would come from logs)
      const errorRate = Math.random() * 2 // 0-2% error rate simulation

      // Storage usage (simulated)
      const storageUsed = Math.floor(Math.random() * 80) + 10 // 10-90% usage

      return {
        database: {
          status: healthCheck.status === 'healthy' ? 'healthy' : 'unhealthy',
          response_time: queryTime,
          active_connections: healthCheck.connectionPool?.totalCount || 0
        },
        api: {
          status: errorRate < 1 ? 'healthy' : 'degraded',
          error_rate: errorRate,
          uptime: 99.9 // Simulated uptime percentage
        },
        storage: {
          status: storageUsed < 85 ? 'healthy' : 'warning',
          usage_percent: storageUsed,
          total_size: '2.5 GB' // Simulated
        }
      }
    } catch (error) {
      console.error('Error getting system health metrics:', error)
      return {
        database: { status: 'error', response_time: 0, active_connections: 0 },
        api: { status: 'error', error_rate: 100, uptime: 0 },
        storage: { status: 'error', usage_percent: 0, total_size: '0 GB' }
      }
    }
  }

  static async exportPlatformAnalytics(format: 'csv' | 'json'): Promise<Blob> {
    const analytics = await this.getPlatformAnalytics()
    
    if (format === 'json') {
      return new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' })
    }
    
    // Convert to CSV format
    const csvData = this.convertPlatformAnalyticsToCSV(analytics)
    return new Blob([csvData], { type: 'text/csv' })
  }

  static async getRealTimeMetrics() {
    try {
      const stats = await this.getSystemStats()
      
      return {
        vibe_checks_last_hour: 0, // Placeholder - would need hourly tracking
        views_last_hour: 0, // Placeholder - would need hourly tracking
        new_users_last_hour: 0, // Placeholder - would need hourly tracking
        total_users: stats.totalUsers,
        total_venues: stats.totalVenues,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error getting real-time metrics:', error)
      return {
        vibe_checks_last_hour: 0,
        views_last_hour: 0,
        new_users_last_hour: 0,
        total_users: 0,
        total_venues: 0,
        timestamp: new Date().toISOString()
      }
    }
  }

  static async createRole(name: string, description: string, permissions: string[]) {
    return await adminService.createRole(name, description, permissions)
  }

  static async assignRole(userId: string, roleId: string, assignedBy: string) {
    return await adminService.assignRole(userId, roleId, assignedBy)
  }

  static async removeRole(userId: string, roleId: string) {
    return await adminService.removeRole(userId, roleId)
  }

  static async getRoles() {
    return await adminService.getRoles()
  }

  static async getUserRoles(userId: string) {
    return await adminService.getUserRoles(userId)
  }

  static async createModerationReport(
    reporterId: string,
    contentType: string,
    contentId: string,
    reason: string,
    description?: string
  ) {
    return await adminService.createModerationReport(reporterId, contentType, contentId, reason, description)
  }

  static async getModerationReports(status?: string, limit: number = 50, offset: number = 0) {
    return await adminService.getModerationReports(status, limit, offset)
  }

  static async updateModerationReport(
    reportId: string,
    moderatorId: string,
    status: string,
    notes?: string
  ) {
    return await adminService.updateModerationReport(reportId, moderatorId, status, notes)
  }

  // User moderation methods
  static async moderateUser(userId: string, action: 'suspend' | 'delete' | 'activate'): Promise<void> {
    switch (action) {
      case 'suspend':
      case 'delete':
        await this.updateUser(userId, { is_active: false })
        break
      case 'activate':
        await this.updateUser(userId, { is_active: true })
        break
    }
  }

  // Venue moderation methods
  static async moderateVenue(venueId: string, action: 'approve' | 'delete' | 'hide'): Promise<void> {
    switch (action) {
      case 'approve':
        await this.updateVenue(venueId, { is_verified: true, is_active: true })
        break
      case 'delete':
      case 'hide':
        await this.updateVenue(venueId, { is_active: false })
        break
    }
  }

  private static convertPlatformAnalyticsToCSV(analytics: PlatformAnalytics): string {
    const lines: string[] = []
    
    // Basic metrics
    lines.push('Metric,Value')
    lines.push(`Total Users,${analytics.totalUsers}`)
    lines.push(`Total Venues,${analytics.totalVenues}`)
    lines.push(`Total Vibe Checks,${analytics.totalVibeChecks}`)
    lines.push(`Total Reviews,${analytics.totalReviews}`)
    lines.push(`Daily Active Users,${analytics.dailyActiveUsers}`)
    lines.push(`Monthly Active Users,${analytics.monthlyActiveUsers}`)
    lines.push('')

    // Top venues
    if (analytics.topVenues && analytics.topVenues.length > 0) {
      lines.push('Top Venues')
      lines.push('Name,Views,Checkins')
      analytics.topVenues.forEach(venue => {
        lines.push(`${venue.name},${venue.views},${venue.checkins}`)
      })
      lines.push('')
    }

    // Growth data
    if (analytics.growthData && analytics.growthData.length > 0) {
      lines.push('Growth Data')
      lines.push('Date,New Users,New Venues,Total Vibe Checks')
      analytics.growthData.forEach(item => {
        lines.push(`${item.date},${item.newUsers},${item.newVenues},${item.totalVibeChecks}`)
      })
    }

    return lines.join('\n')
  }
}