import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    const { sql, params = [], options = {} } = await request.json()

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json(
        { error: 'SQL query is required and must be a string' },
        { status: 400 }
      )
    }

    // Basic SQL injection protection - only allow SELECT statements for now
    const trimmedSql = sql.trim().toLowerCase()
    if (!trimmedSql.startsWith('select')) {
      return NextResponse.json(
        { error: 'Only SELECT queries are allowed through this endpoint' },
        { status: 403 }
      )
    }

    const client = await pool().connect()
    
    try {
      const startTime = Date.now()
      const result = await client.query(sql, params)
      const duration = Date.now() - startTime

      return NextResponse.json({
        rows: result.rows,
        rowCount: result.rowCount,
        duration,
        timestamp: new Date().toISOString(),
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Database query error:', error)
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Database query failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}