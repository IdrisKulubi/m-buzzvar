import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FileUploadService } from '../file-upload-service'

// Mock CloudflareR2Service
vi.mock('../storage/cloudflare-r2-service', () => ({
  CloudflareR2Service: vi.fn().mockImplementation(() => ({
    uploadFile: vi.fn().mockResolvedValue({
      success: true,
      url: 'https://storage.example.com/test/file.jpg',
      key: 'test/file.jpg',
    }),
    deleteFile: vi.fn().mockResolvedValue({ success: true }),
    getSignedUploadUrl: vi.fn().mockResolvedValue('https://signed-url.example.com'),
    getPublicUrl: vi.fn().mockReturnValue('https://storage.example.com/test/file.jpg'),
  })),
}))

// Mock ImageOptimizer
vi.mock('../utils/image-optimization', () => ({
  ImageOptimizer: {
    optimizeImage: vi.fn().mockResolvedValue({
      file: new File(['optimized'], 'optimized.webp', { type: 'image/webp' }),
      originalSize: 2048,
      optimizedSize: 1024,
      compressionRatio: 50,
      dimensions: { width: 800, height: 600 },
    }),
    validateImage: vi.fn().mockResolvedValue({
      isValid: true,
      metadata: { width: 1200, height: 800, size: 2048, type: 'image/jpeg' },
    }),
  },
}))

describe('FileUploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadFile', () => {
    it('should upload image file successfully', async () => {
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' })
      
      const result = await FileUploadService.uploadFile(file, 'user123', 'test-prefix')

      expect(result.success).toBe(true)
      expect(result.url).toBe('https://storage.example.com/test/file.jpg')
      expect(result.key).toBe('test/file.jpg')
      expect(result.error).toBeNull()
    })

    it('should upload non-image file successfully', async () => {
      const file = new File(['test video'], 'test.mp4', { type: 'video/mp4' })
      
      const result = await FileUploadService.uploadFile(file, 'user123')

      expect(result.success).toBe(true)
      expect(result.url).toBe('https://storage.example.com/test/file.jpg')
    })

    it('should handle validation errors', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      
      const result = await FileUploadService.uploadFile(file, 'user123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('File type application/pdf is not allowed')
    })

    it('should call progress callback', async () => {
      const file = new File(['test image'], 'test.jpg', { type: 'image/jpeg' })
      const onProgress = vi.fn()
      
      await FileUploadService.uploadFile(file, 'user123', undefined, { onProgress })

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          loaded: expect.any(Number),
          total: 100,
          percentage: expect.any(Number),
        })
      )
    })
  })

  describe('uploadFiles', () => {
    it('should upload multiple files', async () => {
      const files = [
        new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
      ]
      
      const results = await FileUploadService.uploadFiles(files, 'user123')

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const url = 'https://storage.example.com/test/file.jpg'
      
      const result = await FileUploadService.deleteFile(url)

      expect(result.success).toBe(true)
    })

    it('should handle invalid URL', async () => {
      const url = 'invalid-url'
      
      const result = await FileUploadService.deleteFile(url)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid file URL')
    })
  })

  describe('getSignedUploadUrl', () => {
    it('should generate signed upload URL', async () => {
      const result = await FileUploadService.getSignedUploadUrl(
        'user123',
        'test.jpg',
        'image/jpeg',
        'test-prefix'
      )

      expect(result.signedUrl).toBe('https://signed-url.example.com')
      expect(result.key).toMatch(/^test-prefix\/user123\/\d+_[a-z0-9]+\.jpg$/)
      expect(result.publicUrl).toBe('https://storage.example.com/test/file.jpg')
    })
  })

  describe('validateFile', () => {
    it('should validate image file', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      
      const result = await FileUploadService.validateFile(file)

      expect(result.isValid).toBe(true)
      expect(result.metadata).toBeDefined()
    })

    it('should validate non-image file', async () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' })
      
      const result = await FileUploadService.validateFile(file)

      expect(result.isValid).toBe(true)
    })
  })
})