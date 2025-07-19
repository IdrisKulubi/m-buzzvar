import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUserRole, isAdmin, isVenueOwner, canAccessVenue } from '@/lib/auth'
import { UserWithRole } from '@/lib/types'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }))
}))

describe('Authentication Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    process.env.ADMIN_EMAILS = 'admin@test.com,admin2@test.com'
  })

  describe('getUserRole', () => {
    it('should return admin role for admin emails', async () => {
      const result = await getUserRole('user-id', 'admin@test.com')
      
      expect(result.role).toBe('admin')
      expect(result.email).toBe('admin@test.com')
    })

    it('should return user role for non-admin emails with no venues', async () => {
      const { createServerSupabaseClient } = await import('@/lib/supabase')
      const mockSupabase = createServerSupabaseClient as any
      
      mockSupabase.mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      })

      const result = await getUserRole('user-id', 'user@test.com')
      
      expect(result.role).toBe('user')
      expect(result.email).toBe('user@test.com')
    })
  })

  describe('Role checking functions', () => {
    it('should correctly identify admin users', () => {
      const adminUser: UserWithRole = {
        id: '1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'admin'
      }

      expect(isAdmin(adminUser)).toBe(true)
    })

    it('should correctly identify venue owners', () => {
      const venueOwner: UserWithRole = {
        id: '1',
        email: 'owner@test.com',
        name: 'Owner',
        role: 'venue_owner',
        venues: [{
          id: '1',
          venue_id: 'venue-1',
          role: 'owner',
          venue: {} as any
        }]
      }

      expect(isVenueOwner(venueOwner)).toBe(true)
    })

    it('should allow admin access to any venue', () => {
      const adminUser: UserWithRole = {
        id: '1',
        email: 'admin@test.com',
        name: 'Admin',
        role: 'admin'
      }

      expect(canAccessVenue(adminUser, 'any-venue-id')).toBe(true)
    })

    it('should allow venue owner access to their venues', () => {
      const venueOwner: UserWithRole = {
        id: '1',
        email: 'owner@test.com',
        name: 'Owner',
        role: 'venue_owner',
        venues: [{
          id: '1',
          venue_id: 'venue-1',
          role: 'owner',
          venue: {} as any
        }]
      }

      expect(canAccessVenue(venueOwner, 'venue-1')).toBe(true)
      expect(canAccessVenue(venueOwner, 'venue-2')).toBe(false)
    })

    it('should deny regular user access to venues', () => {
      const regularUser: UserWithRole = {
        id: '1',
        email: 'user@test.com',
        name: 'User',
        role: 'user'
      }

      expect(canAccessVenue(regularUser, 'venue-1')).toBe(false)
    })
  })
})