import { NextRequest, NextResponse } from 'next/server'
import { auth, getUserRole, isAdmin, isVenueOwner } from '@/lib/auth/better-auth-server'
import { headers } from 'next/headers'
import { Pool } from 'pg'

// Database connection pool
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL!,
  ssl: process.env.NODE_ENV === 'production',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    email: string
    name?: string
    role?: string
    isAdmin: boolean
    isVenueOwner: boolean
  }
  db?: {
    query: (text: string, params?: any[]) => Promise<any>
    release: () => void
  }
}

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  status?: number
}

export interface ApiHandler {
  (req: AuthenticatedRequest): Promise<NextResponse<ApiResponse>>
}

/**
 * Middleware to handle authentication for API routes
 */
export function withAuth(handler: ApiHandler, options: {
  requireAuth?: boolean
  requireAdmin?: boolean
  requireVenueOwner?: boolean
} = {}) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const authenticatedRequest = request as AuthenticatedRequest

      // Get session if authentication is required or optional
      if (options.requireAuth !== false) {
        const session = await auth.api.getSession({
          headers: await headers(),
        })

        if (!session && options.requireAuth !== false) {
          return NextResponse.json(
            { error: 'Unauthorized', message: 'Authentication required' },
            { status: 401 }
          )
        }

        if (session) {
          const userRole = await getUserRole(session.user.id)
          const userIsAdmin = await isAdmin(session.user.id)
          const userIsVenueOwner = await isVenueOwner(session.user.id)

          authenticatedRequest.user = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: userRole,
            isAdmin: userIsAdmin,
            isVenueOwner: userIsVenueOwner,
          }

          // Check role requirements
          if (options.requireAdmin && !userIsAdmin) {
            return NextResponse.json(
              { error: 'Forbidden', message: 'Admin access required' },
              { status: 403 }
            )
          }

          if (options.requireVenueOwner && !userIsVenueOwner && !userIsAdmin) {
            return NextResponse.json(
              { error: 'Forbidden', message: 'Venue owner or admin access required' },
              { status: 403 }
            )
          }
        }
      }

      return await handler(authenticatedRequest)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json(
        { error: 'Internal server error', message: 'Authentication failed' },
        { status: 500 }
      )
    }
  }
}

/**
 * Middleware to provide database connection to API routes
 */
export function withDatabase(handler: ApiHandler) {
  return async (request: AuthenticatedRequest): Promise<NextResponse> => {
    const client = await pool.connect()
    
    try {
      // Add database client to request
      request.db = {
        query: client.query.bind(client),
        release: client.release.bind(client),
      }

      const response = await handler(request)
      return response
    } catch (error) {
      console.error('Database middleware error:', error)
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to connect to database' },
        { status: 500 }
      )
    } finally {
      client.release()
    }
  }
}

/**
 * Middleware to handle common API patterns (auth + database)
 */
export function withApiHandler(p0: (request: AuthenticatedRequest) => Promise<NextResponse<unknown>>, handler: ApiHandler, options: {
  requireAuth?: boolean
  requireAdmin?: boolean
  requireVenueOwner?: boolean
  requireDatabase?: boolean
} = {}, p1: { requireAuth: boolean; requireDatabase: boolean }) {
  let wrappedHandler = handler

  // Apply database middleware if needed
  if (options.requireDatabase !== false) {
    wrappedHandler = withDatabase(wrappedHandler)
  }

  // Apply auth middleware
  wrappedHandler = withAuth(wrappedHandler, {
    requireAuth: options.requireAuth,
    requireAdmin: options.requireAdmin,
    requireVenueOwner: options.requireVenueOwner,
  })

  return wrappedHandler
}

/**
 * Utility function to create consistent API responses
 */
export function createApiResponse<T>(
  data?: T,
  options: {
    status?: number
    message?: string
    error?: string
  } = {}
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {}

  if (data !== undefined) {
    response.data = data
  }

  if (options.message) {
    response.message = options.message
  }

  if (options.error) {
    response.error = options.error
  }

  return NextResponse.json(response, { status: options.status || 200 })
}

/**
 * Utility function to handle API errors consistently
 */
export function handleApiError(error: any, context: string = 'API'): NextResponse {
  console.error(`${context} error:`, error)

  // Handle specific database errors
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        return createApiResponse(undefined, {
          status: 409,
          error: 'Duplicate entry',
          message: 'A record with this information already exists'
        })
      case '23503': // Foreign key violation
        return createApiResponse(undefined, {
          status: 400,
          error: 'Invalid reference',
          message: 'Referenced record not found'
        })
      case '23514': // Check constraint violation
        return createApiResponse(undefined, {
          status: 400,
          error: 'Invalid data',
          message: 'Data does not meet requirements'
        })
      case '23502': // Not null violation
        return createApiResponse(undefined, {
          status: 400,
          error: 'Missing required field',
          message: 'Required field cannot be empty'
        })
    }
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return createApiResponse(undefined, {
      status: 400,
      error: 'Validation error',
      message: error.message
    })
  }

  // Generic error response
  return createApiResponse(undefined, {
    status: 500,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
  })
}

/**
 * Utility function to validate request body
 */
export function validateRequestBody<T>(
  body: any,
  requiredFields: (keyof T)[],
  optionalFields: (keyof T)[] = []
): { isValid: boolean; errors: string[]; data?: Partial<T> } {
  const errors: string[] = []
  const data: Partial<T> = {}

  // Check required fields
  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      errors.push(`${String(field)} is required`)
    } else {
      data[field] = body[field]
    }
  }

  // Include optional fields if present
  for (const field of optionalFields) {
    if (body[field] !== undefined && body[field] !== null) {
      data[field] = body[field]
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data as T : undefined
  }
}

/**
 * Utility function to validate query parameters
 */
export function validateQueryParams(
  searchParams: URLSearchParams,
  validParams: string[]
): Record<string, string | null> {
  const params: Record<string, string | null> = {}
  
  for (const param of validParams) {
    params[param] = searchParams.get(param)
  }
  
  return params
}

/**
 * Utility function to check venue ownership
 */
export async function checkVenueOwnership(
  db: AuthenticatedRequest['db'],
  userId: string,
  venueId: string,
  isAdmin: boolean = false
): Promise<boolean> {
  if (isAdmin) return true
  
  if (!db) throw new Error('Database connection not available')
  
  const result = await db.query(`
    SELECT id FROM venue_owners 
    WHERE user_id = $1 AND venue_id = $2 AND is_active = true
  `, [userId, venueId])

  return result.rows.length > 0
}

/**
 * Rate limiting utility (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  
  // Clean up old entries
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < windowStart) {
      rateLimitMap.delete(key)
    }
  }
  
  const current = rateLimitMap.get(identifier)
  
  if (!current) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.resetTime < now) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.count >= maxRequests) {
    return false
  }
  
  current.count++
  return true
}

/**
 * Middleware to apply rate limiting
 */
export function withRateLimit(handler: ApiHandler, options: {
  maxRequests?: number
  windowMs?: number
  keyGenerator?: (req: AuthenticatedRequest) => string
} = {}) {
  return async (request: AuthenticatedRequest): Promise<NextResponse> => {
    const identifier = options.keyGenerator 
      ? options.keyGenerator(request)
      : request.user?.id || request.ip || 'anonymous'
    
    const allowed = rateLimit(
      identifier,
      options.maxRequests || 100,
      options.windowMs || 60000
    )
    
    if (!allowed) {
      return createApiResponse(undefined, {
        status: 429,
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.'
      })
    }
    
    return await handler(request)
  }
}