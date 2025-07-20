import { PhotoUploadServiceR2 } from '../PhotoUploadServiceR2'
import { CloudflareR2Service } from '../../lib/storage/cloudflare-r2-service'

// Mock the CloudflareR2Service
jest.mock('../../lib/storage/cloudflare-r2-service')
const MockedCloudflareR2Service = CloudflareR2Service as jest.MockedClass<typeof CloudflareR2Service>

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({
    uri: 'file://compressed-image.jpg',
    width: 800,
    height: 600,
  }),
  SaveFormat: {
    JPEG: 'jpeg',
  },
}))

// Mock fetch for blob conversion
global.fetch = jest.fn()

describe('PhotoUploadServiceR2', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock R2 service instance methods
    MockedCloudflareR2Service.prototype.uploadFile = jest.fn().mockResolvedValue({
      success: true,
      url: 'https://storage.example.com/vibe-checks/user123/photo.jpg',
      key: 'vibe-checks/user123/photo.jpg',
    })
    
    MockedCloudflareR2Service.prototype.deleteFile = jest.fn().mockResolvedValue({
      success: true,
    })

    // Mock static methods
    MockedCloudflareR2Service.generateFileKey = jest.fn().mockReturnValue('vibe-checks/user123/photo.jpg')
    MockedCloudflareR2Service.extractKeyFromUrl = jest.fn().mockReturnValue('vibe-checks/user123/photo.jpg')

    // Mock fetch for blob conversion
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['image data'], { type: 'image/jpeg' })),
    })
  })

  describe('uploadPhoto', () => {
    const mockPhoto = {
      uri: 'file://test-photo.jpg',
      type: 'image/jpeg',
      name: 'test-photo.jpg',
    }

    it('should upload photo successfully', async () => {
      const result = await PhotoUploadServiceR2.uploadPhoto(mockPhoto, 'user123')

      expect(result.data).toBe('https://storage.example.com/vibe-checks/user123/photo.jpg')
      expect(result.error).toBeNull()
      expect(MockedCloudflareR2Service.prototype.uploadFile).toHaveBeenCalledWith(
        expect.any(Blob),
        'vibe-checks/user123/photo.jpg',
        'image/jpeg',
        expect.any(Function)
      )
    })

    it('should handle compression options', async () => {
      const options = {
        quality: 0.6,
        maxWidth: 800,
        maxHeight: 800,
      }

      await PhotoUploadServiceR2.uploadPhoto(mockPhoto, 'user123', options)

      const { manipulateAsync } = require('expo-image-manipulator')
      expect(manipulateAsync).toHaveBeenCalledWith(
        mockPhoto.uri,
        expect.any(Array),
        expect.objectContaining({
          compress: 0.6,
        })
      )
    })

    it('should call progress callback', async () => {
      const onProgress = jest.fn()

      await PhotoUploadServiceR2.uploadPhoto(mockPhoto, 'user123', { onProgress })

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          loaded: expect.any(Number),
          total: 100,
          percentage: expect.any(Number),
        })
      )
    })

    it('should handle upload errors', async () => {
      MockedCloudflareR2Service.prototype.uploadFile = jest.fn().mockResolvedValue({
        success: false,
        error: 'Upload failed',
      })

      const result = await PhotoUploadServiceR2.uploadPhoto(mockPhoto, 'user123')

      expect(result.data).toBeNull()
      expect(result.error).toBe('Upload failed')
    })

    it('should handle file size validation errors', async () => {
      // Mock fetch to return a large blob
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue({
          size: 10 * 1024 * 1024, // 10MB
        }),
      })

      const result = await PhotoUploadServiceR2.uploadPhoto(mockPhoto, 'user123')

      expect(result.data).toBeNull()
      expect(result.error).toContain('exceeds maximum allowed size')
    })
  })

  describe('deletePhoto', () => {
    it('should delete photo successfully', async () => {
      const photoUrl = 'https://storage.example.com/vibe-checks/user123/photo.jpg'

      const result = await PhotoUploadServiceR2.deletePhoto(photoUrl)

      expect(result.success).toBe(true)
      expect(result.error).toBeNull()
      expect(MockedCloudflareR2Service.extractKeyFromUrl).toHaveBeenCalledWith(photoUrl)
      expect(MockedCloudflareR2Service.prototype.deleteFile).toHaveBeenCalledWith('vibe-checks/user123/photo.jpg')
    })

    it('should handle invalid URL', async () => {
      MockedCloudflareR2Service.extractKeyFromUrl = jest.fn().mockReturnValue(null)

      const result = await PhotoUploadServiceR2.deletePhoto('invalid-url')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid photo URL')
    })

    it('should handle deletion errors', async () => {
      MockedCloudflareR2Service.prototype.deleteFile = jest.fn().mockResolvedValue({
        success: false,
        error: 'Deletion failed',
      })

      const result = await PhotoUploadServiceR2.deletePhoto('https://storage.example.com/photo.jpg')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Deletion failed')
    })
  })

  describe('uploadPhotoBatch', () => {
    const mockPhotos = [
      { uri: 'file://photo1.jpg', type: 'image/jpeg', name: 'photo1.jpg' },
      { uri: 'file://photo2.jpg', type: 'image/jpeg', name: 'photo2.jpg' },
    ]

    it('should upload multiple photos', async () => {
      const results = await PhotoUploadServiceR2.uploadPhotoBatch(mockPhotos, 'user123')

      expect(results).toHaveLength(2)
      expect(results[0].data).toBeTruthy()
      expect(results[1].data).toBeTruthy()
      expect(MockedCloudflareR2Service.prototype.uploadFile).toHaveBeenCalledTimes(2)
    })

    it('should handle batch progress', async () => {
      const onProgress = jest.fn()

      await PhotoUploadServiceR2.uploadPhotoBatch(mockPhotos, 'user123', { onProgress })

      expect(onProgress).toHaveBeenCalled()
    })
  })

  describe('getImageDimensions', () => {
    it('should return image dimensions', async () => {
      const dimensions = await PhotoUploadServiceR2.getImageDimensions('file://test.jpg')

      expect(dimensions).toEqual({
        width: 800,
        height: 600,
      })
    })

    it('should handle errors', async () => {
      const { manipulateAsync } = require('expo-image-manipulator')
      manipulateAsync.mockRejectedValueOnce(new Error('Failed to load image'))

      const dimensions = await PhotoUploadServiceR2.getImageDimensions('file://invalid.jpg')

      expect(dimensions).toBeNull()
    })
  })

  describe('extractFileNameFromUrl', () => {
    it('should extract filename from URL', () => {
      const url = 'https://storage.example.com/vibe-checks/user123/photo.jpg'
      
      const fileName = PhotoUploadServiceR2.extractFileNameFromUrl(url)

      expect(MockedCloudflareR2Service.extractKeyFromUrl).toHaveBeenCalledWith(url)
      expect(fileName).toBe('vibe-checks/user123/photo.jpg')
    })
  })
})