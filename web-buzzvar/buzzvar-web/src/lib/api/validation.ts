import { z } from 'zod'

// Common validation schemas
export const commonSchemas = {
  uuid: z.string().uuid('Invalid UUID format'),
  email: z.string().email('Invalid email format'),
  url: z.string().url('Invalid URL format'),
  positiveInt: z.number().int().positive('Must be a positive integer'),
  nonEmptyString: z.string().min(1, 'Cannot be empty'),
  optionalString: z.string().optional(),
  boolean: z.boolean(),
  date: z.string().datetime('Invalid date format'),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  })
}

// Venue validation schemas
export const venueSchemas = {
  create: z.object({
    name: commonSchemas.nonEmptyString.max(255, 'Name too long'),
    description: z.string().max(1000, 'Description too long').optional(),
    address: commonSchemas.nonEmptyString.max(500, 'Address too long'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    venue_type: commonSchemas.nonEmptyString.max(100, 'Venue type too long'),
    phone: z.string().max(20, 'Phone number too long').optional(),
    website: commonSchemas.url.optional(),
    hours: z.record(z.string(), z.object({
      open: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
      close: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
      closed: z.boolean().optional()
    })).optional(),
    amenities: z.array(z.string()).optional(),
    cover_image_url: commonSchemas.url.optional(),
    cover_video_url: commonSchemas.url.optional()
  }),
  
  update: z.object({
    name: z.string().max(255, 'Name too long').optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    address: z.string().max(500, 'Address too long').optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    venue_type: z.string().max(100, 'Venue type too long').optional(),
    phone: z.string().max(20, 'Phone number too long').optional(),
    website: commonSchemas.url.optional(),
    hours: z.record(z.string(), z.object({
      open: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
      close: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
      closed: z.boolean().optional()
    })).optional(),
    amenities: z.array(z.string()).optional(),
    cover_image_url: commonSchemas.url.optional(),
    cover_video_url: commonSchemas.url.optional(),
    is_active: z.boolean().optional(),
    is_verified: z.boolean().optional()
  }),

  filters: z.object({
    venue_type: z.string().optional(),
    city: z.string().optional(),
    is_verified: z.boolean().optional(),
    is_active: z.boolean().optional(),
    search: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    radius: z.number().positive().optional()
  })
}

// Promotion validation schemas
export const promotionSchemas = {
  create: z.object({
    venue_id: commonSchemas.uuid,
    title: commonSchemas.nonEmptyString.max(255, 'Title too long'),
    description: z.string().max(1000, 'Description too long'),
    promotion_type: z.enum(['happy_hour', 'special_event', 'discount', 'live_music', 'sports', 'other']),
    start_date: commonSchemas.date,
    end_date: commonSchemas.date,
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format').optional(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format').optional(),
    days_of_week: z.array(z.number().min(0).max(6)).min(1, 'At least one day required'),
    discount_percentage: z.number().min(0).max(100).optional(),
    terms_conditions: z.string().max(500, 'Terms too long').optional()
  }),

  update: z.object({
    title: z.string().max(255, 'Title too long').optional(),
    description: z.string().max(1000, 'Description too long').optional(),
    promotion_type: z.enum(['happy_hour', 'special_event', 'discount', 'live_music', 'sports', 'other']).optional(),
    start_date: commonSchemas.date.optional(),
    end_date: commonSchemas.date.optional(),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format').optional(),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format').optional(),
    days_of_week: z.array(z.number().min(0).max(6)).optional(),
    discount_percentage: z.number().min(0).max(100).optional(),
    terms_conditions: z.string().max(500, 'Terms too long').optional(),
    is_active: z.boolean().optional()
  }),

  filters: z.object({
    venue_id: commonSchemas.uuid.optional(),
    promotion_type: z.string().optional(),
    is_active: z.boolean().optional(),
    start_date: commonSchemas.date.optional(),
    end_date: commonSchemas.date.optional()
  })
}

// User validation schemas
export const userSchemas = {
  update: z.object({
    name: z.string().max(255, 'Name too long').optional(),
    university: z.string().max(255, 'University name too long').optional(),
    avatar_url: commonSchemas.url.optional(),
    is_active: z.boolean().optional()
  }),

  filters: z.object({
    search: z.string().optional(),
    university: z.string().optional(),
    is_active: z.boolean().optional(),
    role: z.string().optional(),
    created_after: commonSchemas.date.optional(),
    created_before: commonSchemas.date.optional()
  })
}

// Analytics validation schemas
export const analyticsSchemas = {
  query: z.object({
    type: z.enum(['platform', 'venue', 'system-health', 'real-time']),
    venueId: commonSchemas.uuid.optional(),
    period: z.enum(['1d', '7d', '30d', '90d', '1y']).optional(),
    start_date: commonSchemas.date.optional(),
    end_date: commonSchemas.date.optional()
  })
}

// File upload validation schemas
export const fileSchemas = {
  upload: z.object({
    key: commonSchemas.nonEmptyString.max(500, 'Key too long'),
    contentType: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/, 'Invalid content type'),
    size: z.number().positive().max(50 * 1024 * 1024, 'File too large (max 50MB)') // 50MB limit
  })
}

// Pagination validation schema
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc')
})

// Generic validation function
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  errors?: string[]
} {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      }
    }
    return {
      success: false,
      errors: ['Validation failed']
    }
  }
}

// Validation middleware for API routes
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  source: 'body' | 'query' = 'body'
) {
  return (handler: (req: any, validatedData: T) => Promise<Response>) => {
    return async (req: any): Promise<Response> => {
      try {
        let data: unknown

        if (source === 'body') {
          data = await req.json()
        } else {
          const url = new URL(req.url)
          data = Object.fromEntries(url.searchParams.entries())
        }

        const validation = validateSchema(schema, data)

        if (!validation.success) {
          return new Response(
            JSON.stringify({
              error: 'Validation failed',
              message: 'Invalid request data',
              details: validation.errors
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }

        return await handler(req, validation.data!)
      } catch (error) {
        console.error('Validation middleware error:', error)
        return new Response(
          JSON.stringify({
            error: 'Internal server error',
            message: 'Validation failed'
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }
  }
}

// Utility to validate and sanitize file uploads
export function validateFileUpload(file: File, options: {
  maxSizeMB?: number
  allowedTypes?: string[]
  allowedExtensions?: string[]
} = {}): { isValid: boolean; error?: string } {
  const {
    maxSizeMB = 10,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
  } = options

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`
    }
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`
    }
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (extension && !allowedExtensions.includes(extension)) {
    return {
      isValid: false,
      error: `File extension ${extension} not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`
    }
  }

  return { isValid: true }
}

// Utility to sanitize strings for database queries
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
}

// Utility to validate coordinates
export function validateCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

// Utility to validate time format (HH:MM)
export function validateTimeFormat(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time)
}

// Utility to validate date range
export function validateDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return start <= end
}