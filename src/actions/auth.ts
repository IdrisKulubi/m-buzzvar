import { supabase } from '../lib/supabase'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession()

export interface SignUpData {
  email: string
  password: string
  name?: string
  university?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface UpdateProfileData {
  name?: string
  university?: string
  avatar_url?: string
}

// Sign up new user
export async function signUp({ email, password, name, university }: SignUpData) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          university,
        },
      },
    })

    if (error) throw error

    // Create user profile in users table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: data.user.email!,
            name: name || null,
            university: university || null,
          },
        ])

      if (profileError) {
        // If profile creation fails, it might be because the user already exists
        // This can happen with OAuth users, so we'll update instead
        const { error: updateError } = await supabase
          .from('users')
          .upsert([
            {
              id: data.user.id,
              email: data.user.email!,
              name: name || data.user.user_metadata?.name || null,
              university: university || null,
            },
          ])
        
        if (updateError) throw updateError
      }
    }

    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Sign in existing user
export async function signIn({ email, password }: SignInData) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
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

          // Create or update user profile
          if (sessionData.user) {
            await createOrUpdateUserProfile(sessionData.user)
          }

          return { data: sessionData, error: null }
        }
      }
    }

    return { data: null, error: new Error('OAuth flow was cancelled or failed') }
  } catch (error) {
    return { data: null, error }
  }
}

// Create or update user profile after OAuth
async function createOrUpdateUserProfile(user: any) {
  try {
    const { error } = await supabase
      .from('users')
      .upsert([
        {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        },
      ])

    if (error) throw error
  } catch (error) {
    console.error('Error creating/updating user profile:', error)
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

// Update user profile
export async function updateUserProfile(userId: string, updates: UpdateProfileData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
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

// Reset password
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Platform.select({
        web: `${window?.location?.origin}/auth/reset-password`,
        default: 'buzzvar://auth/reset-password',
      }),
    })
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error }
  }
}

// Check if user exists
export async function checkUserExists(email: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    return { exists: !!data, error: null }
  } catch (error) {
    return { exists: false, error }
  }
} 