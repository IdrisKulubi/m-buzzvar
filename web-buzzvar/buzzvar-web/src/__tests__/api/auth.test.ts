import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, DELETE } from '@/app/api/auth/route'
import { NextRequest } from 'next/server'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn()
}))

vi.mock('@/lib/auth', () => ({
  getUserRole: vi.fn()
}))

describe('/api/auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/auth', () => {
    it('should return user data when authenticated', async () => {
      const { createServerSupabaseClient } = await import('@/lib/supabase')
      const { getUserRole } = await import('@/lib/auth')
      
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                user: {
                  id: 'user-id',
                  email: 'test@example.com'
                }
              }
            },
            error: null
          })
        },
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { name: 'Test User', university: 'Test University' }
              })
            }))
          }))
        }))
      }

      ;(createServerSupabaseClient as any).mockResolvedValue(mockSupabase)
      ;(getUserRole as any).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        role: 'user'
      })

      const request = new NextRequest('http://localhost:3000/api/auth')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('test@example.com')
    })

    it('should return 401 when not authenticated', async () => {
      const { createServerSupabaseClient } = await import('@/lib/supabase')
      
      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null
          })
        }
      }

      ;(createServerSupabaseClient as any).mockResolvedValue(mockSupabase)

      const request = new NextRequest('http://localhost:3000/api/auth')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.user).toBeNull()
    })
  })

  describe('DELETE /api/auth', () => {
    it('should sign out user successfully', async () => {
      const { createServerSupabaseClient } = await import('@/lib/supabase')
      
      const mockSupabase = {
        auth: {
          signOut: vi.fn().mockResolvedValue({ error: null })
        }
      }

      ;(createServerSupabaseClient as any).mockResolvedValue(mockSupabase)

      const request = new NextRequest('http://localhost:3000/api/auth')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Signed out successfully')
    })

    it('should handle sign out errors', async () => {
      const { createServerSupabaseClient } = await import('@/lib/supabase')
      
      const mockSupabase = {
        auth: {
          signOut: vi.fn().mockResolvedValue({ 
            error: { message: 'Sign out failed' } 
          })
        }
      }

      ;(createServerSupabaseClient as any).mockResolvedValue(mockSupabase)

      const request = new NextRequest('http://localhost:3000/api/auth')
      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Sign out failed')
    })
  })
})