import { createClient } from '@/lib/supabase'
import { Database, PromotionFormData, PromotionFilters } from '@/lib/types'

type Promotion = Database['public']['Tables']['promotions']['Row']
type PromotionInsert = Database['public']['Tables']['promotions']['Insert']
type PromotionUpdate = Database['public']['Tables']['promotions']['Update']

export interface PromotionWithStatus extends Promotion {
  status: 'active' | 'scheduled' | 'expired'
}

export class PromotionService {
  static async getVenuePromotions(venueId: string, filters?: PromotionFilters): Promise<PromotionWithStatus[]> {
    const supabase = createClient()
    
    let query = supabase
      .from('promotions')
      .select('*')
      .eq('venue_id', venueId)

    // Apply filters
    if (filters?.type) {
      query = query.eq('promotion_type', filters.type)
    }
    
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    if (filters?.start_date) {
      query = query.gte('start_date', filters.start_date)
    }

    if (filters?.end_date) {
      query = query.lte('end_date', filters.end_date)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch promotions: ${error.message}`)
    }

    // Add status to each promotion
    const now = new Date()
    return (data || []).map(promotion => ({
      ...promotion,
      status: this.getPromotionStatus(promotion, now)
    }))
  }

  static async createPromotion(venueId: string, data: PromotionFormData): Promise<Promotion> {
    const supabase = createClient()

    const promotionData: PromotionInsert = {
      venue_id: venueId,
      title: data.title,
      description: data.description,
      start_date: data.start_date,
      end_date: data.end_date,
      days_of_week: data.days_of_week,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      promotion_type: data.promotion_type,
      is_active: true
    }

    const { data: promotion, error } = await supabase
      .from('promotions')
      .insert(promotionData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create promotion: ${error.message}`)
    }

    return promotion
  }

  static async updatePromotion(promotionId: string, data: Partial<PromotionFormData>): Promise<Promotion> {
    const supabase = createClient()

    const updateData: PromotionUpdate = {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.start_date && { start_date: data.start_date }),
      ...(data.end_date && { end_date: data.end_date }),
      ...(data.days_of_week && { days_of_week: data.days_of_week }),
      ...(data.start_time !== undefined && { start_time: data.start_time || null }),
      ...(data.end_time !== undefined && { end_time: data.end_time || null }),
      ...(data.promotion_type && { promotion_type: data.promotion_type }),
      updated_at: new Date().toISOString()
    }

    const { data: promotion, error } = await supabase
      .from('promotions')
      .update(updateData)
      .eq('id', promotionId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update promotion: ${error.message}`)
    }

    return promotion
  }

  static async deletePromotion(promotionId: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', promotionId)

    if (error) {
      throw new Error(`Failed to delete promotion: ${error.message}`)
    }
  }

  static async togglePromotionStatus(promotionId: string, isActive: boolean): Promise<Promotion> {
    const supabase = createClient()

    const { data: promotion, error } = await supabase
      .from('promotions')
      .update({ 
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', promotionId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to toggle promotion status: ${error.message}`)
    }

    return promotion
  }

  static async bulkUpdatePromotions(promotionIds: string[], updates: Partial<PromotionUpdate>): Promise<Promotion[]> {
    const supabase = createClient()

    const { data: promotions, error } = await supabase
      .from('promotions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .in('id', promotionIds)
      .select()

    if (error) {
      throw new Error(`Failed to bulk update promotions: ${error.message}`)
    }

    return promotions || []
  }

  static async duplicatePromotion(promotionId: string): Promise<Promotion> {
    const supabase = createClient()

    // First get the original promotion
    const { data: original, error: fetchError } = await supabase
      .from('promotions')
      .select('*')
      .eq('id', promotionId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch original promotion: ${fetchError.message}`)
    }

    // Create a copy with modified title
    const duplicateData: PromotionInsert = {
      venue_id: original.venue_id,
      title: `${original.title} (Copy)`,
      description: original.description,
      start_date: original.start_date,
      end_date: original.end_date,
      days_of_week: original.days_of_week,
      start_time: original.start_time,
      end_time: original.end_time,
      promotion_type: original.promotion_type,
      image_url: original.image_url,
      is_active: false // Start as inactive
    }

    const { data: promotion, error } = await supabase
      .from('promotions')
      .insert(duplicateData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to duplicate promotion: ${error.message}`)
    }

    return promotion
  }

  static getPromotionStatus(promotion: Promotion, now: Date = new Date()): 'active' | 'scheduled' | 'expired' {
    const startDate = new Date(promotion.start_date)
    const endDate = new Date(promotion.end_date)

    if (!promotion.is_active) {
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

  static getPromotionTemplates() {
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