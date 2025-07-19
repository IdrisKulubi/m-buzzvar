'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { UserWithRole } from '@/lib/types'

export function useAuth() {
  const [user, setUser] = useState<UserWithRole | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserWithRole = useCallback(async () => {
    try {
      const response = await fetch('/api/auth')
      if (response.ok) {
        const { user } = await response.json()
        setUser(user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const supabase = createClient()
    
    // Get the current URL to determine the correct redirect
    const currentUrl = window.location.origin
    const redirectUrl = `${currentUrl}/api/auth/callback`
    
    console.log('Current URL:', currentUrl)
    console.log('Redirect URL:', redirectUrl)
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
        scopes: 'email profile',
      },
    })

    if (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      const response = await fetch('/api/auth', {
        method: 'DELETE',
      })

      if (response.ok) {
        setUser(null)
        // Redirect to login page
        window.location.href = '/login'
      } else {
        throw new Error('Failed to sign out')
      }
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    fetchUserWithRole()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchUserWithRole()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchUserWithRole])

  return { 
    user, 
    loading, 
    signInWithGoogle, 
    signOut,
    refetch: fetchUserWithRole
  }
}