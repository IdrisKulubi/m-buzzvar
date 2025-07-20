import { createClient } from '@/lib/supabase'
import { VenueAnalytics, PlatformAnalytics, DailyStats, HourlyStats } from '@/lib/types'

export class AnalyticsService {
  static async getVenueAnalytics(venueId: string, period: string = '7d'): Promise<VenueAnalytics> {
    const supabase = createClient()
    
    // Calculate date range based on period
    const endDate = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1)
        break
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      default:
        startDate.setDate(endDate.getDate() - 7)
    }

    // Get basic venue analytics from the view
    const { data: basicAnalytics, error: basicError } = await supabase
      .from('venue_analytics')
      .select('*')
      .eq('venue_id', venueId)
      .single()

    if (basicError) {
      console.error('Error fetching basic analytics:', basicError)
      throw new Error('Failed to fetch venue analytics')
    }

    // Get daily stats for the period
    const { data: dailyVibeChecks, error: vibeError } = await supabase
      .from('vibe_checks')
      .select('created_at, busyness_rating')
      .eq('venue_id', venueId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    if (vibeError) {
      console.error('Error fetching vibe checks:', vibeError)
    }

    // Get daily views for the period
    const { data: dailyViews, error: viewsError } = await supabase
      .from('club_views')
      .select('created_at')
      .eq('club_id', venueId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    if (viewsError) {
      console.error('Error fetching views:', viewsError)
    }

    // Process daily stats
    const dailyStats = this.processDailyStats(dailyVibeChecks || [], dailyViews || [], startDate, endDate)
    
    // Process hourly stats for peak hours analysis
    const peakHours = this.processHourlyStats(dailyVibeChecks || [])

    return {
      ...basicAnalytics,
      daily_stats: dailyStats,
      peak_hours: peakHours
    }
  }

  static async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    const supabase = createClient()

    // Get basic platform analytics from the view
    const { data: basicAnalytics, error: basicError } = await supabase
      .from('platform_analytics')
      .select('*')
      .single()

    if (basicError) {
      console.error('Error fetching platform analytics:', basicError)
      throw new Error('Failed to fetch platform analytics')
    }

    // Get user growth data for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: userGrowth, error: userGrowthError } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (userGrowthError) {
      console.error('Error fetching user growth:', userGrowthError)
    }

    // Get venue growth data for the last 30 days
    const { data: venueGrowth, error: venueGrowthError } = await supabase
      .from('venues')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (venueGrowthError) {
      console.error('Error fetching venue growth:', venueGrowthError)
    }

    // Process growth data
    const processedUserGrowth = this.processGrowthData(userGrowth || [])
    const processedVenueGrowth = this.processGrowthData(venueGrowth || [])

    // Calculate engagement metrics
    const engagementMetrics = await this.calculateEngagementMetrics()

    return {
      ...basicAnalytics,
      user_growth: processedUserGrowth,
      venue_growth: processedVenueGrowth,
      engagement_metrics: engagementMetrics
    }
  }

  static async exportVenueAnalytics(venueId: string, format: 'csv' | 'json'): Promise<Blob> {
    const analytics = await this.getVenueAnalytics(venueId, '30d')
    
    if (format === 'json') {
      return new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' })
    }
    
    // Convert to CSV format
    const csvData = this.convertToCSV(analytics)
    return new Blob([csvData], { type: 'text/csv' })
  }

  private static processDailyStats(vibeChecks: any[], views: any[], startDate: Date, endDate: Date): DailyStats[] {
    const stats: { [key: string]: DailyStats } = {}
    
    // Initialize all dates in range
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      stats[dateStr] = {
        date: dateStr,
        views: 0,
        vibe_checks: 0,
        avg_busyness: 0
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Process views
    views.forEach(view => {
      const dateStr = new Date(view.created_at).toISOString().split('T')[0]
      if (stats[dateStr]) {
        stats[dateStr].views++
      }
    })

    // Process vibe checks
    const dailyBusyness: { [key: string]: number[] } = {}
    vibeChecks.forEach(check => {
      const dateStr = new Date(check.created_at).toISOString().split('T')[0]
      if (stats[dateStr]) {
        stats[dateStr].vibe_checks++
        if (!dailyBusyness[dateStr]) {
          dailyBusyness[dateStr] = []
        }
        dailyBusyness[dateStr].push(check.busyness_rating)
      }
    })

    // Calculate average busyness for each day
    Object.keys(dailyBusyness).forEach(date => {
      const ratings = dailyBusyness[date]
      stats[date].avg_busyness = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    })

    return Object.values(stats).sort((a, b) => a.date.localeCompare(b.date))
  }

  private static processHourlyStats(vibeChecks: any[]): HourlyStats[] {
    const hourlyData: { [key: number]: { count: number, totalBusyness: number } } = {}
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { count: 0, totalBusyness: 0 }
    }

    // Process vibe checks by hour
    vibeChecks.forEach(check => {
      const hour = new Date(check.created_at).getHours()
      hourlyData[hour].count++
      hourlyData[hour].totalBusyness += check.busyness_rating
    })

    // Convert to HourlyStats format
    return Object.keys(hourlyData).map(hour => ({
      hour: parseInt(hour),
      activity_count: hourlyData[parseInt(hour)].count,
      avg_busyness: hourlyData[parseInt(hour)].count > 0 
        ? hourlyData[parseInt(hour)].totalBusyness / hourlyData[parseInt(hour)].count 
        : 0
    }))
  }

  private static processGrowthData(data: any[]): { date: string, count: number }[] {
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

  private static async calculateEngagementMetrics() {
    const supabase = createClient()
    
    // Calculate various engagement metrics
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    // Get vibe checks for last 7 days and previous 7 days
    const { data: recentVibeChecks } = await supabase
      .from('vibe_checks')
      .select('id')
      .gte('created_at', sevenDaysAgo.toISOString())

    const { data: previousVibeChecks } = await supabase
      .from('vibe_checks')
      .select('id')
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())

    // Get views for comparison
    const { data: recentViews } = await supabase
      .from('club_views')
      .select('id')
      .gte('created_at', sevenDaysAgo.toISOString())

    const { data: previousViews } = await supabase
      .from('club_views')
      .select('id')
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())

    const recentVibeCount = recentVibeChecks?.length || 0
    const previousVibeCount = previousVibeChecks?.length || 0
    const recentViewCount = recentViews?.length || 0
    const previousViewCount = previousViews?.length || 0

    const vibeCheckChange = previousVibeCount > 0 
      ? ((recentVibeCount - previousVibeCount) / previousVibeCount) * 100 
      : 0

    const viewChange = previousViewCount > 0 
      ? ((recentViewCount - previousViewCount) / previousViewCount) * 100 
      : 0

    return [
      {
        metric: 'Vibe Checks',
        value: recentVibeCount,
        change: vibeCheckChange
      },
      {
        metric: 'Venue Views',
        value: recentViewCount,
        change: viewChange
      }
    ]
  }

  private static convertToCSV(analytics: VenueAnalytics): string {
    const headers = ['Date', 'Views', 'Vibe Checks', 'Average Busyness']
    const rows = analytics.daily_stats?.map(stat => [
      stat.date,
      stat.views.toString(),
      stat.vibe_checks.toString(),
      stat.avg_busyness.toFixed(2)
    ]) || []

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }
}