"use client";

import { createAuthClient } from "better-auth/react";
import { useEffect, useState } from "react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:3000",
});

// Export auth client methods for convenience
export const { signIn, signUp, signOut, useSession, getSession } = authClient;

// Custom hook for user role
export function useAuthRole() {
  const { data: session } = useSession()
  const [role, setRole] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isVenueOwner, setIsVenueOwner] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetch('/api/auth/role')
        .then(res => res.json())
        .then(data => {
          setRole(data.role)
          setIsAdmin(data.isAdmin || false)
          setIsVenueOwner(data.isVenueOwner || false)
        })
        .catch(err => console.error('Failed to fetch user role:', err))
    } else {
      setRole(null)
      setIsAdmin(false)
      setIsVenueOwner(false)
    }
  }, [session])

  return { 
    role, 
    isAdmin, 
    isVenueOwner, 
    user: session?.user,
    loading: !session && !role
  }
}
