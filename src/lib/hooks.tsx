import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import * as Location from 'expo-location'
import { supabase } from './supabase'

// Auth context
interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔵 Auth: Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('🔴 Auth: Error getting initial session:', error);
        }
        
        if (isMounted) {
          console.log('🔵 Auth: Initial session loaded, user:', !!session?.user);
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('🔴 Auth: Exception getting initial session:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔵 Auth: Auth state change -', event, 'session:', !!session);
      
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Log user state changes for debugging
        if (event === 'SIGNED_OUT') {
          console.log('🟢 Auth: User signed out successfully, clearing state');
          console.log('🔵 Auth: Auth state change should trigger navigation to login');
        } else if (event === 'SIGNED_IN') {
          console.log('🟢 Auth: User signed in:', session?.user?.email);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔵 Auth: Token refreshed for:', session?.user?.email);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [])

  const handleSignOut = async () => {
    try {
      console.log('🔵 useAuth: Starting sign out...');
      
      // Immediately clear local state for instant UI feedback
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('🔴 useAuth: Sign out error:', error);
        // Reset loading state on error
        setLoading(false);
        throw error;
      }
      
      // Clear local state immediately (auth state change will also trigger)
      console.log('🟢 useAuth: Sign out successful, clearing local state');
      setSession(null);
      setUser(null);
      setLoading(false);
      
      return { error: null };
    } catch (error) {
      console.error('🔴 useAuth: Sign out failed:', error);
      setLoading(false);
      return { error };
    }
  };

  const value = {
    session,
    user,
    loading,
    signOut: handleSignOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Auth hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
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