import { NextRequest, NextResponse } from 'next/server'
import { withApiHandler, createApiResponse, handleApiError, AuthenticatedRequest } from '@/lib/api/middleware'
import { apiValidationService } from '@/lib/api/validation-service'
import { headers } from 'next/headers'

export const GET = withApiHandler(async (request: AuthenticatedRequest) => {
  try {
    if (!request.user?.isAdmin) {
      return createApiResponse(undefined, {
        status: 403,
        error: 'Admin access required',
        message: 'Only administrators can validate API endpoints'
      })
    }

    const { searchParams } = new URL(request.url)
    const includeAuth = searchParams.get('includeAuth') === 'true'
    
    // Get the base URL from the request
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host')
    const baseUrl = `${protocol}://${host}`

    // Set up validation service with base URL
    const validationService = new (class extends apiValidationService.constructor {
      constructor() {
        super(baseUrl)
      }
    })()

    let authToken: string | undefined
    let isAdmin = false
    let isVenueOwner = false

    if (includeAuth && request.user) {
      // Get auth cookie from current request
      const headersList = await headers()
      authToken = headersList.get('cookie') || undefined
      isAdmin = request.user.isAdmin
      isVenueOwner = request.user.isVenueOwner
    }

    // Run validation
    const results = await validationService.validateAllEndpoints(authToken, isAdmin, isVenueOwner)
    const report = validationService.generateReport(results)

    return createApiResponse({
      timestamp: new Date().toISOString(),
      baseUrl,
      authenticationUsed: includeAuth,
      userPermissions: includeAuth ? {
        isAdmin,
        isVenueOwner
      } : null,
      ...report
    }, {
      message: `API validation completed. ${report.summary.passed}/${report.summary.total - report.summary.skipped} endpoints passed`
    })
  } catch (error) {
    return handleApiError(error, 'API Validation')
  }
}, { requireAuth: true, requireAdmin: true, requireDatabase: false })