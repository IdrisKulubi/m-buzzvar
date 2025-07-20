import { db, pool } from './neon-client'
import { eq, and, or, desc, asc, sql } from 'drizzle-orm'

export abstract class BaseService {
  protected db = db
  protected pool = pool

  // Execute database operations with retry logic and error handling
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on certain types of errors
        if (this.isNonRetryableError(error)) {
          throw lastError
        }
        
        if (attempt === maxRetries) {
          console.error(`Database operation failed after ${maxRetries} attempts:`, lastError)
          throw lastError
        }

        // Exponential backoff with jitter
        const delay = backoffMs * Math.pow(2, attempt - 1) + Math.random() * 1000
        console.warn(`Database operation attempt ${attempt} failed, retrying in ${delay}ms:`, error)
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  // Check if error should not be retried
  private isNonRetryableError(error: any): boolean {
    if (!error.code) return false
    
    // PostgreSQL error codes that shouldn't be retried
    const nonRetryableCodes = [
      '23505', // unique_violation
      '23503', // foreign_key_violation
      '23514', // check_violation
      '23502', // not_null_violation
      '42P01', // undefined_table
      '42703', // undefined_column
      '42883', // undefined_function
    ]
    
    return nonRetryableCodes.includes(error.code)
  }

  // Enhanced error handling with specific PostgreSQL error codes
  protected handleDatabaseError(error: any): never {
    console.error('Database operation failed:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      stack: error.stack
    })
    
    // Map PostgreSQL error codes to user-friendly messages
    switch (error.code) {
      case '23505':
        throw new Error('A record with this information already exists')
      case '23503':
        throw new Error('Referenced record not found or cannot be deleted due to dependencies')
      case '23514':
        throw new Error('Data validation failed - invalid value provided')
      case '23502':
        throw new Error('Required field is missing')
      case '42P01':
        throw new Error('Database table not found - please contact support')
      case '42703':
        throw new Error('Database column not found - please contact support')
      case '08006':
        throw new Error('Database connection failed - please try again')
      case '53300':
        throw new Error('Database is temporarily unavailable - please try again')
      case '57014':
        throw new Error('Database operation timed out - please try again')
      default:
        throw new Error('Database operation failed - please try again')
    }
  }

  // Connection pool monitoring
  async getConnectionPoolStats() {
    const poolRef = this.pool()
    return {
      totalCount: poolRef.totalCount,
      idleCount: poolRef.idleCount,
      waitingCount: poolRef.waitingCount,
      timestamp: new Date().toISOString()
    }
  }

  // Query performance monitoring
  protected async executeWithTiming<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now()
    
    try {
      const result = await operation()
      const duration = Date.now() - startTime
      
      // Log slow queries (> 1 second)
      if (duration > 1000) {
        console.warn(`Slow database operation detected: ${operationName} took ${duration}ms`)
      }
      
      return { result, duration }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`Database operation failed: ${operationName} failed after ${duration}ms`, error)
      throw error
    }
  }

  // Batch operations for better performance
  protected async executeBatch<T>(
    operations: Array<() => Promise<T>>,
    batchSize: number = 10,
    delayBetweenBatches: number = 100
  ): Promise<T[]> {
    const results: T[] = []
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(operation => this.executeWithRetry(operation))
      )
      
      results.push(...batchResults)
      
      // Add delay between batches to prevent overwhelming the database
      if (i + batchSize < operations.length && delayBetweenBatches > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }
    
    return results
  }

  // Transaction wrapper with automatic rollback
  protected async executeTransaction<T>(
    operation: (tx: typeof db) => Promise<T>
  ): Promise<T> {
    return await this.executeWithRetry(async () => {
      return await this.db.transaction(async (tx) => {
        try {
          return await operation(tx)
        } catch (error) {
          console.error('Transaction failed, rolling back:', error)
          throw error
        }
      })
    })
  }

  // Health check for the service
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    timestamp: string
    connectionPool: any
    error?: string
  }> {
    try {
      // Test basic connectivity
      await this.db.execute(sql`SELECT 1`)
      
      const poolStats = await this.getConnectionPoolStats()
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        connectionPool: poolStats
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        connectionPool: await this.getConnectionPoolStats(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}