import { useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import * as Location from 'expo-location'
import { supabase } from './supabase'

// Auth hook
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    session,
    user,
    loading,
    signOut: () => supabase.auth.signOut(),
  }
}

// Location hook
export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied')
          setLoading(false)
          return
        }

        const location = await Location.getCurrentPositionAsync({})
        setLocation(location)
      } catch (error) {
        setErrorMsg('Error getting location')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const refreshLocation = async () => {
    try {
      setLoading(true)
      const location = await Location.getCurrentPositionAsync({})
      setLocation(location)
    } catch (error) {
      setErrorMsg('Error refreshing location')
    } finally {
      setLoading(false)
    }
  }

  return {
    location,
    errorMsg,
    loading,
    refreshLocation,
  }
}

// Custom hook for debouncing values
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
} 