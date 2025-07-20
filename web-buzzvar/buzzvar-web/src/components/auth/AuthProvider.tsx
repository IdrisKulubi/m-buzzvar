'use client'

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { authClient, useSession } from '@/lib/auth/better-auth-client-web'

interface AuthContextType {
  user: any | null
  role: string | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  isVenueOwner: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>
  signOut: () => Promise<void>
  refetchRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()
  const [role, setRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)

  const fetchRole = async () => {
    if (session?.user && !isPending) {
      try {
        setRoleLoading(true)
        console.log("Fetching role for user:", session.user.email);
        const response = await fetch('/api/auth/role', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          console.log("Role API response:", data);
          setRole(data.role)
        } else {
          console.error("Role API error:", response.status);
          setRole('user') // Default role
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setRole('user') // Default role
      } finally {
        setRoleLoading(false)
      }
    } else if (!session?.user && !isPending) {
      setRole(null)
    }
  }

  useEffect(() => {
    fetchRole()
  }, [session, isPending])

  const signInWithGoogle = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    })
  }

  const signInWithEmail = async (email: string, password: string) => {
    await authClient.signIn.email({
      email,
      password,
      callbackURL: "/dashboard",
    })
  }

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    await authClient.signUp.email({
      email,
      password,
      name: name || email.split('@')[0],
      callbackURL: "/dashboard",
    })
  }

  const signOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          setRole(null)
          window.location.href = '/login'
        },
      },
    })
  }

  const refetchRole = async () => {
    await fetchRole()
  }

  const isAdmin = role === 'admin' || role === 'super_admin'
  const isVenueOwner = role === 'venue_owner' || role === 'admin' || role === 'super_admin'

  return (
    <AuthContext.Provider value={{
      user: session?.user || null,
      role,
      loading: isPending || roleLoading,
      isAuthenticated: !!session?.user,
      isAdmin,
      isVenueOwner,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      refetchRole,
    }}>
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