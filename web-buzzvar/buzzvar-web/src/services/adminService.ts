import { createClient } from '@/lib/supabase'
import { PlatformAnalytics, UserManagement, UserFilters, VenueFilters, GrowthData, EngagementData } from '@/lib/types'
import { Database } from '@/lib/types'

type Venue = Database['public']['Tables']['venues']['Row']

export class AdminService {
  static async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    const supabase = createClient()

    try {
      // Get basic platform analytics from the view
      const { data: basicAnalytics, error: basicError } = await supabase
        .from('platform_analytics')
        .select('*')
        .single()

      if (basicError) {
        console.error('Error fetching basic platform analytics:', basicError)
        throw new Error('Failed to fetch platform analytics')
      }

      // Get detailed growth data for the last 90 days
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      // User growth data
      const { data: userGrowthData, error: userGrowthError } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at', { ascending: true })

      if (userGrowthError) {
        console.error('Error fetching user growth data:', userGrowthError)
      }

      // Venue growth data
      const { data: venueGrowthData, error: venueGrowthError } = await supabase
        .from('venues')
        .select('created_at')
        .gte('created_at', ninetyDaysAgo.toISOString())
        .order('created_at', { ascending: true })

      if (venueGrowthError) {
        console.error('Error fetching venue growth data:', venueGrowthError)
      }

      // Process growth data
      const userGrowth = this.processGrowthData(userGrowthData || [])
      const venueGrowth = this.processGrowthData(venueGrowthData || [])

      // Calculate engagement metrics
      const engagementMetrics = await this.calculatePlatformEngagementMetrics()

      return {
        ...basicAnalytics,
        user_growth: userGrowth,
        venue_growth: venueGrowth,
        engagement_metrics: engagementMetrics
      }
    } catch (error) {
      console.error('Error in getPlatformAnalytics:', error)
      throw error
    }
  }

  static async getSystemHealthMetrics() {
    const supabase = createClient()

    try {
      // Database performance metrics
      const startTime = Date.now()
      
      // Test query performance
      const { data: testQuery, error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1)

      const queryTime = Date.now() - startTime

      if (testError) {
        console.error('Database health check failed:', testError)
      }

      // Get recent error rates (simulated - in real app would come from logs)
      const errorRate = Math.random() * 2 // 0-2% error rate simulation

      // Get active connections (simulated)
      const activeConnections = Math.floor(Math.random() * 50) + 10

      // Storage usage (simulated)
      const storageUsed = Math.floor(Math.random() * 80) + 10 // 10-90% usage

      return {
        database: {
          status: queryTime < 1000 ? 'healthy' : 'slow',
          response_time: queryTime,
          active_connections: activeConnections
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
    const supabase = createClient()

    try {
      // Get metrics for the last hour
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)

      // Recent vibe checks
      const { data: recentVibeChecks, error: vibeError } = await supabase
        .from('vibe_checks')
        .select('id, created_at')
        .gte('created_at', oneHourAgo.toISOString())

      // Recent views
      const { data: recentViews, error: viewsError } = await supabase
        .from('club_views')
        .select('id, created_at')
        .gte('created_at', oneHourAgo.toISOString())

      // Recent user registrations
      const { data: recentUsers, error: usersError } = await supabase
        .from('users')
        .select('id, created_at')
        .gte('created_at', oneHourAgo.toISOString())

      if (vibeError || viewsError || usersError) {
        console.error('Error fetching real-time metrics:', { vibeError, viewsError, usersError })
      }

      return {
        vibe_checks_last_hour: recentVibeChecks?.length || 0,
        views_last_hour: recentViews?.length || 0,
        new_users_last_hour: recentUsers?.length || 0,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error getting real-time metrics:', error)
      return {
        vibe_checks_last_hour: 0,
        views_last_hour: 0,
        new_users_last_hour: 0,
        timestamp: new Date().toISOString()
      }
    }
  }

  private static processGrowthData(data: any[]): GrowthData[] {
    const dailyCounts: { [key: string]: number } = {}
    
    data.forEach(item => {
      const dateStr = new Date(item.created_at).toISOString().split('T')[0]
      dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1
    })

    return Object.keys(dailyCounts)
      .sort()
      .map(date => ({
        date,
        count: dailyCounts[date]
      }))
  }

  private static async calculatePlatformEngagementMetrics(): Promise<EngagementData[]> {
    const supabase = createClient()
    
    try {
      // Calculate various engagement metrics comparing last 7 days vs previous 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

      // Vibe checks comparison
      const { data: recentVibeChecks } = await supabase
        .from('vibe_checks')
        .select('id')
        .gte('created_at', sevenDaysAgo.toISOString())

      const { data: previousVibeChecks } = await supabase
        .from('vibe_checks')
        .select('id')
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString())

      // Views comparison
      const { data: recentViews } = await supabase
        .from('club_views')
        .select('id')
        .gte('created_at', sevenDaysAgo.toISOString())

      const { data: previousViews } = await supabase
        .from('club_views')
        .select('id')
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString())

      // User registrations comparison
      const { data: recentUsers } = await supabase
        .from('users')
        .select('id')
        .gte('created_at', sevenDaysAgo.toISOString())

      const { data: previousUsers } = await supabase
        .from('users')
        .select('id')
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString())

      // Bookmarks comparison
      const { data: recentBookmarks } = await supabase
        .from('user_bookmarks')
        .select('id')
        .gte('created_at', sevenDaysAgo.toISOString())

      const { data: previousBookmarks } = await supabase
        .from('user_bookmarks')
        .select('id')
        .gte('created_at', fourteenDaysAgo.toISOString())
        .lt('created_at', sevenDaysAgo.toISOString())

      // Calculate percentage changes
      const calculateChange = (recent: number, previous: number) => {
        if (previous === 0) return recent > 0 ? 100 : 0
        return ((recent - previous) / previous) * 100
      }

      const recentVibeCount = recentVibeChecks?.length || 0
      const previousVibeCount = previousVibeChecks?.length || 0
      const recentViewCount = recentViews?.length || 0
      const previousViewCount = previousViews?.length || 0
      const recentUserCount = recentUsers?.length || 0
      const previousUserCount = previousUsers?.length || 0
      const recentBookmarkCount = recentBookmarks?.length || 0
      const previousBookmarkCount = previousBookmarks?.length || 0

      return [
        {
          metric: 'Vibe Checks',
          value: recentVibeCount,
          change: calculateChange(recentVibeCount, previousVibeCount)
        },
        {
          metric: 'Venue Views',
          value: recentViewCount,
          change: calculateChange(recentViewCount, previousViewCount)
        },
        {
          metric: 'New Users',
          value: recentUserCount,
          change: calculateChange(recentUserCount, previousUserCount)
        },
        {
          metric: 'Bookmarks',
          value: recentBookmarkCount,
          change: calculateChange(recentBookmarkCount, previousBookmarkCount)
        }
      ]
    } catch (error) {
      console.error('Error calculating engagement metrics:', error)
      return []
    }
  }

  private static convertPlatformAnalyticsToCSV(analytics: PlatformAnalytics): string {
    const lines: string[] = []
    
    // Basic metrics
    lines.push('Metric,Value')
    lines.push(`Total Users,${analytics.total_users}`)
    lines.push(`Total Venues,${analytics.total_venues}`)
    lines.push(`Total Vibe Checks,${analytics.total_vibe_checks}`)
    lines.push(`Total Promotions,${analytics.total_promotions}`)
    lines.push(`New Users This Week,${analytics.new_users_week}`)
    lines.push(`New Venues This Week,${analytics.new_venues_week}`)
    lines.push(`New Vibe Checks This Week,${analytics.new_vibe_checks_week}`)
    lines.push('')

    // User growth data
    if (analytics.user_growth && analytics.user_growth.length > 0) {
      lines.push('User Growth')
      lines.push('Date,New Users')
      analytics.user_growth.forEach(item => {
        lines.push(`${item.date},${item.count}`)
      })
      lines.push('')
    }

    // Venue growth data
    if (analytics.venue_growth && analytics.venue_growth.length > 0) {
      lines.push('Venue Growth')
      lines.push('Date,New Venues')
      analytics.venue_growth.forEach(item => {
        lines.push(`${item.date},${item.count}`)
      })
      lines.push('')
    }

    // Engagement metrics
    if (analytics.engagement_metrics && analytics.engagement_metrics.length > 0) {
      lines.push('Engagement Metrics')
      lines.push('Metric,Value,Change %')
      analytics.engagement_metrics.forEach(item => {
        lines.push(`${item.metric},${item.value},${item.change.toFixed(2)}`)
      })
    }

    return lines.join('\n')
  }

  // Placeholder methods for user and venue management (will be implemented in other tasks)
  static async getAllUsers(filters?: UserFilters): Promise<UserManagement[]> {
    // Implementation will be added in user management task
    throw new Error('Not implemented yet')
  }

  static async getAllVenues(filters?: VenueFilters): Promise<Venue[]> {
    // Implementation will be added in venue management task
    throw new Error('Not implemented yet')
  }

  static async moderateUser(userId: string, action: 'suspend' | 'delete' | 'activate'): Promise<void> {
    // Implementation will be added in user management task
    throw new Error('Not implemented yet')
  }

  static async moderateVenue(venueId: string, action: 'approve' | 'delete' | 'hide'): Promise<void> {
    // Implementation will be added in venue management task
    throw new Error('Not implemented yet')
  }
}