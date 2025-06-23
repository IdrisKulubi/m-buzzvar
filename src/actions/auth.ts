import { supabase } from '../lib/supabase'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession()

export interface UserProfileData {
  id: string
  email: string
  name: string
  university?: string | null
  avatar_url?: string | null
}

// Sign in with Google OAuth
export async function signInWithGoogle() {
  try {
    const redirectUrl = AuthSession.makeRedirectUri({
      useProxy: true,
    })

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) throw error

    // Open the OAuth URL
    if (data.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      )

      if (result.type === 'success') {
        // Handle the redirect URL
        const { url } = result
        const parsedUrl = new URL(url)
        const accessToken = parsedUrl.searchParams.get('access_token')
        const refreshToken = parsedUrl.searchParams.get('refresh_token')

        if (accessToken && refreshToken) {
          // Set the session with the tokens
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) throw sessionError
          return { data: sessionData, error: null }
        }
      }
    }

    return { data: null, error: new Error('OAuth flow was cancelled or failed') }
  } catch (error) {
    return { data: null, error }
  }
}

// Create user profile
export async function createUserProfile(profileData: UserProfileData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: profileData.id,
        email: profileData.email,
        name: profileData.name,
        university: profileData.university,
        avatar_url: profileData.avatar_url,
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Check if user has profile
export async function checkUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist
      return { hasProfile: false, error: null }
    }

    if (error) throw error
    return { hasProfile: true, error: null }
  } catch (error) {
    return { hasProfile: false, error }
  }
}

// Get current user profile
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Sign out
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error }
  }
} 