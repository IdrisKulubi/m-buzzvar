import { NextRequest } from 'next/server'
import { withApiHandler, createApiResponse, handleApiError, checkVenueOwnership, AuthenticatedRequest } from '@/lib/api/middleware'
import { validateSchema, promotionSchemas, paginationSchema } from '@/lib/api/validation'
import { promotionService } from '@/lib/database/services'

export const GET = withApiHandler(async (request: AuthenticatedRequest) => {
  try {
    if (!request.user) {
      return createApiResponse(undefined, {
        status: 401,
        error: 'Authentication required'
      })
    }

    const { searchParams } = new URL(request.url)
    
    // Validate pagination parameters
    const paginationData = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
      sort: searchParams.get('sort') || 'created_at',
      order: (searchParams.get('order') as 'asc' | 'desc') || 'desc'
    }
    
    const paginationValidation = validateSchema(paginationSchema, paginationData)
    if (!paginationValidation.success) {
      return createApiResponse(undefined, {
        status: 400,
        error: 'Invalid pagination parameters',
        message: paginationValidation.errors?.join(', ')
      })
    }

    // Validate filter parameters
    const filterData = {
      venue_id: searchParams.get('venue_id'),
      promotion_type: searchParams.get('promotion_type'),
      is_active: searchParams.get('is_active') === 'true' ? true : searchParams.get('is_active') === 'false' ? false : undefined,
      start_date: searchParams.get('start_date'),
      end_date: searchParams.get('end_date')
    }

    const filterValidation = validateSchema(promotionSchemas.filters, filterData)
    if (!filterValidation.success) {
      return createApiResponse(undefined, {
        status: 400,
        error: 'Invalid filter parameters',
        message: filterValidation.errors?.join(', ')
      })
    }

    const venueId = filterData.venue_id
    if (!venueId) {
      return createApiResponse(undefined, {
        status: 400,
        error: 'venue_id is required'
      })
    }

    // Check venue ownership (unless admin)
    if (!request.user.isAdmin) {
      const hasAccess = await checkVenueOwnership(request.db!, request.user.id, venueId, request.user.isAdmin)
      if (!hasAccess) {
        return createApiResponse(undefined, {
          status: 403,
          error: 'Access denied',
          message: 'You do not have permission to view promotions for this venue'
        })
      }
    }

    // Get promotions
    const promotions = await promotionService.getPromotions(
      filterValidation.data,
      paginationValidation.data.limit,
      paginationValidation.data.offset
    )

    return createApiResponse(promotions, {
      message: `Retrieved ${promotions.length} promotions`
    })
  } catch (error) {
    return handleApiError(error, 'Promotions GET')
  }
}, { requireAuth: true, requireVenueOwner: true, requireDatabase: true })

export const POST = withApiHandler(async (request: AuthenticatedRequest) => {
  try {
    if (!request.user) {
      return createApiResponse(undefined, {
        status: 401,
        error: 'Authentication required'
      })
    }

    const body = await request.json()
    
    // Validate request body
    const validation = validateSchema(promotionSchemas.create, body)
    if (!validation.success) {
      return createApiResponse(undefined, {
        status: 400,
        error: 'Validation failed',
        message: validation.errors?.join(', ')
      })
    }

    const { venue_id } = validation.data

    // Check venue ownership (unless admin)
    if (!request.user.isAdmin) {
      const hasAccess = await checkVenueOwnership(request.db!, request.user.id, venue_id, request.user.isAdmin)
      if (!hasAccess) {
        return createApiResponse(undefined, {
          status: 403,
          error: 'Access denied',
          message: 'You do not have permission to create promotions for this venue'
        })
      }
    }

    // Create promotion
    const promotion = await promotionService.createPromotion(validation.data)

    return createApiResponse(promotion, {
      status: 201,
      message: 'Promotion created successfully'
    })
  } catch (error) {
    return handleApiError(error, 'Promotions POST')
  }
}, { requireAuth: true, requireVenueOwner: true, requireDatabase: true })