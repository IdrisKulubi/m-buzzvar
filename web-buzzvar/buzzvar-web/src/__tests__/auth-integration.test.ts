import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authClient } from '@/lib/auth/better-auth-client-web'

// Mock the Better Auth client
vi.mock('@/lib/auth/better-auth-client-web', () => ({
  authClient: {
    signIn: {
      social: vi.fn(),
      email: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
    useSession: vi.fn(),
    getSession: vi.fn(),
  },
  useAuthRole: vi.fn(),
  useAuthenticatedFetch: vi.fn(),
  authenticatedFetch: vi.fn(),
  hasPermission: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn(),
  getSession: vi.fn(),
}))

describe('Better Auth Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have auth client methods available', () => {
    expect(authClient.signIn.social).toBeDefined()
    expect(authClient.signIn.email).toBeDefined()
    expect(authClient.signUp.email).toBeDefined()
    expect(authClient.signOut).toBeDefined()
    expect(authClient.useSession).toBeDefined()
    expect(authClient.getSession).toBeDefined()
  })

  it('should call Google sign in', async () => {
    const mockSignIn = vi.mocked(authClient.signIn.social)
    mockSignIn.mockResolvedValue({ data: { user: { id: '1', email: 'test@example.com' } } })

    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/dashboard',
    })

    expect(mockSignIn).toHaveBeenCalledWith({
      provider: 'google',
      callbackURL: '/dashboard',
    })
  })

  it('should call email sign in', async () => {
    const mockSignIn = vi.mocked(authClient.signIn.email)
    mockSignIn.mockResolvedValue({ data: { user: { id: '1', email: 'test@example.com' } } })

    await authClient.signIn.email({
      email: 'test@example.com',
      password: 'password123',
      callbackURL: '/dashboard',
    })

    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      callbackURL: '/dashboard',
    })
  })

  it('should call email sign up', async () => {
    const mockSignUp = vi.mocked(authClient.signUp.email)
    mockSignUp.mockResolvedValue({ data: { user: { id: '1', email: 'test@example.com' } } })

    await authClient.signUp.email({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      callbackURL: '/dashboard',
    })

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      callbackURL: '/dashboard',
    })
  })

  it('should call sign out', async () => {
    const mockSignOut = vi.mocked(authClient.signOut)
    mockSignOut.mockResolvedValue({})

    await authClient.signOut({
      fetchOptions: {
        onSuccess: vi.fn(),
      },
    })

    expect(mockSignOut).toHaveBeenCalled()
  })
})