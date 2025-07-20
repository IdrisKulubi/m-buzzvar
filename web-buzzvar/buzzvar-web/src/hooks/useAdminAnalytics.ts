'use client'

import { useState, useEffect, useCallback } from 'react'
import { PlatformAnalytics } from '@/lib/types'

interface SystemHealth {
  database: {
    status: 'healthy' | 'slow' | 'error'
    response_time: number
    active_connections: number
  }
  api: {
    status: 'healthy' | 'degraded' | 'error'
    error_rate: number
    uptime: number
  }
  storage: {
    status: 'healthy' | 'warning' | 'error'
    usage_percent: number
    total_size: string
  }
}

interface RealTimeMetrics {
  vibe_checks_last_hour: number
  views_last_hour: number
  new_users_last_hour: number
  timestamp: string
}

export function useAdminAnalytics() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics?type=platform')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setAnalytics(result.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching platform analytics:', err)
      setError('Failed to load platform analytics')
    }
  }, [])

  const fetchSystemHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics?type=system-health')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setSystemHealth(result.data)
    } catch (err) {
      console.error('Error fetching system health:', err)
      // Don't set error for system health as it's not critical
    }
  }, [])

  const fetchRealTimeMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics?type=real-time')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setRealTimeMetrics(result.data)
    } catch (err) {
      console.error('Error fetching real-time metrics:', err)
      // Don't set error for real-time metrics as they're not critical
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchAnalytics(),
      fetchSystemHealth(),
      fetchRealTimeMetrics()
    ])
    setLoading(false)
  }, [fetchAnalytics, fetchSystemHealth, fetchRealTimeMetrics])

  const exportAnalytics = useCallback(async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/analytics/export?type=platform&format=${format}`)
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `platform-analytics-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      return true
    } catch (err) {
      console.error('Export error:', err)
      throw new Error('Failed to export analytics')
    }
  }, [])

  useEffect(() => {
    refreshAll()

    // Set up real-time updates for metrics every 30 seconds
    const realTimeInterval = setInterval(fetchRealTimeMetrics, 30000)

    // Set up system health updates every 2 minutes
    const healthInterval = setInterval(fetchSystemHealth, 120000)

    // Set up analytics refresh every 5 minutes
    const analyticsInterval = setInterval(fetchAnalytics, 300000)

    return () => {
      clearInterval(realTimeInterval)
      clearInterval(healthInterval)
      clearInterval(analyticsInterval)
    }
  }, [refreshAll, fetchRealTimeMetrics, fetchSystemHealth, fetchAnalytics])

  return {
    analytics,
    systemHealth,
    realTimeMetrics,
    loading,
    error,
    refreshAll,
    exportAnalytics,
    fetchAnalytics,
    fetchSystemHealth,
    fetchRealTimeMetrics
  }
}