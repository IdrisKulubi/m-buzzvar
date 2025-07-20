import { BaseService } from '../base-service'
import { venues, users, venueCategories, venueCategoryMappings, venueAnalytics } from '../schema'
import { eq, and, or, like, desc, asc, sql, inArray, count } from 'drizzle-orm'
import type { NewVenue, Venue, VenueAnalytics } from '../schema'

export interface VenueFormData {
  name: string
  slug: string
  description?: string
  address: string
  city: string
  state?: string
  country?: string
  postal_code?: string
  latitude: number
  longitude: number
  phone?: string
  email?: string
  website_url?: string
  social_media?: Record<string, any>
  hours?: Record<string, any>
  amenities?: string[]
  capacity?: number
  venue_type: string
  price_range?: number
  cover_image_url?: string
  cover_video_url?: string
  gallery_images?: string[]
  owner_id?: string
}

export interface VenueFilters {
  city?: string
  venue_type?: string
  price_range?: number
  is_verified?: boolean
  is_active?: boolean
  search?: string
}

export interface VenueWithAnalytics extends Venue {
  analytics?: VenueAnalytics
  distance?: number
}

export class VenueService extends BaseService {
  async getVenues(filters?: VenueFilters, limit: number = 50, offset: number = 0): Promise<VenueWithAnalytics[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()
      
      const conditions = [eq(venues.isActive, true)]
      
      if (filters?.city) {
        conditions.push(like(venues.city, `%${filters.city}%`))
      }
      
      if (filters?.venue_type) {
        conditions.push(eq(venues.venueType, filters.venue_type))
      }
      
      if (filters?.price_range) {
        conditions.push(eq(venues.priceRange, filters.price_range))
      }
      
      if (filters?.is_verified !== undefined) {
        conditions.push(eq(venues.isVerified, filters.is_verified))
      }
      
      if (filters?.search) {
        conditions.push(
          or(
            like(venues.name, `%${filters.search}%`),
            like(venues.description, `%${filters.search}%`),
            like(venues.address, `%${filters.search}%`)
          )
        )
      }

      const result = await db
        .select()
        .from(venues)
        .where(and(...conditions))
        .orderBy(desc(venues.createdAt))
        .limit(limit)
        .offset(offset)

      return result
    })
  }

  async getVenueById(venueId: string): Promise<VenueWithAnalytics | null> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .select()
        .from(venues)
        .where(eq(venues.id, venueId))
        .limit(1)

      return result.length > 0 ? result[0] : null
    })
  }

  async getVenueBySlug(slug: string): Promise<VenueWithAnalytics | null> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .select()
        .from(venues)
        .where(eq(venues.slug, slug))
        .limit(1)

      return result.length > 0 ? result[0] : null
    })
  }

  async createVenue(data: VenueFormData): Promise<Venue> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const venueData: NewVenue = {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        address: data.address,
        city: data.city,
        state: data.state || null,
        country: data.country || 'US',
        postalCode: data.postal_code || null,
        latitude: data.latitude.toString(),
        longitude: data.longitude.toString(),
        phone: data.phone || null,
        email: data.email || null,
        websiteUrl: data.website_url || null,
        socialMedia: data.social_media || {},
        hours: data.hours || {},
        amenities: data.amenities || [],
        capacity: data.capacity || null,
        venueType: data.venue_type,
        priceRange: data.price_range || null,
        coverImageUrl: data.cover_image_url || null,
        coverVideoUrl: data.cover_video_url || null,
        galleryImages: data.gallery_images || [],
        ownerId: data.owner_id || null,
        isVerified: false,
        isActive: true
      }

      const result = await db
        .insert(venues)
        .values(venueData)
        .returning()

      if (result.length === 0) {
        throw new Error('Failed to create venue')
      }

      return result[0]
    })
  }

  async updateVenue(venueId: string, data: Partial<VenueFormData>): Promise<Venue> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const updateData: Partial<NewVenue> = {
        updatedAt: new Date()
      }

      if (data.name) updateData.name = data.name
      if (data.slug) updateData.slug = data.slug
      if (data.description !== undefined) updateData.description = data.description || null
      if (data.address) updateData.address = data.address
      if (data.city) updateData.city = data.city
      if (data.state !== undefined) updateData.state = data.state || null
      if (data.country) updateData.country = data.country
      if (data.postal_code !== undefined) updateData.postalCode = data.postal_code || null
      if (data.latitude !== undefined) updateData.latitude = data.latitude.toString()
      if (data.longitude !== undefined) updateData.longitude = data.longitude.toString()
      if (data.phone !== undefined) updateData.phone = data.phone || null
      if (data.email !== undefined) updateData.email = data.email || null
      if (data.website_url !== undefined) updateData.websiteUrl = data.website_url || null
      if (data.social_media) updateData.socialMedia = data.social_media
      if (data.hours) updateData.hours = data.hours
      if (data.amenities) updateData.amenities = data.amenities
      if (data.capacity !== undefined) updateData.capacity = data.capacity || null
      if (data.venue_type) updateData.venueType = data.venue_type
      if (data.price_range !== undefined) updateData.priceRange = data.price_range || null
      if (data.cover_image_url !== undefined) updateData.coverImageUrl = data.cover_image_url || null
      if (data.cover_video_url !== undefined) updateData.coverVideoUrl = data.cover_video_url || null
      if (data.gallery_images) updateData.galleryImages = data.gallery_images

      const result = await db
        .update(venues)
        .set(updateData)
        .where(eq(venues.id, venueId))
        .returning()

      if (result.length === 0) {
        throw new Error('Venue not found or update failed')
      }

      return result[0]
    })
  }

  async deleteVenue(venueId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      // Soft delete by setting isActive to false
      const result = await db
        .update(venues)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(venues.id, venueId))
        .returning({ id: venues.id })

      if (result.length === 0) {
        throw new Error('Venue not found')
      }
    })
  }

  async getVenuesByOwner(ownerId: string): Promise<Venue[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .select()
        .from(venues)
        .where(and(
          eq(venues.ownerId, ownerId),
          eq(venues.isActive, true)
        ))
        .orderBy(desc(venues.createdAt))

      return result
    })
  }

  async searchVenuesNearby(
    latitude: number, 
    longitude: number, 
    radiusKm: number = 10,
    filters?: VenueFilters,
    limit: number = 50
  ): Promise<VenueWithAnalytics[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      // Using Haversine formula for distance calculation
      const distanceQuery = sql`
        (6371 * acos(
          cos(radians(${latitude})) * 
          cos(radians(CAST(${venues.latitude} AS FLOAT))) * 
          cos(radians(CAST(${venues.longitude} AS FLOAT)) - radians(${longitude})) + 
          sin(radians(${latitude})) * 
          sin(radians(CAST(${venues.latitude} AS FLOAT)))
        ))
      `

      const conditions = [
        eq(venues.isActive, true),
        sql`${distanceQuery} <= ${radiusKm}`
      ]

      if (filters?.venue_type) {
        conditions.push(eq(venues.venueType, filters.venue_type))
      }

      if (filters?.price_range) {
        conditions.push(eq(venues.priceRange, filters.price_range))
      }

      if (filters?.search) {
        conditions.push(
          or(
            like(venues.name, `%${filters.search}%`),
            like(venues.description, `%${filters.search}%`)
          )
        )
      }

      const result = await db
        .select({
          ...venues,
          distance: distanceQuery
        })
        .from(venues)
        .where(and(...conditions))
        .orderBy(distanceQuery)
        .limit(limit)

      return result.map(row => ({
        ...row,
        distance: parseFloat(row.distance as string)
      }))
    })
  }

  async getVenueAnalytics(venueId: string, days: number = 30): Promise<VenueAnalytics[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const result = await db
        .select()
        .from(venueAnalytics)
        .where(and(
          eq(venueAnalytics.venueId, venueId),
          sql`${venueAnalytics.date} >= ${startDate.toISOString().split('T')[0]}`
        ))
        .orderBy(desc(venueAnalytics.date))

      return result
    })
  }

  async incrementVenueView(venueId: string, isUnique: boolean = false): Promise<void> {
    return this.executeWithRetry(async () => {
      const db = this.db()
      const today = new Date().toISOString().split('T')[0]

      // Use upsert to increment or create analytics record
      await db
        .insert(venueAnalytics)
        .values({
          venueId,
          date: today,
          views: 1,
          uniqueViews: isUnique ? 1 : 0
        })
        .onConflictDoUpdate({
          target: [venueAnalytics.venueId, venueAnalytics.date],
          set: {
            views: sql`${venueAnalytics.views} + 1`,
            uniqueViews: isUnique ? sql`${venueAnalytics.uniqueViews} + 1` : venueAnalytics.uniqueViews,
            updatedAt: new Date()
          }
        })
    })
  }

  async getVenueStats(venueId: string): Promise<{
    totalViews: number
    totalCheckins: number
    totalVibeChecks: number
    totalReviews: number
    averageRating: number
  }> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      // Get analytics totals
      const analyticsResult = await db
        .select({
          totalViews: sql<number>`COALESCE(SUM(${venueAnalytics.views}), 0)`,
          totalCheckins: sql<number>`COALESCE(SUM(${venueAnalytics.checkins}), 0)`,
          totalVibeChecks: sql<number>`COALESCE(SUM(${venueAnalytics.vibeChecks}), 0)`,
          totalReviews: sql<number>`COALESCE(SUM(${venueAnalytics.reviews}), 0)`
        })
        .from(venueAnalytics)
        .where(eq(venueAnalytics.venueId, venueId))

      const stats = analyticsResult[0] || {
        totalViews: 0,
        totalCheckins: 0,
        totalVibeChecks: 0,
        totalReviews: 0
      }

      // Calculate average rating from reviews (would need reviews table)
      // For now, return 0 as placeholder
      return {
        ...stats,
        averageRating: 0
      }
    })
  }

  async toggleVenueVerification(venueId: string, isVerified: boolean): Promise<Venue> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .update(venues)
        .set({ 
          isVerified,
          updatedAt: new Date()
        })
        .where(eq(venues.id, venueId))
        .returning()

      if (result.length === 0) {
        throw new Error('Venue not found')
      }

      return result[0]
    })
  }

  async getVenueTypes(): Promise<string[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .selectDistinct({ venueType: venues.venueType })
        .from(venues)
        .where(eq(venues.isActive, true))

      return result.map(row => row.venueType)
    })
  }

  async getVenueCities(): Promise<string[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .selectDistinct({ city: venues.city })
        .from(venues)
        .where(eq(venues.isActive, true))
        .orderBy(asc(venues.city))

      return result.map(row => row.city)
    })
  }
}

// Export singleton instance
export const venueService = new VenueService()