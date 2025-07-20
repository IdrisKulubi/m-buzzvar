import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

// Lazy initialization of pool
let poolInstance: Pool | null = null
let dbInstance: ReturnType<typeof drizzle> | null = null

function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000'),
      statement_timeout: 30000, // 30 second statement timeout
      query_timeout: 30000, // 30 second query timeout
    })

    // Connection pool event listeners for monitoring
    poolInstance.on('connect', () => {
      console.log('New database client connected')
    })

    poolInstance.on('error', (err: Error) => {
      console.error('Database client error:', err)
    })

    poolInstance.on('remove', () => {
      console.log('Database client removed from pool')
    })
  }
  return poolInstance
}

function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool())
  }
  return dbInstance
}

// Export getters
export const pool = getPool
export const db = getDb

// Connection health check function
export async function checkDatabaseHealth() {
  try {
    const poolRef = getPool()
    const client = await poolRef.connect()
    const result = await client.query('SELECT 1 as health_check, NOW() as timestamp')
    client.release()
    
    return { 
      status: 'healthy', 
      timestamp: new Date(),
      dbTimestamp: result.rows[0].timestamp,
      connectionCount: poolRef.totalCount,
      idleCount: poolRef.idleCount,
      waitingCount: poolRef.waitingCount
    }
  } catch (error) {
    console.error('Database health check failed:', error)
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error', 
      timestamp: new Date() 
    }
  }
}

// Graceful shutdown function
export async function closeDatabaseConnection() {
  try {
    if (poolInstance) {
      await poolInstance.end()
      poolInstance = null
      dbInstance = null
      console.log('Database connection pool closed successfully')
    }
  } catch (error) {
    console.error('Error closing database connection pool:', error)
  }
}