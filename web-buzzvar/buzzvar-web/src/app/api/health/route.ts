import { NextRequest, NextResponse } from 'next/server'
import { createApiResponse, handleApiError } from '@/lib/api/middleware'
import { Pool } from 'pg'

// Create a separate pool for health checks to avoid affecting main operations
const healthCheckPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL!,
  ssl: process.env.NODE_ENV === 'production',
  max: 2,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 2000,
})

export async function GET(request: NextRequest) {
  try {
    const healthChecks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {
        database: { status: 'unknown', responseTime: 0 },
        auth: { status: 'unknown' },
        storage: { status: 'unknown' },
      }
    }

    // Database health check
    const dbStart = Date.now()
    try {
      const client = await healthCheckPool.connect()
      await client.query('SELECT 1')
      client.release()
      healthChecks.services.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart
      }
    } catch (error) {
      healthChecks.services.database = {
        status: 'unhealthy',
        responseTime: Date.now() - dbStart,
        error: error instanceof Error ? error.message : 'Database connection failed'
      }
      healthChecks.status = 'degraded'
    }

    // Auth service health check
    try {
      // Check if Better Auth environment variables are configured
      const authConfigured = !!(
        process.env.BETTER_AUTH_SECRET &&
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET
      )
      
      healthChecks.services.auth = {
        status: authConfigured ? 'healthy' : 'misconfigured',
        configured: authConfigured
      }
      
      if (!authConfigured) {
        healthChecks.status = 'degraded'
      }
    } catch (error) {
      healthChecks.services.auth = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Auth service check failed'
      }
      healthChecks.status = 'degraded'
    }

    // Storage service health check
    try {
      const storageConfigured = !!(
        process.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
        process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
        process.env.CLOUDFLARE_R2_BUCKET &&
        process.env.CLOUDFLARE_ACCOUNT_ID
      )
      
      healthChecks.services.storage = {
        status: storageConfigured ? 'healthy' : 'misconfigured',
        configured: storageConfigured
      }
      
      if (!storageConfigured) {
        healthChecks.status = 'degraded'
      }
    } catch (error) {
      healthChecks.services.storage = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Storage service check failed'
      }
      healthChecks.status = 'degraded'
    }

    const statusCode = healthChecks.status === 'healthy' ? 200 : 
                      healthChecks.status === 'degraded' ? 207 : 503

    return NextResponse.json(healthChecks, { status: statusCode })
  } catch (error) {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 503 })
  }
}