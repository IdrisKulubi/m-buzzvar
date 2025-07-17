import { PhotoUploadService, PhotoUploadProgress } from '../PhotoUploadService';
import * as ImageManipulator from 'expo-image-manipulator';

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
  },
}));

// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

// Mock fetch for blob conversion
global.fetch = jest.fn();

const mockImageManipulator = ImageManipulator as jest.Mocked<typeof ImageManipulator>;

describe('PhotoUploadService Integration Tests', () => {
  const mockPhoto = {
    uri: 'file://test-photo.jpg',
    type: 'image/jpeg',
    name: 'test-photo.jpg',
  };

  const userId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(['test'], { type: 'image/jpeg' })),
    });
  });

  describe('uploadPhoto', () => {
    it('should successfully upload a photo with compression', async () => {
      // Mock image compression
      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file://compressed-photo.jpg',
        width: 800,
        height: 600,
      });

      // Mock supabase storage
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/photo.jpg' },
      });
      
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'vibe-checks/test-user-123/123456789_abc123.jpg' },
        error: null,
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      const { supabase } = require('../../lib/supabase');
      supabase.storage.from = mockFrom;

      const result = await PhotoUploadService.uploadPhoto(mockPhoto, userId);

      expect(result.data).toBe('https://example.com/photo.jpg');
      expect(result.error).toBeNull();
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledTimes(2); // Once for info, once for compression
      expect(mockUpload).toHaveBeenCalled();
    });

    it('should track upload progress correctly', async () => {
      // Mock image compression
      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file://compressed-photo.jpg',
        width: 800,
        height: 600,
      });

      // Mock supabase storage
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/photo.jpg' },
      });
      
      const mockUpload = jest.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      const { supabase } = require('../../lib/supabase');
      supabase.storage.from = mockFrom;

      const progressUpdates: PhotoUploadProgress[] = [];
      const onProgress = (progress: PhotoUploadProgress) => {
        progressUpdates.push(progress);
      };

      await PhotoUploadService.uploadPhoto(mockPhoto, userId, { onProgress });

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].percentage).toBe(0);
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
      
      // Check that progress increases monotonically
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].percentage).toBeGreaterThanOrEqual(progressUpdates[i - 1].percentage);
      }
    });

    it('should handle image compression errors', async () => {
      mockImageManipulator.manipulateAsync.mockRejectedValue(new Error('Compression failed'));

      const result = await PhotoUploadService.uploadPhoto(mockPhoto, userId);

      expect(result.data).toBeNull();
      expect(result.error).toBe('Failed to compress image');
    });

    it('should handle file size validation errors', async () => {
      // Mock image compression
      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file://compressed-photo.jpg',
        width: 800,
        height: 600,
      });

      // Mock large file size
      const largeBlobSize = 6 * 1024 * 1024; // 6MB
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue({
          size: largeBlobSize,
        }),
      });

      const result = await PhotoUploadService.uploadPhoto(mockPhoto, userId);

      expect(result.data).toBeNull();
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should handle supabase upload errors', async () => {
      // Mock image compression
      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file://compressed-photo.jpg',
        width: 800,
        height: 600,
      });

      // Mock supabase storage error
      const mockUpload = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        upload: mockUpload,
      });

      const { supabase } = require('../../lib/supabase');
      supabase.storage.from = mockFrom;

      const result = await PhotoUploadService.uploadPhoto(mockPhoto, userId);

      expect(result.data).toBeNull();
      expect(result.error).toBe('Storage quota exceeded');
    });
  });

  describe('deletePhoto', () => {
    it('should successfully delete a photo', async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        error: null,
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        remove: mockRemove,
      });

      const { supabase } = require('../../lib/supabase');
      supabase.storage.from = mockFrom;

      const fileName = 'vibe-checks/user-123/photo.jpg';
      const result = await PhotoUploadService.deletePhoto(fileName);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(mockRemove).toHaveBeenCalledWith([fileName]);
    });

    it('should handle deletion errors', async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        error: { message: 'File not found' },
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        remove: mockRemove,
      });

      const { supabase } = require('../../lib/supabase');
      supabase.storage.from = mockFrom;

      const fileName = 'vibe-checks/user-123/nonexistent.jpg';
      const result = await PhotoUploadService.deletePhoto(fileName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });

  describe('extractFileNameFromUrl', () => {
    it('should extract filename from valid public URL', () => {
      const publicUrl = 'https://example.supabase.co/storage/v1/object/public/photos/vibe-checks/user-123/photo.jpg';
      const fileName = PhotoUploadService.extractFileNameFromUrl(publicUrl);
      
      expect(fileName).toBe('vibe-checks/user-123/photo.jpg');
    });

    it('should return null for invalid URL', () => {
      const invalidUrl = 'not-a-valid-url';
      const fileName = PhotoUploadService.extractFileNameFromUrl(invalidUrl);
      
      expect(fileName).toBeNull();
    });
  });

  describe('getImageDimensions', () => {
    it('should return image dimensions', async () => {
      mockImageManipulator.manipulateAsync.mockResolvedValue({
        uri: 'file://test.jpg',
        width: 1920,
        height: 1080,
      });

      const dimensions = await PhotoUploadService.getImageDimensions('file://test.jpg');

      expect(dimensions).toEqual({
        width: 1920,
        height: 1080,
      });
    });

    it('should return null on error', async () => {
      mockImageManipulator.manipulateAsync.mockRejectedValue(new Error('Invalid image'));

      const dimensions = await PhotoUploadService.getImageDimensions('file://invalid.jpg');

      expect(dimensions).toBeNull();
    });
  });
});