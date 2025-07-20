import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database/neon-client'
import { sql } from 'drizzle-orm'

// Generic database query endpoint for mobile app
export async function POST(request: NextRequest) {
  try {
    const { sql: query, params = [], options = {} } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid query parameter' },
        { status: 400 }
      )
    }

    // Security: Only allow SELECT queries for mobile app
    const trimmedQuery = query.trim().toLowerCase()
    if (!trimmedQuery.startsWith('select')) {
      return NextResponse.json(
        { error: 'Only SELECT queries are allowed' },
        { status: 403 }
      )
    }

    // Execute query with timeout
    const timeout = options.timeout || 30000 // 30 second default timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const dbInstance = db()
      const result = await dbInstance.execute(sql.raw(query, ...params))
      
      clearTimeout(timeoutId)
      
      return NextResponse.json({
        data: result.rows,
        rowCount: result.rowCount,
        timestamp: new Date().toISOString()
      })
    } catch (queryError) {
      clearTimeout(timeoutId)
      
      console.error('Database query error:', queryError)
      
      return NextResponse.json(
        { 
          error: 'Query execution failed',
          details: queryError instanceof Error ? queryError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('API route error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  try {
    const dbInstance = db()
    const result = await dbInstance.execute(sql`SELECT 1 as health_check, NOW() as timestamp`)
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      dbTimestamp: result.rows[0]?.timestamp
    })
  } catch (error) {
    console.error('Database health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}