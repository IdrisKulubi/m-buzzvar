import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createApiResponse, handleApiError, AuthenticatedRequest } from '@/lib/api/middleware'

export const GET = withApiHandler(async (request: AuthenticatedRequest) => {
  try {
    if (!request.user) {
      return createApiResponse({
        error: 'Not authenticated',
        session: null,
        adminEmails: process.env.ADMIN_EMAILS?.split(',') || []
      }, { status: 401 })
    }

    return createApiResponse({
      user: {
        id: request.user.id,
        email: request.user.email,
        role: request.user.role
      },
      adminEmails: process.env.ADMIN_EMAILS?.split(',') || [],
      isAdmin: request.user.isAdmin,
      isVenueOwner: request.user.isVenueOwner,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return handleApiError(error, 'User Role Debug')
  }
}, { requireAuth: false, requireDatabase: false })