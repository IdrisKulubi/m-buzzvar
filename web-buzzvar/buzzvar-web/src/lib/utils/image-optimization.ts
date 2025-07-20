/**
 * Image optimization utilities for web applications
 */

export interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'webp' | 'png'
  maintainAspectRatio?: boolean
}

export interface OptimizedImageResult {
  file: File
  originalSize: number
  optimizedSize: number
  compressionRatio: number
  dimensions: { width: number; height: number }
}

export class ImageOptimizer {
  private static readonly DEFAULT_MAX_WIDTH = 1200
  private static readonly DEFAULT_MAX_HEIGHT = 1200
  private static readonly DEFAULT_QUALITY = 0.8

  /**
   * Optimize an image file
   * @param file Original image file
   * @param options Optimization options
   * @returns Optimized image result
   */
  static async optimizeImage(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<OptimizedImageResult> {
    const {
      maxWidth = this.DEFAULT_MAX_WIDTH,
      maxHeight = this.DEFAULT_MAX_HEIGHT,
      quality = this.DEFAULT_QUALITY,
      format = 'jpeg',
      maintainAspectRatio = true,
    } = options

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        try {
          // Calculate new dimensions
          const { width: newWidth, height: newHeight } = this.calculateDimensions(
            img.width,
            img.height,
            maxWidth,
            maxHeight,
            maintainAspectRatio
          )

          canvas.width = newWidth
          canvas.height = newHeight

          // Apply image smoothing for better quality
          if (ctx) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = 'high'
            ctx.drawImage(img, 0, 0, newWidth, newHeight)
          }

          // Convert to blob with specified format and quality
          const mimeType = `image/${format}`
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const optimizedFile = new File([blob], file.name, {
                  type: mimeType,
                  lastModified: Date.now(),
                })

                const compressionRatio = ((file.size - blob.size) / file.size) * 100

                resolve({
                  file: optimizedFile,
                  originalSize: file.size,
                  optimizedSize: blob.size,
                  compressionRatio,
                  dimensions: { width: newWidth, height: newHeight },
                })
              } else {
                reject(new Error('Failed to optimize image'))
              }
            },
            mimeType,
            quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Calculate optimal dimensions while maintaining aspect ratio
   * @param originalWidth Original width
   * @param originalHeight Original height
   * @param maxWidth Maximum width
   * @param maxHeight Maximum height
   * @param maintainAspectRatio Whether to maintain aspect ratio
   * @returns New dimensions
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    maintainAspectRatio: boolean
  ): { width: number; height: number } {
    if (!maintainAspectRatio) {
      return {
        width: Math.min(originalWidth, maxWidth),
        height: Math.min(originalHeight, maxHeight),
      }
    }

    const aspectRatio = originalWidth / originalHeight

    let newWidth = originalWidth
    let newHeight = originalHeight

    // Scale down if larger than max dimensions
    if (newWidth > maxWidth) {
      newWidth = maxWidth
      newHeight = newWidth / aspectRatio
    }

    if (newHeight > maxHeight) {
      newHeight = maxHeight
      newWidth = newHeight * aspectRatio
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    }
  }

  /**
   * Generate multiple sizes of an image (responsive images)
   * @param file Original image file
   * @param sizes Array of sizes to generate
   * @returns Array of optimized images
   */
  static async generateResponsiveImages(
    file: File,
    sizes: Array<{ width: number; height?: number; suffix: string }> = [
      { width: 400, suffix: 'small' },
      { width: 800, suffix: 'medium' },
      { width: 1200, suffix: 'large' },
    ]
  ): Promise<Array<OptimizedImageResult & { suffix: string }>> {
    const results = []

    for (const size of sizes) {
      const optimized = await this.optimizeImage(file, {
        maxWidth: size.width,
        maxHeight: size.height || size.width,
        quality: 0.8,
        format: 'webp', // Use WebP for better compression
      })

      results.push({
        ...optimized,
        suffix: size.suffix,
      })
    }

    return results
  }

  /**
   * Convert image to WebP format for better compression
   * @param file Original image file
   * @param quality Compression quality (0-1)
   * @returns WebP file
   */
  static async convertToWebP(file: File, quality: number = 0.8): Promise<File> {
    const optimized = await this.optimizeImage(file, {
      format: 'webp',
      quality,
    })

    return optimized.file
  }

  /**
   * Get image metadata
   * @param file Image file
   * @returns Image metadata
   */
  static async getImageMetadata(file: File): Promise<{
    width: number
    height: number
    size: number
    type: string
    aspectRatio: number
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          size: file.size,
          type: file.type,
          aspectRatio: img.width / img.height,
        })
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Validate image file
   * @param file File to validate
   * @param options Validation options
   * @returns Validation result
   */
  static async validateImage(
    file: File,
    options: {
      maxSizeMB?: number
      minWidth?: number
      minHeight?: number
      maxWidth?: number
      maxHeight?: number
      allowedTypes?: string[]
    } = {}
  ): Promise<{ isValid: boolean; error?: string; metadata?: any }> {
    const {
      maxSizeMB = 10,
      minWidth = 100,
      minHeight = 100,
      maxWidth = 4000,
      maxHeight = 4000,
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    } = options

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

    try {
      // Get image metadata
      const metadata = await this.getImageMetadata(file)

      // Check dimensions
      if (metadata.width < minWidth || metadata.height < minHeight) {
        return {
          isValid: false,
          error: `Image dimensions (${metadata.width}x${metadata.height}) are too small. Minimum: ${minWidth}x${minHeight}`,
          metadata,
        }
      }

      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        return {
          isValid: false,
          error: `Image dimensions (${metadata.width}x${metadata.height}) are too large. Maximum: ${maxWidth}x${maxHeight}`,
          metadata,
        }
      }

      return { isValid: true, metadata }
    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to validate image',
      }
    }
  }
}