import { authClient } from '@/lib/auth/better-auth-client-mobile'
import { apiClient } from '@/src/lib/api-client'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession()

export interface UserProfileData {
  id: string
  email: string
  name: string
  university?: string | null
  avatar_url?: string | null
}

// Sign in with Google OAuth using Better Auth
export async function signInWithGoogle() {
  try {
    console.log('🔵 Better Auth: Starting Google OAuth flow...')
    
    const result = await authClient.signIn.social({
      provider: 'google',
      callbackURL: 'buzzvar://(tabs)', // Proper deep link format
    })
    
    if (result.error) {
      console.error('🔴 Better Auth: Google OAuth error:', result.error)
      throw result.error
    }

    console.log('🟢 Better Auth: Google OAuth successful')
    return { data: result.data, error: null }
  } catch (error) {
    console.error('🔴 Better Auth: Google OAuth failed:', error)
    return { data: null, error }
  }
}

// Sign in with email/password using Better Auth
export async function signIn({ email, password }: { email: string; password: string }) {
  try {
    console.log('🔵 Better Auth: Starting email sign in...')
    
    const result = await authClient.signIn.email({
      email,
      password,
    })
    
    if (result.error) {
      console.error('🔴 Better Auth: Email sign in error:', result.error)
      throw result.error
    }

    console.log('🟢 Better Auth: Email sign in successful')
    return { data: result.data, error: null }
  } catch (error) {
    console.error('🔴 Better Auth: Email sign in failed:', error)
    return { data: null, error }
  }
}

// Sign up with email/password using Better Auth
export async function signUp({ email, password, name }: { email: string; password: string; name: string }) {
  try {
    console.log('🔵 Better Auth: Starting email sign up...')
    
    const result = await authClient.signUp.email({
      email,
      password,
      name,
    })
    
    if (result.error) {
      console.error('🔴 Better Auth: Email sign up error:', result.error)
      throw result.error
    }

    console.log('🟢 Better Auth: Email sign up successful')
    return { data: result.data, error: null }
  } catch (error) {
    console.error('🔴 Better Auth: Email sign up failed:', error)
    return { data: null, error }
  }
}

// Create user profile using authenticated fetch
export async function createUserProfile(profileData: UserProfileData) {
  try {
    console.log('🔵 Better Auth: Creating user profile...')
    
    const data = await apiClient.post('/api/user/profile', profileData)
    console.log('🟢 Better Auth: User profile created successfully')
    return { data, error: null }
  } catch (error) {
    console.error('🔴 Better Auth: Create profile failed:', error)
    return { data: null, error }
  }
}

// Check if user has profile
export async function checkUserProfile(userId: string) {
  try {
    console.log('🔵 Better Auth: Checking user profile...')
    
    await apiClient.get(`/api/user/profile/${userId}`)
    console.log('🟢 Better Auth: User profile check successful')
    return { hasProfile: true, error: null }
  } catch (error: any) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      // Profile doesn't exist
      return { hasProfile: false, error: null }
    }
    console.error('🔴 Better Auth: Check profile failed:', error)
    return { hasProfile: false, error }
  }
}

// Get current user profile
export async function getUserProfile(userId: string) {
  try {
    console.log('🔵 Better Auth: Getting user profile...')
    
    const data = await apiClient.get(`/api/user/profile/${userId}`)
    console.log('🟢 Better Auth: User profile retrieved successfully')
    return { data, error: null }
  } catch (error) {
    console.error('🔴 Better Auth: Get profile failed:', error)
    return { data: null, error }
  }
}

// Update user profile
export async function updateUserProfile(userId: string, updates: Partial<Pick<UserProfileData, 'name' | 'university' | 'avatar_url'>>) {
  try {
    console.log('🔵 Better Auth: Updating user profile...')
    
    const data = await apiClient.patch(`/api/user/profile/${userId}`, updates)
    console.log('🟢 Better Auth: User profile updated successfully')
    return { data, error: null }
  } catch (error) {
    console.error('🔴 Better Auth: Update profile failed:', error)
    return { data: null, error }
  }
}

// Reset password
export async function resetPassword(email: string) {
  try {
    console.log('🔵 Better Auth: Requesting password reset...')
    
    // Use fetch directly for password reset as it doesn't require authentication
    const baseUrl = process.env.EXPO_PUBLIC_AUTH_URL || "http://localhost:3000"
    const response = await fetch(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to reset password')
    }

    console.log('🟢 Better Auth: Password reset email sent')
    return { error: null }
  } catch (error) {
    console.error('🔴 Better Auth: Password reset failed:', error)
    return { error }
  }
}

// Sign out
export async function signOut() {
  try {
    console.log('🔵 Better Auth: Starting sign out process...')
    
    const result = await authClient.signOut()
    
    if (result.error) {
      console.error('🔴 Better Auth: Sign out error:', result.error)
      throw result.error
    }
    
    console.log('🟢 Better Auth: Sign out successful')
    return { error: null }
  } catch (error) {
    console.error('🔴 Better Auth: Sign out failed:', error)
    return { error }
  }
}

// Handle OAuth redirect/deep link
export function handleOAuthRedirect(url: string) {
  console.log('🔵 Better Auth: Handling OAuth redirect:', url)
  return authClient.handleOAuthRedirect?.(url)
}

// Handle deep linking for OAuth callbacks
export function setupDeepLinking() {
  const handleDeepLink = (url: string) => {
    console.log('🔵 Better Auth: Deep link received:', url)
    
    // Better Auth Expo plugin handles OAuth redirects automatically
    // We just need to log for debugging
    if (url.includes('auth') || url.includes('oauth')) {
      console.log('🔵 Better Auth: OAuth-related deep link detected')
    }
  }

  // Listen for deep links
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url)
  })

  // Handle initial URL if app was opened via deep link
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink(url)
    }
  })

  return () => {
    subscription?.remove()
  }
}