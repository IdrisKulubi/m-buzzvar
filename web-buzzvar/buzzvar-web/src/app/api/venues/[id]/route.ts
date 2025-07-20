import { NextRequest } from 'next/server'
import { withApiHandler, createApiResponse, handleApiError, checkVenueOwnership, AuthenticatedRequest } from '@/lib/api/middleware'
import { validateSchema, venueSchemas } from '@/lib/api/validation'
import { VenueService } from '@/services/venueService'

export const GET = withApiHandler(async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params
    const venue = await VenueService.getVenueById(id)

    if (!venue) {
      return createApiResponse(undefined, {
        status: 404,
        error: 'Venue not found'
      })
    }

    return createApiResponse(venue, {
      message: 'Venue retrieved successfully'
    })
  } catch (error) {
    return handleApiError(error, 'Venue GET')
  }
}, { requireAuth: false, requireDatabase: true })

export const PUT = withApiHandler(async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    if (!request.user) {
      return createApiResponse(undefined, {
        status: 401,
        error: 'Authentication required'
      })
    }

    const { id } = await params
    const venue = await VenueService.getVenueById(id)

    if (!venue) {
      return createApiResponse(undefined, {
        status: 404,
        error: 'Venue not found'
      })
    }

    // Check if user owns the venue (unless admin)
    if (!request.user.isAdmin) {
      const hasAccess = await checkVenueOwnership(request.db!, request.user.id, params.id, request.user.isAdmin)
      if (!hasAccess) {
        return createApiResponse(undefined, {
          status: 403,
          error: 'Access denied',
          message: 'You do not have permission to update this venue'
        })
      }
    }

    const body = await request.json()
    
    // Validate request body
    const validation = validateSchema(venueSchemas.update, body)
    if (!validation.success) {
      return createApiResponse(undefined, {
        status: 400,
        error: 'Validation failed',
        message: validation.errors?.join(', ')
      })
    }

    // Update venue
    const updatedVenue = await VenueService.updateVenue(id, validation.data)

    return createApiResponse(updatedVenue, {
      message: 'Venue updated successfully'
    })
  } catch (error) {
    return handleApiError(error, 'Venue PUT')
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
    const venue = await VenueService.getVenueById(id)

    if (!venue) {
      return createApiResponse(undefined, {
        status: 404,
        error: 'Venue not found'
      })
    }

    // Check if user owns the venue (unless admin)
    if (!request.user.isAdmin) {
      const hasAccess = await checkVenueOwnership(request.db!, request.user.id, params.id, request.user.isAdmin)
      if (!hasAccess) {
        return createApiResponse(undefined, {
          status: 403,
          error: 'Access denied',
          message: 'You do not have permission to delete this venue'
        })
      }
    }

    // Delete venue
    await VenueService.deleteVenue(params.id)

    return createApiResponse(undefined, {
      message: 'Venue deleted successfully'
    })
  } catch (error) {
    return handleApiError(error, 'Venue DELETE')
  }
}, { requireAuth: true, requireVenueOwner: true, requireDatabase: true })