import React, { createContext, useContext } from 'react'
import { authClient, useAuthRole } from '@/lib/auth/better-auth-client-mobile'
import type { User } from 'better-auth/types'

// Auth context
interface AuthContextType {
  session: any | null
  user: User | null
  loading: boolean
  role: string | null
  isAdmin: boolean
  isVenueOwner: boolean
  isAuthenticated: boolean
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth Provider component using Better Auth
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const { role, user, isLoading, isAdmin, isVenueOwner, isAuthenticated } = useAuthRole()

  const handleSignOut = async () => {
    try {
      console.log('🔵 Better Auth: Starting sign out...')
      
      const result = await authClient.signOut()
      
      if (result.error) {
        console.error('🔴 Better Auth: Sign out error:', result.error)
        return { error: result.error }
      }
      
      console.log('🟢 Better Auth: Sign out successful')
      return { error: null }
    } catch (error) {
      console.error('🔴 Better Auth: Sign out failed:', error)
      return { error }
    }
  }

  const value = {
    session,
    user: user || session?.user || null,
    loading: isPending || isLoading,
    role,
    isAdmin,
    isVenueOwner,
    isAuthenticated,
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