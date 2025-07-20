import React, { createContext, useContext, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth/better-auth-client-mobile'
import type { User } from 'better-auth/types'

interface UserContextType {
  user: User | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUser(session?.user || null)
    setLoading(isPending)
  }, [session, isPending])

  const refreshUser = async () => {
    try {
      setLoading(true)
      const session = await authClient.getSession()
      setUser(session?.user || null)
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    refreshUser,
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}