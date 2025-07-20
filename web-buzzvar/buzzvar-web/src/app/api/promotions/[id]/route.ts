import { NextRequest } from 'next/server'
import { withApiHandler, createApiResponse, handleApiError, checkVenueOwnership, AuthenticatedRequest } from '@/lib/api/middleware'
import { promotionService } from '@/lib/database/services'

export const GET = withApiHandler(async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!request.user) {
      return createApiResponse(undefined, {
        status: 401,
        error: 'Authentication required'
      })
    }

    const { id } = await params
    const promotion = await promotionService.getPromotionById(id)

    if (!promotion) {
      return createApiResponse(undefined, {
        status: 404,
        error: 'Promotion not found'
      })
    }

    // Check if user owns the venue (unless admin)
    if (!request.user.isAdmin) {
      const hasAccess = await checkVenueOwnership(request.db!, request.user.id, promotion.venue_id, request.user.isAdmin)
      if (!hasAccess) {
        return createApiResponse(undefined, {
          status: 403,
          error: 'Access denied',
          message: 'You do not have permission to view this promotion'
        })
      }
    }

    return createApiResponse(promotion, {
      message: 'Promotion retrieved successfully'
    })
  } catch (error) {
    return handleApiError(error, 'Promotion GET')
  }
}, { requireAuth: true, requireVenueOwner: true, requireDatabase: true })

export const PUT = withApiHandler(async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!request.user) {
      return createApiResponse(undefined, {
        status: 401,
        error: 'Authentication required'
      })
    }

    const { id } = await params
    const promotion = await promotionService.getPromotionById(id)

    if (!promotion) {
      return createApiResponse(undefined, {
        status: 404,
        error: 'Promotion not found'
      })
    }

    // Check if user owns the venue (unless admin)
    if (!request.user.isAdmin) {
      const hasAccess = await checkVenueOwnership(request.db!, request.user.id, promotion.venue_id, request.user.isAdmin)
      if (!hasAccess) {
        return createApiResponse(undefined, {
          status: 403,
          error: 'Access denied',
          message: 'You do not have permission to update this promotion'
        })
      }
    }

    const body = await request.json()
    const updatedPromotion = await promotionService.updatePromotion(params.id, body)

    return createApiResponse(updatedPromotion, {
      message: 'Promotion updated successfully'
    })
  } catch (error) {
    return handleApiError(error, 'Promotion PUT')
  }
}, { requireAuth: true, requireVenueOwner: true, requireDatabase: true })

export const DELETE = withApiHandler(async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!request.user) {
      return createApiResponse(undefined, {
        status: 401,
        error: 'Authentication required'
      })
    }

    const { id } = await params
    const promotion = await promotionService.getPromotionById(id)

    if (!promotion) {
      return createApiResponse(undefined, {
        status: 404,
        error: 'Promotion not found'
      })
    }

    // Check if user owns the venue (unless admin)
    if (!request.user.isAdmin) {
      const hasAccess = await checkVenueOwnership(request.db!, request.user.id, promotion.venue_id, request.user.isAdmin)
      if (!hasAccess) {
        return createApiResponse(undefined, {
          status: 403,
          error: 'Access denied',
          message: 'You do not have permission to delete this promotion'
        })
      }
    }

    await promotionService.deletePromotion(params.id)

    return createApiResponse(undefined, {
      message: 'Promotion deleted successfully'
    })
  } catch (error) {
    return handleApiError(error, 'Promotion DELETE')
  }
}, { requireAuth: true, requireVenueOwner: true, requireDatabase: true })