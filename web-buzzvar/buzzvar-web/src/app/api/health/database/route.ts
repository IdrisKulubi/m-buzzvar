import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createApiResponse, handleApiError, AuthenticatedRequest } from '@/lib/api/middleware'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL!,
  ssl: process.env.NODE_ENV === 'production',
  max: 5,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 2000,
})

export const GET = withApiHandler(async (request: AuthenticatedRequest) => {
  try {
    if (!request.user?.isAdmin) {
      return createApiResponse(undefined, {
        status: 403,
        error: 'Admin access required',
        message: 'Only administrators can access database health metrics'
      })
    }

    const healthMetrics = {
      timestamp: new Date().toISOString(),
      database: {
        status: 'unknown',
        connectionPool: {
          totalConnections: 0,
          idleConnections: 0,
          waitingClients: 0
        },
        performance: {
          responseTime: 0,
          queryTest: false
        },
        tables: {
          users: { exists: false, count: 0 },
          venues: { exists: false, count: 0 },
          promotions: { exists: false, count: 0 },
          sessions: { exists: false, count: 0 }
        }
      }
    }

    const client = await pool.connect()
    const startTime = Date.now()

    try {
      // Test basic connectivity
      await client.query('SELECT 1')
      const responseTime = Date.now() - startTime
      
      healthMetrics.database.performance = {
        responseTime,
        queryTest: true
      }

      // Get connection pool stats
      healthMetrics.database.connectionPool = {
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingClients: pool.waitingCount
      }

      // Check table existence and counts
      const tableChecks = [
        { name: 'users', query: 'SELECT COUNT(*) FROM users' },
        { name: 'venues', query: 'SELECT COUNT(*) FROM venues' },
        { name: 'promotions', query: 'SELECT COUNT(*) FROM promotions' },
        { name: 'sessions', query: 'SELECT COUNT(*) FROM sessions' }
      ]

      for (const table of tableChecks) {
        try {
          const result = await client.query(table.query)
          healthMetrics.database.tables[table.name] = {
            exists: true,
            count: parseInt(result.rows[0].count)
          }
        } catch (error) {
          healthMetrics.database.tables[table.name] = {
            exists: false,
            count: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }

      healthMetrics.database.status = 'healthy'

      return createApiResponse(healthMetrics, {
        message: 'Database health check completed successfully'
      })
    } finally {
      client.release()
    }
  } catch (error) {
    return handleApiError(error, 'Database Health Check')
  }
}, { requireAuth: true, requireAdmin: true, requireDatabase: false })