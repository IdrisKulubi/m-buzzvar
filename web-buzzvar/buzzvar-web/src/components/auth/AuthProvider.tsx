'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { authClient, useSession } from '@/lib/auth/better-auth-client-web'

interface AuthContextType {
  user: any | null
  loading: boolean
  isAuthenticated: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession()

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
          window.location.href = '/login'
        },
      },
    })
  }

  return (
    <AuthContext.Provider value={{
      user: session?.user || null,
      loading: isPending,
      isAuthenticated: !!session?.user,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
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