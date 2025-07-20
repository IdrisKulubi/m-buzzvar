import { NextRequest } from 'next/server'
import { withApiHandler, createApiResponse, handleApiError, validateQueryParams, AuthenticatedRequest } from '@/lib/api/middleware'
import { validateSchema, venueSchemas, paginationSchema } from '@/lib/api/validation'
import { VenueService } from '@/services/venueService'

export const GET = withApiHandler(async (request: AuthenticatedRequest) => {
  try {
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
      venue_type: searchParams.get('venue_type'),
      city: searchParams.get('city'),
      is_verified: searchParams.get('is_verified') === 'true' ? true : searchParams.get('is_verified') === 'false' ? false : undefined,
      is_active: searchParams.get('is_active') === 'true' ? true : searchParams.get('is_active') === 'false' ? false : undefined,
      search: searchParams.get('search'),
      latitude: searchParams.get('latitude') ? parseFloat(searchParams.get('latitude')!) : undefined,
      longitude: searchParams.get('longitude') ? parseFloat(searchParams.get('longitude')!) : undefined,
      radius: searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : undefined
    }

    const filterValidation = validateSchema(venueSchemas.filters, filterData)
    if (!filterValidation.success) {
      return createApiResponse(undefined, {
        status: 400,
        error: 'Invalid filter parameters',
        message: filterValidation.errors?.join(', ')
      })
    }

    // Get venues based on location or general filters
    let venues
    if (filterData.latitude && filterData.longitude) {
      venues = await VenueService.searchVenuesNearby(
        filterData.latitude,
        filterData.longitude,
        filterData.radius || 10,
        filterValidation.data,
        paginationValidation.data.limit
      )
    } else {
      venues = await VenueService.getVenues(
        filterValidation.data,
        paginationValidation.data.limit,
        paginationValidation.data.offset
      )
    }

    return createApiResponse(venues, {
      message: `Retrieved ${venues.length} venues`
    })
  } catch (error) {
    return handleApiError(error, 'Venues GET')
  }
}, { requireAuth: false, requireDatabase: true })

export const POST = withApiHandler(async (request: AuthenticatedRequest) => {
  try {
    if (!request.user) {
      return createApiResponse(undefined, {
        status: 401,
        error: 'Authentication required'
      })
    }

    // Only venue owners and admins can create venues
    if (!request.user.isVenueOwner && !request.user.isAdmin) {
      return createApiResponse(undefined, {
        status: 403,
        error: 'Insufficient permissions',
        message: 'Only venue owners and admins can create venues'
      })
    }

    const body = await request.json()
    
    // Validate request body
    const validation = validateSchema(venueSchemas.create, body)
    if (!validation.success) {
      return createApiResponse(undefined, {
        status: 400,
        error: 'Validation failed',
        message: validation.errors?.join(', ')
      })
    }

    // Create venue
    const venue = await VenueService.createVenue(validation.data)

    return createApiResponse(venue, {
      status: 201,
      message: 'Venue created successfully'
    })
  } catch (error) {
    return handleApiError(error, 'Venues POST')
  }
}, { requireAuth: true, requireVenueOwner: true, requireDatabase: true })