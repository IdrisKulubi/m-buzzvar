// Mobile database service that communicates with the web API
// This replaces direct Supabase calls with API-based database access

interface DatabaseConfig {
  baseUrl: string
  timeout: number
}

interface QueryResult<T = any> {
  data: T[]
  rowCount: number
  timestamp: string
}

interface TransactionOperation {
  sql: string
  params?: any[]
}

interface TransactionResult {
  results: QueryResult[]
  timestamp: string
}

class MobileDatabaseService {
  private config: DatabaseConfig

  constructor() {
    this.config = {
      baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
      timeout: 30000, // 30 second timeout
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
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`)
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
  async query<T = any>(
    sql: string, 
    params: any[] = [],
    options: { timeout?: number } = {}
  ): Promise<QueryResult<T>> {
    return this.makeRequest<QueryResult<T>>('/database/query', {
      method: 'POST',
      body: JSON.stringify({ sql, params, options }),
    })
  }

  // Transaction support
  async transaction(operations: TransactionOperation[]): Promise<TransactionResult> {
    return this.makeRequest<TransactionResult>('/database/transaction', {
      method: 'POST',
      body: JSON.stringify({ operations }),
    })
  }

  // Venue-specific methods
  async getVenues(filters?: {
    city?: string
    venue_type?: string
    search?: string
    latitude?: number
    longitude?: number
    radius?: number
  }, limit: number = 50, offset: number = 0) {
    let sql = `
      SELECT v.*, 
             CASE 
               WHEN $3::float IS NOT NULL AND $4::float IS NOT NULL THEN
                 (6371 * acos(
                   cos(radians($3)) * 
                   cos(radians(CAST(v.latitude AS FLOAT))) * 
                   cos(radians(CAST(v.longitude AS FLOAT)) - radians($4)) + 
                   sin(radians($3)) * 
                   sin(radians(CAST(v.latitude AS FLOAT)))
                 ))
               ELSE NULL
             END as distance
      FROM venues v
      WHERE v.is_active = true
    `
    
    const params: any[] = [limit, offset]
    let paramIndex = 2

    if (filters?.latitude && filters?.longitude) {
      params.push(filters.latitude, filters.longitude)
      paramIndex += 2
      
      if (filters.radius) {
        sql += ` AND (6371 * acos(
          cos(radians($${paramIndex - 1})) * 
          cos(radians(CAST(v.latitude AS FLOAT))) * 
          cos(radians(CAST(v.longitude AS FLOAT)) - radians($${paramIndex})) + 
          sin(radians($${paramIndex - 1})) * 
          sin(radians(CAST(v.latitude AS FLOAT)))
        )) <= $${++paramIndex}`
        params.push(filters.radius)
      }
    }

    if (filters?.city) {
      sql += ` AND v.city ILIKE $${++paramIndex}`
      params.push(`%${filters.city}%`)
    }

    if (filters?.venue_type) {
      sql += ` AND v.venue_type = $${++paramIndex}`
      params.push(filters.venue_type)
    }

    if (filters?.search) {
      sql += ` AND (v.name ILIKE $${++paramIndex} OR v.description ILIKE $${++paramIndex})`
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }

    sql += ` ORDER BY ${filters?.latitude && filters?.longitude ? 'distance' : 'v.created_at DESC'}`
    sql += ` LIMIT $1 OFFSET $2`

    return this.query(sql, params)
  }

  async getVenueById(venueId: string) {
    const sql = `
      SELECT v.*, 
             COALESCE(va.views, 0) as total_views,
             COALESCE(va.checkins, 0) as total_checkins,
             COALESCE(va.vibe_checks, 0) as total_vibe_checks
      FROM venues v
      LEFT JOIN (
        SELECT venue_id, 
               SUM(views) as views,
               SUM(checkins) as checkins,
               SUM(vibe_checks) as vibe_checks
        FROM venue_analytics 
        WHERE venue_id = $1
        GROUP BY venue_id
      ) va ON v.id = va.venue_id
      WHERE v.id = $1 AND v.is_active = true
    `
    
    return this.query(sql, [venueId])
  }

  // Vibe check methods
  async getVibeChecks(venueId: string, limit: number = 20, offset: number = 0) {
    const sql = `
      SELECT vc.*, u.name as user_name, u.avatar_url as user_avatar
      FROM vibe_checks vc
      JOIN users u ON vc.user_id = u.id
      WHERE vc.venue_id = $1
      ORDER BY vc.created_at DESC
      LIMIT $2 OFFSET $3
    `
    
    return this.query(sql, [venueId, limit, offset])
  }

  async createVibeCheck(data: {
    venue_id: string
    user_id: string
    crowd_level?: number
    music_volume?: number
    energy_level?: number
    wait_time?: number
    cover_charge?: number
    notes?: string
    image_url?: string
  }) {
    const sql = `
      INSERT INTO vibe_checks (
        venue_id, user_id, crowd_level, music_volume, energy_level,
        wait_time, cover_charge, notes, image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `
    
    const params = [
      data.venue_id,
      data.user_id,
      data.crowd_level || null,
      data.music_volume || null,
      data.energy_level || null,
      data.wait_time || null,
      data.cover_charge || null,
      data.notes || null,
      data.image_url || null
    ]
    
    return this.query(sql, params)
  }

  // User methods
  async getUserById(userId: string) {
    const sql = `
      SELECT u.*, 
             COUNT(DISTINCT vc.id) as total_vibe_checks,
             COUNT(DISTINCT r.id) as total_reviews
      FROM users u
      LEFT JOIN vibe_checks vc ON u.id = vc.user_id
      LEFT JOIN reviews r ON u.id = r.user_id
      WHERE u.id = $1 AND u.is_active = true
      GROUP BY u.id
    `
    
    return this.query(sql, [userId])
  }

  async updateUser(userId: string, data: {
    name?: string
    avatar_url?: string
    university?: string
    bio?: string
    preferences?: any
  }) {
    const fields = []
    const params = [userId]
    let paramIndex = 1

    if (data.name !== undefined) {
      fields.push(`name = $${++paramIndex}`)
      params.push(data.name)
    }
    
    if (data.avatar_url !== undefined) {
      fields.push(`avatar_url = $${++paramIndex}`)
      params.push(data.avatar_url)
    }
    
    if (data.university !== undefined) {
      fields.push(`university = $${++paramIndex}`)
      params.push(data.university)
    }
    
    if (data.bio !== undefined) {
      fields.push(`bio = $${++paramIndex}`)
      params.push(data.bio)
    }
    
    if (data.preferences !== undefined) {
      fields.push(`preferences = $${++paramIndex}`)
      params.push(JSON.stringify(data.preferences))
    }

    if (fields.length === 0) {
      throw new Error('No fields to update')
    }

    fields.push(`updated_at = NOW()`)

    const sql = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $1 AND is_active = true
      RETURNING *
    `
    
    return this.query(sql, params)
  }

  // Favorites methods
  async getUserFavorites(userId: string) {
    const sql = `
      SELECT v.*, uf.created_at as favorited_at
      FROM user_favorites uf
      JOIN venues v ON uf.venue_id = v.id
      WHERE uf.user_id = $1 AND v.is_active = true
      ORDER BY uf.created_at DESC
    `
    
    return this.query(sql, [userId])
  }

  async addFavorite(userId: string, venueId: string) {
    const sql = `
      INSERT INTO user_favorites (user_id, venue_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, venue_id) DO NOTHING
      RETURNING *
    `
    
    return this.query(sql, [userId, venueId])
  }

  async removeFavorite(userId: string, venueId: string) {
    const sql = `
      DELETE FROM user_favorites
      WHERE user_id = $1 AND venue_id = $2
      RETURNING *
    `
    
    return this.query(sql, [userId, venueId])
  }

  // Analytics methods
  async recordVenueView(venueId: string, isUnique: boolean = false) {
    const today = new Date().toISOString().split('T')[0]
    
    const sql = `
      INSERT INTO venue_analytics (venue_id, date, views, unique_views)
      VALUES ($1, $2, 1, $3)
      ON CONFLICT (venue_id, date) 
      DO UPDATE SET 
        views = venue_analytics.views + 1,
        unique_views = venue_analytics.unique_views + $3,
        updated_at = NOW()
    `
    
    return this.query(sql, [venueId, today, isUnique ? 1 : 0])
  }

  async recordCheckin(venueId: string, userId: string) {
    const operations: TransactionOperation[] = [
      {
        sql: `
          INSERT INTO user_checkins (user_id, venue_id)
          VALUES ($1, $2)
          RETURNING *
        `,
        params: [userId, venueId]
      },
      {
        sql: `
          INSERT INTO venue_analytics (venue_id, date, checkins)
          VALUES ($1, $2, 1)
          ON CONFLICT (venue_id, date) 
          DO UPDATE SET 
            checkins = venue_analytics.checkins + 1,
            updated_at = NOW()
        `,
        params: [venueId, new Date().toISOString().split('T')[0]]
      }
    ]
    
    return this.transaction(operations)
  }
}

// Export singleton instance
export const mobileDb = new MobileDatabaseService()

// Health check function for mobile
export const checkDatabaseHealth = () => mobileDb.checkHealth()