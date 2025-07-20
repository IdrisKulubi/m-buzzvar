'use client'

import { VenueAnalytics, PlatformAnalytics } from '@/lib/types'

export class ClientAnalyticsService {
  private static baseUrl = '/api/analytics'

  static async getVenueAnalytics(venueId: string, period: string = '7d'): Promise<VenueAnalytics> {
    const params = new URLSearchParams({
      type: 'venue',
      venueId,
      period
    })

    const response = await fetch(`${this.baseUrl}?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch venue analytics: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  static async getPlatformAnalytics(period: string = '7d'): Promise<PlatformAnalytics> {
    const params = new URLSearchParams({
      type: 'platform',
      period
    })

    const response = await fetch(`${this.baseUrl}?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch platform analytics: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  static async getSystemHealthMetrics(): Promise<any> {
    const params = new URLSearchParams({
      type: 'system-health'
    })

    const response = await fetch(`${this.baseUrl}?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch system health metrics: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  static async getRealTimeMetrics(): Promise<any> {
    const params = new URLSearchParams({
      type: 'real-time'
    })

    const response = await fetch(`${this.baseUrl}?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch real-time metrics: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  static async exportVenueAnalytics(venueId: string, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams({
      type: 'venue',
      venueId,
      format
    })

    const response = await fetch(`/api/analytics/export?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to export venue analytics: ${response.statusText}`)
    }

    return response.blob()
  }

  static async exportPlatformAnalytics(format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    const params = new URLSearchParams({
      type: 'platform',
      format
    })

    const response = await fetch(`/api/analytics/export?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to export platform analytics: ${response.statusText}`)
    }

    return response.blob()
  }
}