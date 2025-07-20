// Mobile app database client configuration
// Note: For mobile apps, we'll use HTTP-based database access through API routes
// Direct PostgreSQL connections are not suitable for mobile environments

interface DatabaseConfig {
  baseUrl: string
  timeout: number
}

class MobileDatabaseClient {
  private config: DatabaseConfig

  constructor() {
    this.config = {
      baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
      timeout: 10000, // 10 second timeout
    }
  }

  // Generic API request method with retry logic
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    retries: number = 3
  ): Promise<T> {
    const url = `${this.config.baseUrl}/api${endpoint}`
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        console.error(`Database request attempt ${attempt} failed:`, error)
        
        if (attempt === retries) {
          throw error
        }

        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        )
      }
    }

    throw new Error('All retry attempts failed')
  }

  // Health check method
  async checkHealth() {
    try {
      const result = await this.makeRequest<{
        status: string
        timestamp: string
        dbTimestamp: string
      }>('/health/database')
      
      return {
        ...result,
        clientTimestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        clientTimestamp: new Date().toISOString()
      }
    }
  }

  // Generic query method for database operations
  async query<T>(
    sql: string, 
    params: any[] = [],
    options: { timeout?: number } = {}
  ): Promise<T> {
    return this.makeRequest<T>('/database/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params, options }),
    })
  }

  // Transaction support
  async transaction<T>(
    operations: { sql: string; params?: any[] }[]
  ): Promise<T> {
    return this.makeRequest<T>('/database/transaction', {
      method: 'POST',
      body: JSON.stringify({ operations }),
    })
  }
}

// Export singleton instance
export const mobileDb = new MobileDatabaseClient()

// Health check function for mobile
export const checkDatabaseHealth = () => mobileDb.checkHealth()