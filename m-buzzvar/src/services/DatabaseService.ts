// Database service that replaces Supabase calls with direct database operations
import { mobileDb } from '../lib/database/mobile-database-service'

export class DatabaseService {
  // Venue methods
  static async getVenues(filters?: {
    city?: string
    venue_type?: string
    search?: string
    latitude?: number
    longitude?: number
    radius?: number
  }, limit: number = 50, offset: number = 0) {
    const result = await mobileDb.getVenues(filters, limit, offset)
    return result.data
  }

  static async getVenueById(venueId: string) {
    const result = await mobileDb.getVenueById(venueId)
    return result.data[0] || null
  }

  static async searchVenuesNearby(
    latitude: number,
    longitude: number,
    radius: number = 10,
    filters?: {
      city?: string
      venue_type?: string
      search?: string
    }
  ) {
    return this.getVenues({
      ...filters,
      latitude,
      longitude,
      radius
    })
  }

  // Vibe check methods
  static async getVibeChecks(venueId: string, limit: number = 20, offset: number = 0) {
    const result = await mobileDb.getVibeChecks(venueId, limit, offset)
    return result.data
  }

  static async createVibeCheck(data: {
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
    const result = await mobileDb.createVibeCheck(data)
    return result.data[0]
  }

  // User methods
  static async getUserById(userId: string) {
    const result = await mobileDb.getUserById(userId)
    return result.data[0] || null
  }

  static async updateUser(userId: string, data: {
    name?: string
    avatar_url?: string
    university?: string
    bio?: string
    preferences?: any
  }) {
    const result = await mobileDb.updateUser(userId, data)
    return result.data[0]
  }

  // Favorites methods
  static async getUserFavorites(userId: string) {
    const result = await mobileDb.getUserFavorites(userId)
    return result.data
  }

  static async addFavorite(userId: string, venueId: string) {
    const result = await mobileDb.addFavorite(userId, venueId)
    return result.data[0]
  }

  static async removeFavorite(userId: string, venueId: string) {
    const result = await mobileDb.removeFavorite(userId, venueId)
    return result.data[0]
  }

  static async isFavorite(userId: string, venueId: string): Promise<boolean> {
    const favorites = await this.getUserFavorites(userId)
    return favorites.some((fav: any) => fav.id === venueId)
  }

  // Analytics methods
  static async recordVenueView(venueId: string, isUnique: boolean = false) {
    await mobileDb.recordVenueView(venueId, isUnique)
  }

  static async recordCheckin(venueId: string, userId: string) {
    const result = await mobileDb.recordCheckin(venueId, userId)
    return result.results[0].data[0] // Return the checkin record
  }

  // Health check
  static async checkHealth() {
    return await mobileDb.checkHealth()
  }

  // Generic query method for custom queries
  static async query<T = any>(sql: string, params: any[] = []) {
    const result = await mobileDb.query<T>(sql, params)
    return result.data
  }

  // Transaction method for multiple operations
  static async transaction(operations: { sql: string; params?: any[] }[]) {
    const result = await mobileDb.transaction(operations)
    return result.results
  }
}

// Export as default for easy importing
export default DatabaseService