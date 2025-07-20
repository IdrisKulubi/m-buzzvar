'use client'

import { useAuthRole, authClient } from '@/lib/auth/better-auth-client-web'

export function useAuth() {
  const { user, role, isLoading, isAdmin, isVenueOwner, isAuthenticated } = useAuthRole()

  const signInWithGoogle = async () => {
    const data = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    })
    
    if (data.error) {
      throw new Error(data.error.message)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    const data = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/dashboard",
    })
    
    if (data.error) {
      throw new Error(data.error.message)
    }
  }

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const data = await authClient.signUp.email({
      email,
      password,
      name,
      callbackURL: "/dashboard",
    })
    
    if (data.error) {
      throw new Error(data.error.message)
    }
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

  const refetch = async () => {
    // Better Auth automatically handles session refetching
    window.location.reload()
  }

  return { 
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      role: role || 'user',
      avatar_url: user.image,
    } : null,
    loading: isLoading,
    isAdmin,
    isVenueOwner,
    isAuthenticated,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refetch
  }
}