'use client'

import { useAuthContext } from './AuthProvider'
import { AuthLoading } from './AuthLoading'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { UserRole } from '@/lib/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  venueId?: string
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  venueId 
}: ProtectedRouteProps) {
  const { user, loading } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (!loading && user && requiredRole) {
      // Check role-based access
      if (requiredRole === 'admin' && user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      if (requiredRole === 'venue_owner' && user.role !== 'venue_owner' && user.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      // Check venue-specific access
      if (venueId && user.role !== 'admin') {
        if (user.role !== 'venue_owner' || !user.venues?.some(v => v.venue_id === venueId)) {
          router.push('/dashboard')
          return
        }
      }
    }
  }, [user, loading, requiredRole, venueId, router])

  if (loading) {
    return <AuthLoading />
  }

  if (!user) {
    return null // Will redirect to login
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return null // Will redirect to dashboard
  }

  if (venueId && user.role !== 'admin') {
    if (user.role !== 'venue_owner' || !user.venues?.some(v => v.venue_id === venueId)) {
      return null // Will redirect to dashboard
    }
  }

  return <>{children}</>
}