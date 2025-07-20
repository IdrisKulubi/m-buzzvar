import { createAuthClient } from "better-auth/react"
import { expoClient } from "@better-auth/expo/client"
import * as SecureStore from "expo-secure-store"
import { useState, useEffect, useCallback } from "react"

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
  plugins: [
    expoClient({
      scheme: "buzzvar",
      storagePrefix: "buzzvar",
      storage: SecureStore,
    }),
  ],
})

// Custom hook for mobile authentication
export function useAuthRole() {
  const { data: session, isPending } = authClient.useSession()
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchRole() {
      if (session?.user && !isPending) {
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/role`, {
            credentials: 'include',
            headers: {
              'Cookie': authClient.getCookie() || '',
            },
          })
          if (response.ok) {
            const data = await response.json()
            setRole(data.role)
          } else {
            setRole('user') // Default role
          }
        } catch (error) {
          console.error('Error fetching user role:', error)
          setRole('user') // Default role
        }
      } else if (!session?.user && !isPending) {
        setRole(null)
      }
      setIsLoading(false)
    }

    fetchRole()
  }, [session, isPending])

  return { 
    role, 
    user: session?.user, 
    isLoading: isLoading || isPending,
    isAdmin: role === 'admin' || role === 'super_admin',
    isVenueOwner: role === 'venue_owner' || role === 'admin' || role === 'super_admin',
    isAuthenticated: !!session?.user
  }
}

export function useAuthenticatedFetch() {
  const getCookies = useCallback(() => authClient.getCookie(), [])

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const cookies = getCookies()
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`
    
    return fetch(fullUrl, {
      ...options,
      headers: {
        ...options.headers,
        'Cookie': cookies || '',
        'Content-Type': 'application/json',
      },
    })
  }, [getCookies])

  return authenticatedFetch
}

// Helper function to handle OAuth redirects
export function handleOAuthRedirect(url: string) {
  return authClient.handleOAuthRedirect(url)
}

// Helper function to check if user has specific permission
export async function hasPermission(permission: string): Promise<boolean> {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"
    const response = await fetch(`${baseUrl}/api/auth/permissions`, {
      headers: {
        'Cookie': authClient.getCookie() || '',
      },
    })
    if (response.ok) {
      const data = await response.json()
      return data.permissions.includes(permission) || data.permissions.includes('*')
    }
    return false
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

// Session management helpers
export async function refreshSession() {
  try {
    return await authClient.getSession()
  } catch (error) {
    console.error('Error refreshing session:', error)
    return null
  }
}

export async function clearSession() {
  try {
    await authClient.signOut()
    // Clear any additional stored data
    await SecureStore.deleteItemAsync('buzzvar_session')
    await SecureStore.deleteItemAsync('buzzvar_user')
  } catch (error) {
    console.error('Error clearing session:', error)
  }
}

// Export auth client methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient