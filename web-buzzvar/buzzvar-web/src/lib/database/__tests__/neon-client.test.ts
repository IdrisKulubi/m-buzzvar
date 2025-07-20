import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { checkDatabaseHealth, closeDatabaseConnection, pool } from '../neon-client'

describe('Neon Database Client', () => {
  beforeAll(async () => {
    // Ensure we have a test database URL
    if (!process.env.NEON_DATABASE_URL) {
      console.warn('NEON_DATABASE_URL not set, skipping database tests')
    }
  })

  afterAll(async () => {
    // Clean up connections after tests
    await closeDatabaseConnection()
  })

  it('should connect to the database successfully', async () => {
    if (!process.env.NEON_DATABASE_URL) {
      console.log('Skipping database connection test - no NEON_DATABASE_URL')
      return
    }

    const health = await checkDatabaseHealth()
    
    expect(health.status).toBe('healthy')
    expect(health.timestamp).toBeDefined()
    expect(health.dbTimestamp).toBeDefined()
    expect(health.connectionCount).toBeGreaterThanOrEqual(0)
  })

  it('should handle connection pool metrics', async () => {
    if (!process.env.NEON_DATABASE_URL) {
      console.log('Skipping connection pool test - no NEON_DATABASE_URL')
      return
    }

    const health = await checkDatabaseHealth()
    
    expect(typeof health.connectionCount).toBe('number')
    expect(typeof health.idleCount).toBe('number')
    expect(typeof health.waitingCount).toBe('number')
    expect(health.connectionCount).toBeGreaterThanOrEqual(health.idleCount)
  })

  it('should execute basic queries', async () => {
    if (!process.env.NEON_DATABASE_URL) {
      console.log('Skipping query test - no NEON_DATABASE_URL')
      return
    }

    const client = await pool.connect()
    
    try {
      const result = await client.query('SELECT 1 as test_value, NOW() as current_time')
      
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].test_value).toBe(1)
      expect(result.rows[0].current_time).toBeDefined()
    } finally {
      client.release()
    }
  })

  it('should handle connection errors gracefully', async () => {
    // Test with invalid connection string
    const originalUrl = process.env.NEON_DATABASE_URL
    process.env.NEON_DATABASE_URL = 'postgresql://invalid:invalid@invalid:5432/invalid'

    // Import fresh instance with invalid URL
    const { checkDatabaseHealth: checkInvalidHealth } = await import('../neon-client')
    
    const health = await checkInvalidHealth()
    
    expect(health.status).toBe('unhealthy')
    expect(health.error).toBeDefined()
    
    // Restore original URL
    process.env.NEON_DATABASE_URL = originalUrl
  })

  it('should respect connection pool limits', async () => {
    if (!process.env.NEON_DATABASE_URL) {
      console.log('Skipping connection pool limit test - no NEON_DATABASE_URL')
      return
    }

    // Test that we can acquire multiple connections up to the pool limit
    const clients = []
    
    try {
      // Try to acquire connections (should not exceed pool max)
      for (let i = 0; i < 5; i++) {
        const client = await pool.connect()
        clients.push(client)
      }
      
      expect(clients.length).toBe(5)
      expect(pool.totalCount).toBeGreaterThanOrEqual(5)
    } finally {
      // Release all clients
      clients.forEach(client => client.release())
    }
  })
})