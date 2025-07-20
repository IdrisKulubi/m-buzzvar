import { NextRequest } from 'next/server'
import { withApiHandler, createApiResponse, handleApiError, AuthenticatedRequest } from '@/lib/api/middleware'

export const GET = withApiHandler(async (request: AuthenticatedRequest) => {
  try {
    if (!request.user) {
      return createApiResponse(undefined, {
        status: 401,
        error: 'Authentication required'
      })
    }

    return createApiResponse({
      role: request.user.role,
      isAdmin: request.user.isAdmin,
      isVenueOwner: request.user.isVenueOwner,
      user: {
        id: request.user.id,
        email: request.user.email,
        name: request.user.name
      }
    }, {
      message: 'User role retrieved successfully'
    })
  } catch (error) {
    return handleApiError(error, 'Auth Role GET')
  }
}, { requireAuth: true })