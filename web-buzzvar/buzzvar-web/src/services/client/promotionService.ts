'use client'

import { PromotionFormData, PromotionFilters } from '@/lib/types'

export interface PromotionWithStatus {
  id: string
  title: string
  description: string
  venue_id: string
  promotion_type: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  days_of_week?: string[]
  discount_percentage?: number
  discount_amount?: number
  max_uses?: number
  current_uses: number
  is_active: boolean
  created_at: string
  updated_at: string
  status: 'active' | 'inactive' | 'expired' | 'scheduled'
}

export class ClientPromotionService {
  private static baseUrl = '/api/promotions'

  static async getPromotions(filters?: PromotionFilters): Promise<PromotionWithStatus[]> {
    const params = new URLSearchParams()
    
    if (filters?.venue_id) params.append('venue_id', filters.venue_id)
    if (filters?.promotion_type) params.append('promotion_type', filters.promotion_type)
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())
    if (filters?.start_date) params.append('start_date', filters.start_date)
    if (filters?.end_date) params.append('end_date', filters.end_date)

    const response = await fetch(`${this.baseUrl}?${params}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch promotions: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data || []
  }

  static async getPromotionById(id: string): Promise<PromotionWithStatus | null> {
    const response = await fetch(`${this.baseUrl}/${id}`)
    
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Failed to fetch promotion: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  static async createPromotion(promotionData: PromotionFormData): Promise<PromotionWithStatus> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(promotionData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `Failed to create promotion: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  static async updatePromotion(id: string, promotionData: Partial<PromotionFormData>): Promise<PromotionWithStatus> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(promotionData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `Failed to update promotion: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data
  }

  static async deletePromotion(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `Failed to delete promotion: ${response.statusText}`)
    }
  }

  static getPromotionTemplates() {
    return [
      {
        id: 'happy-hour',
        name: 'Happy Hour',
        type: 'happy_hour',
        description: 'Classic happy hour promotion with discounted drinks',
        defaultData: {
          title: 'Happy Hour Special',
          description: 'Join us for discounted drinks and appetizers!',
          promotion_type: 'happy_hour',
          discount_percentage: 25,
          days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          start_time: '17:00',
          end_time: '19:00',
          is_active: true
        }
      },
      {
        id: 'student-night',
        name: 'Student Night',
        type: 'student_discount',
        description: 'Special discounts for students with valid ID',
        defaultData: {
          title: 'Student Night',
          description: 'Show your student ID for exclusive discounts!',
          promotion_type: 'student_discount',
          discount_percentage: 20,
          days_of_week: ['wednesday'],
          start_time: '20:00',
          end_time: '02:00',
          is_active: true
        }
      },
      {
        id: 'ladies-night',
        name: 'Ladies Night',
        type: 'ladies_night',
        description: 'Special offers for ladies',
        defaultData: {
          title: 'Ladies Night',
          description: 'Ladies enjoy special prices on selected drinks!',
          promotion_type: 'ladies_night',
          discount_percentage: 30,
          days_of_week: ['thursday'],
          start_time: '21:00',
          end_time: '01:00',
          is_active: true
        }
      },
      {
        id: 'weekend-special',
        name: 'Weekend Special',
        type: 'weekend_special',
        description: 'Weekend party promotions',
        defaultData: {
          title: 'Weekend Party Special',
          description: 'Weekend vibes with special offers!',
          promotion_type: 'weekend_special',
          discount_percentage: 15,
          days_of_week: ['friday', 'saturday'],
          start_time: '22:00',
          end_time: '03:00',
          is_active: true
        }
      },
      {
        id: 'live-music',
        name: 'Live Music Night',
        type: 'live_music',
        description: 'Special promotion for live music events',
        defaultData: {
          title: 'Live Music Night',
          description: 'Enjoy live music with special drink prices!',
          promotion_type: 'live_music',
          discount_percentage: 10,
          days_of_week: ['friday', 'saturday'],
          start_time: '20:00',
          end_time: '02:00',
          is_active: true
        }
      }
    ]
  }

  static calculatePromotionStatus(promotion: PromotionWithStatus): 'active' | 'inactive' | 'expired' | 'scheduled' {
    if (!promotion.is_active) return 'inactive'

    const now = new Date()
    const startDate = new Date(promotion.start_date)
    const endDate = new Date(promotion.end_date)

    if (now < startDate) return 'scheduled'
    if (now > endDate) return 'expired'
    return 'active'
  }
}