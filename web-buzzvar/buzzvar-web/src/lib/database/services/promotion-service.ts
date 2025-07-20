import { BaseService } from '../base-service'
import { promotions, venues, users } from '../schema'
import { eq, and, gte, lte, desc, inArray, sql } from 'drizzle-orm'
import type { NewPromotion, Promotion } from '../schema'

export interface PromotionFormData {
  title: string
  description?: string
  promotion_type: string
  start_date: string
  end_date: string
  days_of_week?: number[]
  start_time?: string | null
  end_time?: string | null
  image_url?: string
  discount_percentage?: number
  discount_amount?: number
  minimum_spend?: number
  terms_conditions?: string
  max_redemptions?: number
}

export interface PromotionFilters {
  type?: string
  is_active?: boolean
  start_date?: string
  end_date?: string
}

export interface PromotionWithStatus extends Promotion {
  status: 'active' | 'scheduled' | 'expired'
}

export class PromotionService extends BaseService {
  async getVenuePromotions(venueId: string, filters?: PromotionFilters): Promise<PromotionWithStatus[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()
      
      let query = db
        .select()
        .from(promotions)
        .where(eq(promotions.venueId, venueId))

      // Apply filters
      const conditions = [eq(promotions.venueId, venueId)]
      
      if (filters?.type) {
        conditions.push(eq(promotions.promotionType, filters.type))
      }
      
      if (filters?.is_active !== undefined) {
        conditions.push(eq(promotions.isActive, filters.is_active))
      }

      if (filters?.start_date) {
        conditions.push(gte(promotions.startDate, new Date(filters.start_date)))
      }

      if (filters?.end_date) {
        conditions.push(lte(promotions.endDate, new Date(filters.end_date)))
      }

      const result = await db
        .select()
        .from(promotions)
        .where(and(...conditions))
        .orderBy(desc(promotions.createdAt))

      // Add status to each promotion
      const now = new Date()
      return result.map(promotion => ({
        ...promotion,
        status: this.getPromotionStatus(promotion, now)
      }))
    })
  }

  async createPromotion(venueId: string, data: PromotionFormData): Promise<Promotion> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const promotionData: NewPromotion = {
        venueId,
        title: data.title,
        description: data.description || null,
        promotionType: data.promotion_type,
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        daysOfWeek: data.days_of_week || [1,2,3,4,5,6,7],
        startTime: data.start_time || null,
        endTime: data.end_time || null,
        discountPercentage: data.discount_percentage || null,
        discountAmount: data.discount_amount ? data.discount_amount.toString() : null,
        minimumSpend: data.minimum_spend ? data.minimum_spend.toString() : null,
        termsConditions: data.terms_conditions || null,
        maxRedemptions: data.max_redemptions || null,
        imageUrl: data.image_url || null,
        isActive: true,
        currentRedemptions: 0
      }

      const result = await db
        .insert(promotions)
        .values(promotionData)
        .returning()

      if (result.length === 0) {
        throw new Error('Failed to create promotion')
      }

      return result[0]
    })
  }

  async updatePromotion(promotionId: string, data: Partial<PromotionFormData>): Promise<Promotion> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const updateData: Partial<NewPromotion> = {
        updatedAt: new Date()
      }

      if (data.title) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description || null
      if (data.promotion_type) updateData.promotionType = data.promotion_type
      if (data.start_date) updateData.startDate = new Date(data.start_date)
      if (data.end_date) updateData.endDate = new Date(data.end_date)
      if (data.days_of_week) updateData.daysOfWeek = data.days_of_week
      if (data.start_time !== undefined) updateData.startTime = data.start_time || null
      if (data.end_time !== undefined) updateData.endTime = data.end_time || null
      if (data.discount_percentage !== undefined) updateData.discountPercentage = data.discount_percentage || null
      if (data.discount_amount !== undefined) updateData.discountAmount = data.discount_amount ? data.discount_amount.toString() : null
      if (data.minimum_spend !== undefined) updateData.minimumSpend = data.minimum_spend ? data.minimum_spend.toString() : null
      if (data.terms_conditions !== undefined) updateData.termsConditions = data.terms_conditions || null
      if (data.max_redemptions !== undefined) updateData.maxRedemptions = data.max_redemptions || null
      if (data.image_url !== undefined) updateData.imageUrl = data.image_url || null

      const result = await db
        .update(promotions)
        .set(updateData)
        .where(eq(promotions.id, promotionId))
        .returning()

      if (result.length === 0) {
        throw new Error('Promotion not found or update failed')
      }

      return result[0]
    })
  }

  async deletePromotion(promotionId: string): Promise<void> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .delete(promotions)
        .where(eq(promotions.id, promotionId))
        .returning({ id: promotions.id })

      if (result.length === 0) {
        throw new Error('Promotion not found')
      }
    })
  }

  async togglePromotionStatus(promotionId: string, isActive: boolean): Promise<Promotion> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .update(promotions)
        .set({ 
          isActive,
          updatedAt: new Date()
        })
        .where(eq(promotions.id, promotionId))
        .returning()

      if (result.length === 0) {
        throw new Error('Promotion not found')
      }

      return result[0]
    })
  }

  async bulkUpdatePromotions(promotionIds: string[], updates: Partial<NewPromotion>): Promise<Promotion[]> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      const result = await db
        .update(promotions)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(inArray(promotions.id, promotionIds))
        .returning()

      return result
    })
  }

  async duplicatePromotion(promotionId: string): Promise<Promotion> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      // First get the original promotion
      const original = await db
        .select()
        .from(promotions)
        .where(eq(promotions.id, promotionId))
        .limit(1)

      if (original.length === 0) {
        throw new Error('Original promotion not found')
      }

      const originalPromotion = original[0]

      // Create a copy with modified title
      const duplicateData: NewPromotion = {
        venueId: originalPromotion.venueId,
        title: `${originalPromotion.title} (Copy)`,
        description: originalPromotion.description,
        promotionType: originalPromotion.promotionType,
        startDate: originalPromotion.startDate,
        endDate: originalPromotion.endDate,
        daysOfWeek: originalPromotion.daysOfWeek,
        startTime: originalPromotion.startTime,
        endTime: originalPromotion.endTime,
        discountPercentage: originalPromotion.discountPercentage,
        discountAmount: originalPromotion.discountAmount,
        minimumSpend: originalPromotion.minimumSpend,
        termsConditions: originalPromotion.termsConditions,
        maxRedemptions: originalPromotion.maxRedemptions,
        imageUrl: originalPromotion.imageUrl,
        isActive: false, // Start as inactive
        currentRedemptions: 0
      }

      const result = await db
        .insert(promotions)
        .values(duplicateData)
        .returning()

      if (result.length === 0) {
        throw new Error('Failed to duplicate promotion')
      }

      return result[0]
    })
  }

  getPromotionStatus(promotion: Promotion, now: Date = new Date()): 'active' | 'scheduled' | 'expired' {
    const startDate = new Date(promotion.startDate)
    const endDate = new Date(promotion.endDate)

    if (!promotion.isActive) {
      return 'expired'
    }

    if (now < startDate) {
      return 'scheduled'
    }

    if (now > endDate) {
      return 'expired'
    }

    return 'active'
  }

  async getUserVenues(userId: string): Promise<Array<{ id: string; name: string }>> {
    return this.executeWithRetry(async () => {
      const db = this.db()

      // Get venues owned by the user
      const result = await db
        .select({
          id: venues.id,
          name: venues.name
        })
        .from(venues)
        .where(eq(venues.ownerId, userId))
        .orderBy(venues.name)

      return result
    })
  }

  getPromotionTemplates() {
    return [
      {
        id: 'happy-hour',
        name: 'Happy Hour',
        type: 'happy_hour' as const,
        description: 'Discounted drinks during specific hours',
        defaultData: {
          title: 'Happy Hour Special',
          description: 'Join us for discounted drinks and great vibes!',
          promotion_type: 'happy_hour' as const,
          days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
          start_time: '17:00',
          end_time: '19:00'
        }
      },
      {
        id: 'weekend-event',
        name: 'Weekend Event',
        type: 'event' as const,
        description: 'Special weekend entertainment',
        defaultData: {
          title: 'Weekend Live Music',
          description: 'Live music and entertainment all weekend long!',
          promotion_type: 'event' as const,
          days_of_week: [5, 6], // Friday and Saturday
          start_time: '20:00',
          end_time: '02:00'
        }
      },
      {
        id: 'student-discount',
        name: 'Student Discount',
        type: 'discount' as const,
        description: 'Special pricing for students',
        defaultData: {
          title: 'Student Night',
          description: '20% off for all students with valid ID!',
          promotion_type: 'discount' as const,
          days_of_week: [3], // Wednesday
          start_time: '18:00',
          end_time: '23:00'
        }
      },
      {
        id: 'special-offer',
        name: 'Special Offer',
        type: 'special' as const,
        description: 'Limited time special promotion',
        defaultData: {
          title: 'Limited Time Special',
          description: 'Don\'t miss out on this exclusive offer!',
          promotion_type: 'special' as const,
          days_of_week: [0, 1, 2, 3, 4, 5, 6], // All days
        }
      }
    ]
  }
}

// Export singleton instance
export const promotionService = new PromotionService()