import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PromotionService } from '@/services/promotionService'
import { createClient } from '@/lib/supabase'

// Mock Supabase client
vi.mock('@/lib/supabase')

const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
}

const mockPromotion = {
  id: '1',
  venue_id: 'venue-1',
  title: 'Happy Hour Special',
  description: 'Great drinks at great prices',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  days_of_week: [1, 2, 3, 4, 5],
  start_time: '17:00',
  end_time: '19:00',
  promotion_type: 'happy_hour',
  image_url: null,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

describe('PromotionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any)
    
    // Reset all mock implementations
    Object.values(mockSupabaseClient).forEach(mock => {
      if (typeof mock === 'function') {
        mock.mockReturnThis()
      }
    })
  })

  describe('getVenuePromotions', () => {
    it('fetches promotions for a venue', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [mockPromotion],
        error: null
      })

      const result = await PromotionService.getVenuePromotions('venue-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('promotions')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('venue_id', 'venue-1')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject(mockPromotion)
      expect(result[0].status).toBeDefined()
    })

    it('applies filters correctly', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [mockPromotion],
        error: null
      })

      const filters = {
        type: 'happy_hour' as const,
        is_active: true,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      }

      await PromotionService.getVenuePromotions('venue-1', filters)

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('promotion_type', 'happy_hour')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_active', true)
      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('start_date', '2024-01-01')
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('end_date', '2024-01-31')
    })

    it('throws error when database query fails', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(PromotionService.getVenuePromotions('venue-1'))
        .rejects.toThrow('Failed to fetch promotions: Database error')
    })
  })

  describe('createPromotion', () => {
    it('creates a new promotion', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockPromotion,
        error: null
      })

      const formData = {
        title: 'Happy Hour Special',
        description: 'Great drinks at great prices',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        days_of_week: [1, 2, 3, 4, 5],
        start_time: '17:00',
        end_time: '19:00',
        promotion_type: 'happy_hour' as const
      }

      const result = await PromotionService.createPromotion('venue-1', formData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('promotions')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        venue_id: 'venue-1',
        title: formData.title,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days_of_week: formData.days_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        promotion_type: formData.promotion_type,
        is_active: true
      })
      expect(result).toEqual(mockPromotion)
    })

    it('throws error when creation fails', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Creation failed' }
      })

      const formData = {
        title: 'Test',
        description: 'Test',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        days_of_week: [1],
        promotion_type: 'discount' as const
      }

      await expect(PromotionService.createPromotion('venue-1', formData))
        .rejects.toThrow('Failed to create promotion: Creation failed')
    })
  })

  describe('updatePromotion', () => {
    it('updates an existing promotion', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...mockPromotion, title: 'Updated Title' },
        error: null
      })

      const result = await PromotionService.updatePromotion('1', { title: 'Updated Title' })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('promotions')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        title: 'Updated Title',
        updated_at: expect.any(String)
      })
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', '1')
      expect(result.title).toBe('Updated Title')
    })

    it('throws error when update fails', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      })

      await expect(PromotionService.updatePromotion('1', { title: 'Updated' }))
        .rejects.toThrow('Failed to update promotion: Update failed')
    })
  })

  describe('deletePromotion', () => {
    it('deletes a promotion', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        error: null
      })

      await PromotionService.deletePromotion('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('promotions')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', '1')
    })

    it('throws error when deletion fails', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        error: { message: 'Deletion failed' }
      })

      await expect(PromotionService.deletePromotion('1'))
        .rejects.toThrow('Failed to delete promotion: Deletion failed')
    })
  })

  describe('togglePromotionStatus', () => {
    it('toggles promotion active status', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { ...mockPromotion, is_active: false },
        error: null
      })

      const result = await PromotionService.togglePromotionStatus('1', false)

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        is_active: false,
        updated_at: expect.any(String)
      })
      expect(result.is_active).toBe(false)
    })
  })

  describe('bulkUpdatePromotions', () => {
    it('updates multiple promotions', async () => {
      mockSupabaseClient.select.mockResolvedValue({
        data: [mockPromotion],
        error: null
      })

      const result = await PromotionService.bulkUpdatePromotions(['1', '2'], { is_active: false })

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        is_active: false,
        updated_at: expect.any(String)
      })
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('id', ['1', '2'])
      expect(result).toEqual([mockPromotion])
    })
  })

  describe('duplicatePromotion', () => {
    it('duplicates an existing promotion', async () => {
      // Mock the fetch of original promotion
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: mockPromotion,
          error: null
        })
        // Mock the creation of duplicate
        .mockResolvedValueOnce({
          data: { ...mockPromotion, id: '2', title: 'Happy Hour Special (Copy)', is_active: false },
          error: null
        })

      const result = await PromotionService.duplicatePromotion('1')

      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        venue_id: mockPromotion.venue_id,
        title: 'Happy Hour Special (Copy)',
        description: mockPromotion.description,
        start_date: mockPromotion.start_date,
        end_date: mockPromotion.end_date,
        days_of_week: mockPromotion.days_of_week,
        start_time: mockPromotion.start_time,
        end_time: mockPromotion.end_time,
        promotion_type: mockPromotion.promotion_type,
        image_url: mockPromotion.image_url,
        is_active: false
      })
      expect(result.title).toBe('Happy Hour Special (Copy)')
      expect(result.is_active).toBe(false)
    })
  })

  describe('getPromotionStatus', () => {
    it('returns active for current promotions', () => {
      const promotion = {
        ...mockPromotion,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        is_active: true
      }
      const now = new Date('2024-06-15')

      const status = PromotionService.getPromotionStatus(promotion, now)
      expect(status).toBe('active')
    })

    it('returns scheduled for future promotions', () => {
      const promotion = {
        ...mockPromotion,
        start_date: '2024-12-01',
        end_date: '2024-12-31',
        is_active: true
      }
      const now = new Date('2024-06-15')

      const status = PromotionService.getPromotionStatus(promotion, now)
      expect(status).toBe('scheduled')
    })

    it('returns expired for past promotions', () => {
      const promotion = {
        ...mockPromotion,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        is_active: true
      }
      const now = new Date('2024-06-15')

      const status = PromotionService.getPromotionStatus(promotion, now)
      expect(status).toBe('expired')
    })

    it('returns expired for inactive promotions', () => {
      const promotion = {
        ...mockPromotion,
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        is_active: false
      }
      const now = new Date('2024-06-15')

      const status = PromotionService.getPromotionStatus(promotion, now)
      expect(status).toBe('expired')
    })
  })

  describe('getPromotionTemplates', () => {
    it('returns predefined promotion templates', () => {
      const templates = PromotionService.getPromotionTemplates()

      expect(templates).toHaveLength(4)
      expect(templates[0].id).toBe('happy-hour')
      expect(templates[0].name).toBe('Happy Hour')
      expect(templates[0].type).toBe('happy_hour')
      expect(templates[0].defaultData).toBeDefined()
    })

    it('includes all required template types', () => {
      const templates = PromotionService.getPromotionTemplates()
      const types = templates.map(t => t.type)

      expect(types).toContain('happy_hour')
      expect(types).toContain('event')
      expect(types).toContain('discount')
      expect(types).toContain('special')
    })
  })
})