import { describe, it, expect, beforeAll } from '@jest/globals'
import { mobileDb, checkDatabaseHealth } from '../neon-client'

// Mock fetch for testing
global.fetch = jest.fn()

describe('Mobile Database Client', () => {
  beforeAll(() => {
    // Set up test environment
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000'
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should perform health check successfully', async () => {
    const mockResponse = {
      status: 'healthy',
      timestamp: '2025-01-20T10:00:00Z',
      dbTimestamp: '2025-01-20T10:00:00Z'
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const health = await checkDatabaseHealth()
    
    expect(health.status).toBe('healthy')
    expect(health.clientTimestamp).toBeDefined()
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/health/database',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json'
        }
      })
    )
  })

  it('should handle health check failures', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    const health = await checkDatabaseHealth()
    
    expect(health.status).toBe('unhealthy')
    expect(health.error).toBe('Network error')
    expect(health.clientTimestamp).toBeDefined()
  }, 10000)

  it('should execute queries through API', async () => {
    const mockQueryResult = {
      rows: [{ id: 1, name: 'test' }],
      rowCount: 1
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockQueryResult
    })

    const result = await mobileDb.query('SELECT * FROM test_table')
    
    expect(result).toEqual(mockQueryResult)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/database/query',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sql: 'SELECT * FROM test_table',
          params: [],
          options: {}
        })
      })
    )
  })

  it('should handle query failures with retry', async () => {
    // Mock first two calls to fail, third to succeed
    ;(fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Connection timeout'))
      .mockRejectedValueOnce(new Error('Connection timeout'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rows: [], rowCount: 0 })
      })

    const result = await mobileDb.query('SELECT 1')
    
    expect(result).toEqual({ rows: [], rowCount: 0 })
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('should execute transactions through API', async () => {
    const mockTransactionResult = {
      success: true,
      results: [
        { rows: [{ id: 1 }], rowCount: 1 },
        { rows: [{ id: 2 }], rowCount: 1 }
      ]
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTransactionResult
    })

    const operations = [
      { sql: 'INSERT INTO users (name) VALUES ($1)', params: ['John'] },
      { sql: 'INSERT INTO users (name) VALUES ($1)', params: ['Jane'] }
    ]

    const result = await mobileDb.transaction(operations)
    
    expect(result).toEqual(mockTransactionResult)
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/database/transaction',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ operations })
      })
    )
  })

  it('should handle HTTP errors appropriately', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    })

    await expect(mobileDb.query('SELECT 1')).rejects.toThrow('HTTP 500: Internal Server Error')
  }, 10000)

  it('should respect timeout settings', async () => {
    // Mock a delayed response that never resolves
    ;(fetch as jest.Mock).mockImplementationOnce(() => 
      new Promise(() => {}) // Never resolves
    )

    await expect(mobileDb.query('SELECT 1')).rejects.toThrow()
  }, 15000)
})