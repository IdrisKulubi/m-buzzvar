'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { UserWithRole } from '@/lib/types'

interface AuthContextType {
  user: UserWithRole | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

// Helper hooks for role checking
export function useIsAdmin() {
  const { user } = useAuthContext()
  return user?.role === 'admin'
}

export function useIsVenueOwner() {
  const { user } = useAuthContext()
  return user?.role === 'venue_owner'
}

export function useCanAccessVenue(venueId: string) {
  const { user } = useAuthContext()
  
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.role === 'venue_owner' && user.venues) {
    return user.venues.some(venue => venue.venue_id === venueId)
  }
  
  return false
}