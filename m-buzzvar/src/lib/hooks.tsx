import React, { createContext, useContext, useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { standaloneAuth, type User, type Session } from '@/lib/auth/standalone-auth'

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
        console.log('🔵 Standalone Auth: Getting initial session...');
        const currentSession = standaloneAuth.getSession();
        const currentUser = standaloneAuth.getUser();
        
        if (isMounted) {
          console.log('🔵 Standalone Auth: Initial session loaded, user:', !!currentUser);
          setSession(currentSession);
          setUser(currentUser);
          setLoading(false);
        }
      } catch (error) {
        console.error('🔴 Standalone Auth: Exception getting initial session:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const unsubscribe = standaloneAuth.onAuthStateChange((authState) => {
      console.log('🔵 Standalone Auth: Auth state change, authenticated:', authState.isAuthenticated);
      
      if (isMounted) {
        setSession(authState.session);
        setUser(authState.user);
        setLoading(authState.loading);
        
        // Log user state changes for debugging
        if (!authState.isAuthenticated && !authState.loading) {
          console.log('🟢 Standalone Auth: User signed out successfully, clearing state');
        } else if (authState.isAuthenticated && authState.user) {
          console.log('🟢 Standalone Auth: User signed in:', authState.user.email);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [])

  const handleSignOut = async () => {
    try {
      console.log('🔵 useAuth: Starting sign out...');
      
      // Immediately clear local state for instant UI feedback
      setLoading(true);
      
      const { error } = await standaloneAuth.signOut();
      
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