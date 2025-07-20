import { CloudflareR2Service } from '../storage/cloudflare-r2-service'
import { ImageOptimizer } from '../utils/image-optimization'

export interface FileUploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface FileUploadOptions {
  onProgress?: (progress: FileUploadProgress) => void
  maxSizeMB?: number
  allowedTypes?: string[]
  quality?: number
}

export interface FileUploadResult {
  url: string | null
  key: string | null
  error: string | null
  success: boolean
}

export class FileUploadService {
  private static r2Service = new CloudflareR2Service()

  /**
   * Upload a file to Cloudflare R2
   * @param file File to upload
   * @param userId User ID for organization
   * @param prefix Optional prefix (e.g., 'venues', 'vibe-checks')
   * @param options Upload options
   * @returns Upload result
   */
  static async uploadFile(
    file: File,
    userId: string,
    prefix?: string,
    options: FileUploadOptions = {}
  ): Promise<FileUploadResult> {
    try {
      const {
        onProgress,
        maxSizeMB = 10,
        allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
        quality = 0.8,
      } = options

      onProgress?.({ loaded: 0, total: 100, percentage: 0 })

      // Validate file
      const validation = CloudflareR2Service.validateFile(
        { size: file.size, type: file.type },
        allowedTypes,
        maxSizeMB
      )

      if (!validation.isValid) {
        return {
          url: null,
          key: null,
          error: validation.error || 'File validation failed',
          success: false,
        }
      }

      onProgress?.({ loaded: 10, total: 100, percentage: 10 })

      // Generate unique key
      const key = CloudflareR2Service.generateFileKey(userId, file.name, prefix)

      // Optimize image if it's an image file
      let processedFile = file
      if (file.type.startsWith('image/')) {
        const optimized = await ImageOptimizer.optimizeImage(file, {
          quality,
          maxWidth: 1200,
          maxHeight: 1200,
          format: 'webp', // Use WebP for better compression
        })
        processedFile = optimized.file
        onProgress?.({ loaded: 30, total: 100, percentage: 30 })
      }

      // Convert to buffer
      const arrayBuffer = await processedFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      onProgress?.({ loaded: 50, total: 100, percentage: 50 })

      // Upload to R2
      const result = await this.r2Service.uploadFile(buffer, key, processedFile.type, {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        userId,
      })

      onProgress?.({ loaded: 100, total: 100, percentage: 100 })

      if (!result.success) {
        return {
          url: null,
          key: null,
          error: result.error || 'Upload failed',
          success: false,
        }
      }

      return {
        url: result.url,
        key: result.key,
        error: null,
        success: true,
      }
    } catch (error) {
      console.error('File upload error:', error)
      return {
        url: null,
        key: null,
        error: error instanceof Error ? error.message : 'Upload failed',
        success: false,
      }
    }
  }

  /**
   * Upload multiple files
   * @param files Files to upload
   * @param userId User ID
   * @param prefix Optional prefix
   * @param options Upload options
   * @returns Array of upload results
   */
  static async uploadFiles(
    files: File[],
    userId: string,
    prefix?: string,
    options: FileUploadOptions = {}
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const batchProgress = (progress: FileUploadProgress) => {
        const overallProgress = ((i / files.length) * 100) + (progress.percentage / files.length)
        options.onProgress?.({
          loaded: overallProgress,
          total: 100,
          percentage: overallProgress,
        })
      }

      const result = await this.uploadFile(file, userId, prefix, {
        ...options,
        onProgress: batchProgress,
      })

      results.push(result)
    }

    return results
  }

  /**
   * Delete a file from R2
   * @param url File URL to delete
   * @returns Deletion result
   */
  static async deleteFile(url: string): Promise<{ success: boolean; error?: string }> {
    try {
      const key = CloudflareR2Service.extractKeyFromUrl(url)
      if (!key) {
        return { success: false, error: 'Invalid file URL' }
      }

      return await this.r2Service.deleteFile(key)
    } catch (error) {
      console.error('File deletion error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deletion failed',
      }
    }
  }

  /**
   * Get signed upload URL for direct client upload
   * @param userId User ID
   * @param fileName Original filename
   * @param contentType File content type
   * @param prefix Optional prefix
   * @returns Signed URL and key
   */
  static async getSignedUploadUrl(
    userId: string,
    fileName: string,
    contentType: string,
    prefix?: string
  ): Promise<{ signedUrl: string; key: string; publicUrl: string }> {
    const key = CloudflareR2Service.generateFileKey(userId, fileName, prefix)
    const signedUrl = await this.r2Service.getSignedUploadUrl(key, contentType)
    const publicUrl = this.r2Service.getPublicUrl(key)

    return { signedUrl, key, publicUrl }
  }



  /**
   * Validate file before upload
   * @param file File to validate
   * @param options Validation options
   * @returns Validation result
   */
  static async validateFile(
    file: File,
    options: {
      maxSizeMB?: number
      allowedTypes?: string[]
      minWidth?: number
      minHeight?: number
      maxWidth?: number
      maxHeight?: number
    } = {}
  ): Promise<{ isValid: boolean; error?: string; metadata?: any }> {
    const { maxSizeMB = 10, allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'] } = options

    // For images, use the enhanced image validator
    if (file.type.startsWith('image/')) {
      return await ImageOptimizer.validateImage(file, options)
    }

    // For other files, use basic validation
    return {
      ...CloudflareR2Service.validateFile(
        { size: file.size, type: file.type },
        allowedTypes,
        maxSizeMB
      ),
    }
  }
}