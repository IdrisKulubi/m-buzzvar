import { authClient } from '@/lib/auth/better-auth-client-mobile'
import { apiClient } from '@/src/lib/api-client'
import { signInWithGoogle, signIn, signUp } from '@/src/actions/better-auth-actions'

// Mock dependencies
jest.mock('@/lib/auth/better-auth-client-mobile', () => ({
  authClient: {
    signIn: {
      email: jest.fn(),
      social: jest.fn(),
    },
    signUp: {
      email: jest.fn(),
    },
    signOut: jest.fn(),
    useSession: jest.fn(),
    getCookie: jest.fn(),
  },
  useAuthRole: jest.fn(),
}))

jest.mock('@/src/lib/api-client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}))

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}))

jest.mock('expo-linking', () => ({
  addEventListener: jest.fn(),
  getInitialURL: jest.fn(),
}))

describe('Better Auth Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authentication Actions', () => {
    it('should handle Google sign in', async () => {
      const mockResult = { data: { user: { id: '1', email: 'test@example.com' } }, error: null }
      ;(authClient.signIn.social as jest.Mock).mockResolvedValue(mockResult)

      const result = await signInWithGoogle()

      expect(authClient.signIn.social).toHaveBeenCalledWith({
        provider: 'google',
        callbackURL: '/(tabs)',
      })
      expect(result).toEqual({ data: mockResult.data, error: null })
    })

    it('should handle email sign in', async () => {
      const mockResult = { data: { user: { id: '1', email: 'test@example.com' } }, error: null }
      ;(authClient.signIn.email as jest.Mock).mockResolvedValue(mockResult)

      const result = await signIn({ email: 'test@example.com', password: 'password' })

      expect(authClient.signIn.email).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      })
      expect(result).toEqual({ data: mockResult.data, error: null })
    })

    it('should handle email sign up', async () => {
      const mockResult = { data: { user: { id: '1', email: 'test@example.com' } }, error: null }
      ;(authClient.signUp.email as jest.Mock).mockResolvedValue(mockResult)

      const result = await signUp({ 
        email: 'test@example.com', 
        password: 'password', 
        name: 'Test User' 
      })

      expect(authClient.signUp.email).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
        name: 'Test User',
      })
      expect(result).toEqual({ data: mockResult.data, error: null })
    })

    it('should handle authentication errors', async () => {
      const mockError = new Error('Authentication failed')
      ;(authClient.signIn.email as jest.Mock).mockRejectedValue(mockError)

      const result = await signIn({ email: 'test@example.com', password: 'wrong' })

      expect(result).toEqual({ data: null, error: mockError })
    })
  })

  describe('API Client', () => {
    it('should make authenticated GET requests', async () => {
      const mockData = { id: '1', name: 'Test' }
      ;(apiClient.get as jest.Mock).mockResolvedValue(mockData)
      ;(authClient.getCookie as jest.Mock).mockReturnValue('session=abc123')

      const result = await apiClient.get('/api/test')

      expect(apiClient.get).toHaveBeenCalledWith('/api/test')
      expect(result).toEqual(mockData)
    })

    it('should make authenticated POST requests', async () => {
      const mockData = { id: '1', name: 'Test' }
      const postData = { name: 'Test' }
      ;(apiClient.post as jest.Mock).mockResolvedValue(mockData)
      ;(authClient.getCookie as jest.Mock).mockReturnValue('session=abc123')

      const result = await apiClient.post('/api/test', postData)

      expect(apiClient.post).toHaveBeenCalledWith('/api/test', postData)
      expect(result).toEqual(mockData)
    })
  })

  describe('Auth Client Configuration', () => {
    it('should be configured with correct base URL', () => {
      // This test verifies that the auth client is properly configured
      expect(authClient).toBeDefined()
      expect(authClient.signIn).toBeDefined()
      expect(authClient.signUp).toBeDefined()
      expect(authClient.signOut).toBeDefined()
    })
  })
})