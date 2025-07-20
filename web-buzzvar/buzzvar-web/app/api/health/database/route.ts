import { NextRequest, NextResponse } from 'next/server'
import { checkDatabaseHealth, pool } from '@/lib/database/neon-client'

export async function GET(request: NextRequest) {
  try {
    const healthCheck = await checkDatabaseHealth()
    
    // Additional connection pool metrics
    const poolRef = pool()
    const poolMetrics = {
      totalConnections: poolRef.totalCount,
      idleConnections: poolRef.idleCount,
      waitingConnections: poolRef.waitingCount,
    }

    const response = {
      ...healthCheck,
      poolMetrics,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    }

    // Return appropriate HTTP status based on health
    const status = healthCheck.status === 'healthy' ? 200 : 503

    return NextResponse.json(response, { status })
  } catch (error) {
    console.error('Health check endpoint error:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

// Optional: Add a detailed health check with more metrics
export async function POST(request: NextRequest) {
  try {
    const { includeDetails = false } = await request.json()
    
    const basicHealth = await checkDatabaseHealth()
    
    if (!includeDetails) {
      return NextResponse.json(basicHealth)
    }

    // Detailed health check with performance metrics
    const startTime = Date.now()
    
    // Test query performance
    const client = await pool().connect()
    const queryStart = Date.now()
    await client.query('SELECT COUNT(*) FROM information_schema.tables')
    const queryDuration = Date.now() - queryStart
    client.release()
    
    const totalDuration = Date.now() - startTime

    const detailedResponse = {
      ...basicHealth,
      performance: {
        queryDuration,
        totalDuration,
        connectionAcquisitionTime: totalDuration - queryDuration,
      },
      poolMetrics: {
        totalConnections: poolRef.totalCount,
        idleConnections: poolRef.idleCount,
        waitingConnections: poolRef.waitingCount,
      },
      database: {
        version: await getDatabaseVersion(),
        timezone: await getDatabaseTimezone(),
      },
    }

    return NextResponse.json(detailedResponse)
  } catch (error) {
    console.error('Detailed health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

async function getDatabaseVersion(): Promise<string> {
  try {
    const client = await pool().connect()
    const result = await client.query('SELECT version()')
    client.release()
    return result.rows[0].version
  } catch (error) {
    return 'Unknown'
  }
}

async function getDatabaseTimezone(): Promise<string> {
  try {
    const client = await pool().connect()
    const result = await client.query('SHOW timezone')
    client.release()
    return result.rows[0].TimeZone
  } catch (error) {
    return 'Unknown'
  }
}