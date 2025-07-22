// Mobile-optimized Cloudflare R2 service
// Uses fetch API instead of AWS SDK for better React Native compatibility

export interface UploadResult {
  url: string
  key: string
  success: boolean
  error?: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export class CloudflareR2Service {
  private apiUrl: string
  private publicDomain: string

  constructor() {
    // Mobile app will use the web API endpoints for R2 operations
    this.apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
    this.publicDomain = process.env.EXPO_PUBLIC_R2_PUBLIC_DOMAIN || ''
  }

  /**
   * Upload a file to Cloudflare R2 via API endpoint
   * @param file File data (blob or base64)
   * @param key Object key (path) in R2
   * @param contentType MIME type of the file
   * @param onProgress Progress callback
   * @returns Upload result with public URL
   */
  async uploadFile(
    file: Blob | string,
    key: string,
    contentType: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      onProgress?.({ loaded: 0, total: 100, percentage: 0 })

      const formData = new FormData()
      formData.append('file', file as any)
      formData.append('key', key)
      formData.append('contentType', contentType)

      onProgress?.({ loaded: 25, total: 100, percentage: 25 })

      const response = await fetch(`${this.apiUrl}/api/storage/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type header, let browser set it with boundary for FormData
        },
      })

      onProgress?.({ loaded: 75, total: 100, percentage: 75 })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      
      onProgress?.({ loaded: 100, total: 100, percentage: 100 })

      return {
        url: result.url,
        key: result.key,
        success: true,
      }
    } catch (error) {
      console.error('R2 upload error:', error)
      return {
        url: '',
        key,
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  /**
   * Delete a file from Cloudflare R2 via API endpoint
   * @param key Object key to delete
   * @returns Success status
   */
  async deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.apiUrl}/api/storage/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Deletion failed' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return { success: true }
    } catch (error) {
      console.error('R2 deletion error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed',
      }
    }
  }

  /**
   * Get a signed upload URL via API endpoint
   * @param key Object key
   * @param contentType MIME type
   * @returns Signed upload URL
   */
  async getSignedUploadUrl(key: string, contentType: string): Promise<string> {
    try {
      const response = await fetch(`${this.apiUrl}/api/storage/signed-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, contentType, type: 'upload' }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      return result.signedUrl
    } catch (error) {
      console.error('Signed URL generation error:', error)
      throw new Error('Failed to generate signed URL')
    }
  }

  /**
   * Get public URL for a file
   * @param key Object key
   * @returns Public URL
   */
  getPublicUrl(key: string): string {
    if (this.publicDomain) {
      return `${this.publicDomain}/${key}`
    }
    // Fallback to API endpoint for public access
    return `${this.apiUrl}/api/storage/public/${key}`
  }

  /**
   * Extract key from R2 URL
   * @param url R2 URL
   * @returns Object key or null if invalid
   */
  static extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url)
      // Remove leading slash
      return urlObj.pathname.substring(1)
    } catch (error) {
      console.error('URL parsing error:', error)
      return null
    }
  }

  /**
   * Generate a unique key for file storage
   * @param userId User ID
   * @param originalName Original filename
   * @param prefix Optional prefix (e.g., 'vibe-checks', 'venues')
   * @returns Generated key
   */
  static generateFileKey(userId: string, originalName: string, prefix?: string): string {
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${timestamp}_${randomSuffix}.${fileExtension}`
    
    if (prefix) {
      return `${prefix}/${userId}/${fileName}`
    }
    
    return `${userId}/${fileName}`
  }

  /**
   * Validate file type and size
   * @param file File to validate
   * @param allowedTypes Allowed MIME types
   * @param maxSizeMB Maximum size in MB
   * @returns Validation result
   */
  static validateFile(
    file: { size: number; type: string },
    allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
    maxSizeMB: number = 10
  ): { isValid: boolean; error?: string } {
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      }
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return {
        isValid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size of ${maxSizeMB}MB`,
      }
    }

    return { isValid: true }
  }
}