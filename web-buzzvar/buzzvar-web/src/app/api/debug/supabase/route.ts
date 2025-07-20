import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createApiResponse, handleApiError, AuthenticatedRequest } from '@/lib/api/middleware'
import { auth } from '@/lib/auth/better-auth-server'
import { headers } from 'next/headers'

export const GET = withApiHandler(async (request: AuthenticatedRequest) => {
  try {
    // Test Better Auth session
    const session = await auth.api.getSession({
      headers: await headers(),
    })
    
    return createApiResponse({
      success: true,
      authSystem: 'Better Auth',
      neonDbUrl: process.env.NEON_DATABASE_URL ? 'configured' : 'missing',
      hasSession: !!session,
      sessionUser: session ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      } : null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return handleApiError(error, 'Auth Debug')
  }
}, { requireAuth: false, requireDatabase: false })