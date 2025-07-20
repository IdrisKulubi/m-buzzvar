import { checkDatabaseHealth, pool } from '../database/neon-client'

interface DatabaseMetrics {
  timestamp: string
  status: 'healthy' | 'unhealthy'
  connectionCount: number
  idleCount: number
  waitingCount: number
  responseTime?: number
  error?: string
}

interface AlertConfig {
  maxResponseTime: number // milliseconds
  maxConnections: number
  maxWaitingConnections: number
  alertCallback?: (alert: DatabaseAlert) => void
}

interface DatabaseAlert {
  type: 'performance' | 'connection' | 'availability'
  severity: 'warning' | 'critical'
  message: string
  timestamp: string
  metrics: DatabaseMetrics
}

export class DatabaseMonitor {
  private metrics: DatabaseMetrics[] = []
  private alertConfig: AlertConfig
  private monitoringInterval?: NodeJS.Timeout
  private isMonitoring = false

  constructor(alertConfig: Partial<AlertConfig> = {}) {
    this.alertConfig = {
      maxResponseTime: 5000, // 5 seconds
      maxConnections: 18, // 90% of max pool size (20)
      maxWaitingConnections: 5,
      ...alertConfig,
    }
  }

  // Start continuous monitoring
  startMonitoring(intervalMs: number = 30000) {
    if (this.isMonitoring) {
      console.warn('Database monitoring is already running')
      return
    }

    this.isMonitoring = true
    console.log(`Starting database monitoring with ${intervalMs}ms interval`)

    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics()
    }, intervalMs)

    // Collect initial metrics
    this.collectMetrics()
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
    this.isMonitoring = false
    console.log('Database monitoring stopped')
  }

  // Collect current database metrics
  private async collectMetrics(): Promise<DatabaseMetrics> {
    const startTime = Date.now()
    
    try {
      const healthCheck = await checkDatabaseHealth()
      const responseTime = Date.now() - startTime

      const poolRef = pool()
      const metrics: DatabaseMetrics = {
        timestamp: new Date().toISOString(),
        status: healthCheck.status as 'healthy' | 'unhealthy',
        connectionCount: poolRef.totalCount,
        idleCount: poolRef.idleCount,
        waitingCount: poolRef.waitingCount,
        responseTime,
      }

      // Store metrics (keep last 100 entries)
      this.metrics.push(metrics)
      if (this.metrics.length > 100) {
        this.metrics.shift()
      }

      // Check for alerts
      this.checkAlerts(metrics)

      return metrics
    } catch (error) {
      const poolRef = pool()
      const metrics: DatabaseMetrics = {
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        connectionCount: poolRef.totalCount,
        idleCount: poolRef.idleCount,
        waitingCount: poolRef.waitingCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      }

      this.metrics.push(metrics)
      if (this.metrics.length > 100) {
        this.metrics.shift()
      }

      this.checkAlerts(metrics)
      return metrics
    }
  }

  // Check for alert conditions
  private checkAlerts(metrics: DatabaseMetrics) {
    const alerts: DatabaseAlert[] = []

    // Availability alerts
    if (metrics.status === 'unhealthy') {
      alerts.push({
        type: 'availability',
        severity: 'critical',
        message: `Database is unhealthy: ${metrics.error || 'Unknown error'}`,
        timestamp: metrics.timestamp,
        metrics,
      })
    }

    // Performance alerts
    if (metrics.responseTime && metrics.responseTime > this.alertConfig.maxResponseTime) {
      alerts.push({
        type: 'performance',
        severity: metrics.responseTime > this.alertConfig.maxResponseTime * 2 ? 'critical' : 'warning',
        message: `Database response time is high: ${metrics.responseTime}ms`,
        timestamp: metrics.timestamp,
        metrics,
      })
    }

    // Connection pool alerts
    if (metrics.connectionCount > this.alertConfig.maxConnections) {
      alerts.push({
        type: 'connection',
        severity: 'warning',
        message: `High connection count: ${metrics.connectionCount}/${pool().options.max}`,
        timestamp: metrics.timestamp,
        metrics,
      })
    }

    if (metrics.waitingCount > this.alertConfig.maxWaitingConnections) {
      alerts.push({
        type: 'connection',
        severity: 'critical',
        message: `Too many waiting connections: ${metrics.waitingCount}`,
        timestamp: metrics.timestamp,
        metrics,
      })
    }

    // Trigger alert callbacks
    alerts.forEach(alert => {
      console.warn(`Database Alert [${alert.severity.toUpperCase()}]:`, alert.message)
      if (this.alertConfig.alertCallback) {
        this.alertConfig.alertCallback(alert)
      }
    })
  }

  // Get current metrics
  getCurrentMetrics(): DatabaseMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  // Get metrics history
  getMetricsHistory(limit: number = 50): DatabaseMetrics[] {
    return this.metrics.slice(-limit)
  }

  // Get health summary
  getHealthSummary(minutes: number = 30): {
    totalChecks: number
    healthyChecks: number
    unhealthyChecks: number
    averageResponseTime: number
    uptime: number
  } {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000)
    const recentMetrics = this.metrics.filter(
      m => new Date(m.timestamp) > cutoffTime
    )

    if (recentMetrics.length === 0) {
      return {
        totalChecks: 0,
        healthyChecks: 0,
        unhealthyChecks: 0,
        averageResponseTime: 0,
        uptime: 0,
      }
    }

    const healthyChecks = recentMetrics.filter(m => m.status === 'healthy').length
    const responseTimes = recentMetrics
      .filter(m => m.responseTime !== undefined)
      .map(m => m.responseTime!)

    return {
      totalChecks: recentMetrics.length,
      healthyChecks,
      unhealthyChecks: recentMetrics.length - healthyChecks,
      averageResponseTime: responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0,
      uptime: (healthyChecks / recentMetrics.length) * 100,
    }
  }

  // Manual health check
  async performHealthCheck(): Promise<DatabaseMetrics> {
    return await this.collectMetrics()
  }
}

// Export singleton instance
export const databaseMonitor = new DatabaseMonitor({
  alertCallback: (alert) => {
    // You can integrate with external alerting systems here
    // For example: send to Slack, email, or monitoring service
    console.error(`Database Alert: ${alert.message}`)
  },
})