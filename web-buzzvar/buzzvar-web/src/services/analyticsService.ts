import { analyticsService, type VenueAnalyticsData, type PlatformAnalytics, type DailyStats, type HourlyStats } from '@/lib/database/services'

export class AnalyticsService {
  static async getVenueAnalytics(venueId: string, period: string = '7d'): Promise<VenueAnalyticsData> {
    return await analyticsService.getVenueAnalytics(venueId, period)
  }

  static async getPlatformAnalytics(period: string = '30d'): Promise<PlatformAnalytics> {
    return await analyticsService.getPlatformAnalytics(period)
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

  static async recordVenueView(venueId: string, isUnique: boolean = false): Promise<void> {
    return await analyticsService.recordVenueView(venueId, isUnique)
  }

  static async recordVenueCheckin(venueId: string): Promise<void> {
    return await analyticsService.recordVenueCheckin(venueId)
  }

  static async recordVibeCheck(venueId: string): Promise<void> {
    return await analyticsService.recordVibeCheck(venueId)
  }

  static async recordReview(venueId: string): Promise<void> {
    return await analyticsService.recordReview(venueId)
  }

  private static convertToCSV(analytics: VenueAnalyticsData): string {
    const headers = ['Date', 'Views', 'Unique Views', 'Checkins', 'Vibe Checks', 'Reviews']
    const rows = analytics.dailyStats?.map(stat => [
      stat.date,
      stat.views.toString(),
      stat.uniqueViews.toString(),
      stat.checkins.toString(),
      stat.vibeChecks.toString(),
      stat.reviews.toString()
    ]) || []

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }
}