import { authClient } from '@/lib/auth/better-auth-client-mobile'

// Base API client with authentication
class ApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = process.env.EXPO_PUBLIC_AUTH_URL || "http://localhost:3000"
  }

  // Make authenticated requests with Better Auth cookies
  async request(endpoint: string, options: RequestInit = {}) {
    const cookies = authClient.getCookie()
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        'Cookie': cookies || '',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Convenience methods
  async get(endpoint: string, options?: RequestInit) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  async post(endpoint: string, data?: any, options?: RequestInit) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put(endpoint: string, data?: any, options?: RequestInit) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch(endpoint: string, data?: any, options?: RequestInit) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete(endpoint: string, options?: RequestInit) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()

// Hook for making authenticated requests
export function useAuthenticatedApi() {
  return apiClient
}