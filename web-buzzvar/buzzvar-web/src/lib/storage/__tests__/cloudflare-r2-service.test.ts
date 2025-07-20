import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CloudflareR2Service } from '../cloudflare-r2-service'

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com'),
}))

// Mock environment variables
const originalEnv = process.env

describe('CloudflareR2Service', () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CLOUDFLARE_R2_ACCESS_KEY_ID: 'test-access-key',
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'test-secret-key',
      CLOUDFLARE_R2_BUCKET: 'test-bucket',
      CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
      CLOUDFLARE_R2_PUBLIC_DOMAIN: 'https://test-storage.example.com',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with environment variables', () => {
      expect(() => new CloudflareR2Service()).not.toThrow()
    })

    it('should throw error if required environment variables are missing', () => {
      delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
      
      expect(() => new CloudflareR2Service()).toThrow(
        'Missing required Cloudflare R2 environment variables'
      )
    })
  })

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const { S3Client } = await import('@aws-sdk/client-s3')
      const mockSend = vi.fn().mockResolvedValue({})
      
      // @ts-ignore
      S3Client.mockImplementation(() => ({ send: mockSend }))

      const service = new CloudflareR2Service()
      const buffer = Buffer.from('test file content')
      
      const result = await service.uploadFile(buffer, 'test/file.txt', 'text/plain')

      expect(result.success).toBe(true)
      expect(result.url).toBe('https://test-storage.example.com/test/file.txt')
      expect(result.key).toBe('test/file.txt')
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('should handle upload errors', async () => {
      const { S3Client } = await import('@aws-sdk/client-s3')
      const mockSend = vi.fn().mockRejectedValue(new Error('Upload failed'))
      
      // @ts-ignore
      S3Client.mockImplementation(() => ({ send: mockSend }))

      const service = new CloudflareR2Service()
      const buffer = Buffer.from('test file content')
      
      const result = await service.uploadFile(buffer, 'test/file.txt', 'text/plain')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload failed')
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const { S3Client } = await import('@aws-sdk/client-s3')
      const mockSend = vi.fn().mockResolvedValue({})
      
      // @ts-ignore
      S3Client.mockImplementation(() => ({ send: mockSend }))

      const service = new CloudflareR2Service()
      
      const result = await service.deleteFile('test/file.txt')

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledTimes(1)
    })

    it('should handle deletion errors', async () => {
      const { S3Client } = await import('@aws-sdk/client-s3')
      const mockSend = vi.fn().mockRejectedValue(new Error('Deletion failed'))
      
      // @ts-ignore
      S3Client.mockImplementation(() => ({ send: mockSend }))

      const service = new CloudflareR2Service()
      
      const result = await service.deleteFile('test/file.txt')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Deletion failed')
    })
  })

  describe('getSignedUploadUrl', () => {
    it('should generate signed upload URL', async () => {
      const service = new CloudflareR2Service()
      
      const url = await service.getSignedUploadUrl('test/file.txt', 'text/plain')

      expect(url).toBe('https://signed-url.example.com')
    })
  })

  describe('getPublicUrl', () => {
    it('should generate public URL', () => {
      const service = new CloudflareR2Service()
      
      const url = service.getPublicUrl('test/file.txt')

      expect(url).toBe('https://test-storage.example.com/test/file.txt')
    })
  })

  describe('static methods', () => {
    describe('extractKeyFromUrl', () => {
      it('should extract key from R2 URL', () => {
        const url = 'https://storage.example.com/path/to/file.jpg'
        const key = CloudflareR2Service.extractKeyFromUrl(url)
        
        expect(key).toBe('path/to/file.jpg')
      })

      it('should return null for invalid URL', () => {
        const key = CloudflareR2Service.extractKeyFromUrl('invalid-url')
        
        expect(key).toBeNull()
      })
    })

    describe('generateFileKey', () => {
      it('should generate file key with prefix', () => {
        const key = CloudflareR2Service.generateFileKey('user123', 'photo.jpg', 'vibe-checks')
        
        expect(key).toMatch(/^vibe-checks\/user123\/\d+_[a-z0-9]+\.jpg$/)
      })

      it('should generate file key without prefix', () => {
        const key = CloudflareR2Service.generateFileKey('user123', 'photo.jpg')
        
        expect(key).toMatch(/^user123\/\d+_[a-z0-9]+\.jpg$/)
      })
    })

    describe('validateFile', () => {
      it('should validate file successfully', () => {
        const file = { size: 1024 * 1024, type: 'image/jpeg' } // 1MB JPEG
        
        const result = CloudflareR2Service.validateFile(file)
        
        expect(result.isValid).toBe(true)
      })

      it('should reject file with invalid type', () => {
        const file = { size: 1024 * 1024, type: 'application/pdf' }
        
        const result = CloudflareR2Service.validateFile(file)
        
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('File type application/pdf is not allowed')
      })

      it('should reject file that is too large', () => {
        const file = { size: 20 * 1024 * 1024, type: 'image/jpeg' } // 20MB
        
        const result = CloudflareR2Service.validateFile(file, ['image/jpeg'], 10)
        
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('exceeds maximum allowed size')
      })
    })
  })
})