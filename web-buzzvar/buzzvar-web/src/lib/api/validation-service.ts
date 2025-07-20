import { NextRequest } from 'next/server'

export interface ApiEndpoint {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  requiresAuth: boolean
  requiresAdmin?: boolean
  requiresVenueOwner?: boolean
  description: string
  testData?: any
}

export interface ValidationResult {
  endpoint: string
  method: string
  status: 'pass' | 'fail' | 'skip'
  statusCode?: number
  responseTime?: number
  error?: string
  message?: string
}

export class ApiValidationService {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  // Define all API endpoints to validate
  private endpoints: ApiEndpoint[] = [
    // Auth endpoints
    {
      path: '/api/auth/session',
      method: 'GET',
      requiresAuth: false,
      description: 'Get current session'
    },
    {
      path: '/api/auth/role',
      method: 'GET',
      requiresAuth: true,
      description: 'Get user role'
    },

    // Health endpoints
    {
      path: '/api/health',
      method: 'GET',
      requiresAuth: false,
      description: 'System health check'
    },
    {
      path: '/api/health/database',
      method: 'GET',
      requiresAuth: true,
      requiresAdmin: true,
      description: 'Database health check'
    },

    // Venue endpoints
    {
      path: '/api/venues',
      method: 'GET',
      requiresAuth: false,
      description: 'Get venues list'
    },
    {
      path: '/api/venues',
      method: 'POST',
      requiresAuth: true,
      requiresVenueOwner: true,
      description: 'Create venue',
      testData: {
        name: 'Test Venue',
        description: 'Test venue description',
        address: '123 Test St',
        latitude: 40.7128,
        longitude: -74.0060
      }
    },

    // Promotion endpoints
    {
      path: '/api/promotions',
      method: 'GET',
      requiresAuth: true,
      requiresVenueOwner: true,
      description: 'Get promotions (requires venue_id param)'
    },

    // Analytics endpoints
    {
      path: '/api/analytics',
      method: 'GET',
      requiresAuth: true,
      description: 'Get analytics data'
    },

    // Storage endpoints
    {
      path: '/api/storage/signed-url',
      method: 'POST',
      requiresAuth: true,
      description: 'Get signed upload URL',
      testData: {
        key: 'test-file.jpg',
        contentType: 'image/jpeg'
      }
    },

    // Notification endpoints
    {
      path: '/api/notifications',
      method: 'GET',
      requiresAuth: false,
      description: 'Get notifications'
    },

    // Debug endpoints
    {
      path: '/api/debug/user-role',
      method: 'GET',
      requiresAuth: false,
      description: 'Debug user role information'
    },
    {
      path: '/api/debug/supabase',
      method: 'GET',
      requiresAuth: false,
      description: 'Debug auth system status'
    }
  ]

  async validateEndpoint(
    endpoint: ApiEndpoint,
    authToken?: string,
    isAdmin: boolean = false,
    isVenueOwner: boolean = false
  ): Promise<ValidationResult> {
    const startTime = Date.now()
    
    try {
      // Skip endpoints that require permissions we don't have
      if (endpoint.requiresAuth && !authToken) {
        return {
          endpoint: endpoint.path,
          method: endpoint.method,
          status: 'skip',
          message: 'Skipped - requires authentication'
        }
      }

      if (endpoint.requiresAdmin && !isAdmin) {
        return {
          endpoint: endpoint.path,
          method: endpoint.method,
          status: 'skip',
          message: 'Skipped - requires admin access'
        }
      }

      if (endpoint.requiresVenueOwner && !isVenueOwner && !isAdmin) {
        return {
          endpoint: endpoint.path,
          method: endpoint.method,
          status: 'skip',
          message: 'Skipped - requires venue owner access'
        }
      }

      const url = `${this.baseUrl}${endpoint.path}`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (authToken) {
        headers['Cookie'] = authToken
      }

      const requestOptions: RequestInit = {
        method: endpoint.method,
        headers
      }

      // Add test data for POST/PUT requests
      if ((endpoint.method === 'POST' || endpoint.method === 'PUT') && endpoint.testData) {
        requestOptions.body = JSON.stringify(endpoint.testData)
      }

      // Add query parameters for specific endpoints
      let finalUrl = url
      if (endpoint.path === '/api/promotions' && endpoint.method === 'GET') {
        finalUrl += '?venue_id=test-venue-id'
      }
      if (endpoint.path === '/api/notifications' && endpoint.method === 'GET') {
        finalUrl += '?since=' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
      if (endpoint.path === '/api/analytics' && endpoint.method === 'GET') {
        finalUrl += '?type=platform&period=7d'
      }

      const response = await fetch(finalUrl, requestOptions)
      const responseTime = Date.now() - startTime

      // Consider 2xx and some 4xx responses as successful validation
      const isSuccess = response.status < 500 && response.status !== 404
      
      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        status: isSuccess ? 'pass' : 'fail',
        statusCode: response.status,
        responseTime,
        message: isSuccess ? 'Endpoint responding correctly' : `HTTP ${response.status}`
      }
    } catch (error) {
      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        status: 'fail',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async validateAllEndpoints(
    authToken?: string,
    isAdmin: boolean = false,
    isVenueOwner: boolean = false
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    for (const endpoint of this.endpoints) {
      const result = await this.validateEndpoint(endpoint, authToken, isAdmin, isVenueOwner)
      results.push(result)
      
      // Add small delay between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }

  generateReport(results: ValidationResult[]): {
    summary: {
      total: number
      passed: number
      failed: number
      skipped: number
      successRate: number
    }
    results: ValidationResult[]
  } {
    const total = results.length
    const passed = results.filter(r => r.status === 'pass').length
    const failed = results.filter(r => r.status === 'fail').length
    const skipped = results.filter(r => r.status === 'skip').length
    const successRate = total > 0 ? Math.round((passed / (total - skipped)) * 100) : 0

    return {
      summary: {
        total,
        passed,
        failed,
        skipped,
        successRate
      },
      results
    }
  }
}

export const apiValidationService = new ApiValidationService()