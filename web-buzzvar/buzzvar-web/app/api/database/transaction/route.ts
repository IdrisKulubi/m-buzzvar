import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database/neon-client'

export async function POST(request: NextRequest) {
  try {
    const { operations } = await request.json()

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        { error: 'Operations array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Validate all operations
    for (const op of operations) {
      if (!op.sql || typeof op.sql !== 'string') {
        return NextResponse.json(
          { error: 'Each operation must have a valid SQL string' },
          { status: 400 }
        )
      }

      // Basic SQL injection protection - only allow SELECT, INSERT, UPDATE, DELETE
      const trimmedSql = op.sql.trim().toLowerCase()
      const allowedOperations = ['select', 'insert', 'update', 'delete']
      const isAllowed = allowedOperations.some(allowed => trimmedSql.startsWith(allowed))
      
      if (!isAllowed) {
        return NextResponse.json(
          { error: `Operation not allowed: ${op.sql.substring(0, 50)}...` },
          { status: 403 }
        )
      }
    }

    const client = await pool().connect()
    
    try {
      await client.query('BEGIN')
      
      const results = []
      const startTime = Date.now()

      for (const operation of operations) {
        const result = await client.query(operation.sql, operation.params || [])
        results.push({
          rows: result.rows,
          rowCount: result.rowCount,
        })
      }

      await client.query('COMMIT')
      
      const duration = Date.now() - startTime

      return NextResponse.json({
        success: true,
        results,
        duration,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Database transaction error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database transaction failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}