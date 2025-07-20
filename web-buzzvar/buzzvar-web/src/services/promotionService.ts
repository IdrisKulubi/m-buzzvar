import { promotionService, type PromotionFormData, type PromotionFilters, type PromotionWithStatus } from '@/lib/database/services'
import type { Promotion } from '@/lib/database/schema'

export class PromotionService {
  static async getVenuePromotions(venueId: string, filters?: PromotionFilters): Promise<PromotionWithStatus[]> {
    return await promotionService.getVenuePromotions(venueId, filters)
  }

  static async createPromotion(venueId: string, data: PromotionFormData): Promise<Promotion> {
    return await promotionService.createPromotion(venueId, data)
  }

  static async updatePromotion(promotionId: string, data: Partial<PromotionFormData>): Promise<Promotion> {
    return await promotionService.updatePromotion(promotionId, data)
  }

  static async deletePromotion(promotionId: string): Promise<void> {
    return await promotionService.deletePromotion(promotionId)
  }

  static async togglePromotionStatus(promotionId: string, isActive: boolean): Promise<Promotion> {
    return await promotionService.togglePromotionStatus(promotionId, isActive)
  }

  static async bulkUpdatePromotions(promotionIds: string[], updates: any): Promise<Promotion[]> {
    return await promotionService.bulkUpdatePromotions(promotionIds, updates)
  }

  static async duplicatePromotion(promotionId: string): Promise<Promotion> {
    return await promotionService.duplicatePromotion(promotionId)
  }

  static getPromotionStatus(promotion: Promotion, now: Date = new Date()): 'active' | 'scheduled' | 'expired' {
    return promotionService.getPromotionStatus(promotion, now)
  }

  static getPromotionTemplates() {
    return promotionService.getPromotionTemplates()
  }
}