/**
 * Integration tests for photo upload functionality
 * Tests the complete flow from VibeCheckService through PhotoUploadService
 */

import { VibeCheckService } from '../VibeCheckService';
import { PhotoUploadService } from '../PhotoUploadService';
import { LocationVerificationService } from '../LocationVerificationService';
import * as Location from 'expo-location';

// Mock dependencies
jest.mock('../LocationVerificationService');
jest.mock('../PhotoUploadService');
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockLocationService = LocationVerificationService as jest.Mocked<typeof LocationVerificationService>;
const mockPhotoUploadService = PhotoUploadService as jest.Mocked<typeof PhotoUploadService>;

describe('Photo Upload Integration Tests', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  const mockVenue = {
    id: 'venue-123',
    name: 'Test Venue',
    latitude: 40.7128,
    longitude: -74.0060,
  };
  
  const mockUserLocation: Location.LocationObject = {
    coords: {
      latitude: 40.7128,
      longitude: -74.0060,
      altitude: null,
      accuracy: 5,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };

  const mockPhoto = {
    uri: 'file://test-photo.jpg',
    type: 'image/jpeg',
    name: 'test-photo.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    const { supabase } = require('../../lib/supabase');
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock venue lookup
    const mockSingle = jest.fn().mockResolvedValue({
      data: mockVenue,
      error: null,
    });
    
    const mockEq = jest.fn().mockReturnValue({
      single: mockSingle,
    });
    
    const mockSelect = jest.fn().mockReturnValue({
      eq: mockEq,
    });
    
    const mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
    });

    supabase.from = mockFrom;

    // Mock location verification
    mockLocationService.verifyUserAtVenue.mockResolvedValue({
      is_valid: true,
      distance_meters: 50,
      venue_name: 'Test Venue',
    });

    // Mock rate limiting check
    jest.spyOn(VibeCheckService, 'canUserPostVibeCheck').mockResolvedValue(true);
  });

  describe('createVibeCheck with photo upload', () => {
    it('should successfully create vibe check with photo upload progress', async () => {
      // Mock successful photo upload
      mockPhotoUploadService.uploadPhoto.mockImplementation(async (photo, userId, options) => {
        // Simulate progress updates
        if (options?.onProgress) {
          options.onProgress({ loaded: 0, total: 100, percentage: 0 });
          options.onProgress({ loaded: 25, total: 100, percentage: 25 });
          options.onProgress({ loaded: 50, total: 100, percentage: 50 });
          options.onProgress({ loaded: 75, total: 100, percentage: 75 });
          options.onProgress({ loaded: 100, total: 100, percentage: 100 });
        }
        
        return {
          data: 'https://example.com/uploaded-photo.jpg',
          error: null,
        };
      });

      // Mock vibe check insertion
      const mockVibeCheckInsert = jest.fn().mockResolvedValue({
        data: {
          id: 'vibe-123',
          venue_id: 'venue-123',
          user_id: 'user-123',
          busyness_rating: 4,
          comment: 'Great atmosphere!',
          photo_url: 'https://example.com/uploaded-photo.jpg',
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const mockInsertSelect = jest.fn().mockReturnValue({
        single: mockVibeCheckInsert,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockInsertSelect,
      });

      const mockVibeChecksFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      });

      const { supabase } = require('../../lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'venues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockVenue,
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'vibe_checks') {
          return mockVibeChecksFrom();
        }
        return {};
      });

      const formData = {
        venue_id: 'venue-123',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
        photo: mockPhoto,
      };

      const progressUpdates: any[] = [];
      
      // We can't directly test progress in createVibeCheck since it's internal,
      // but we can verify the photo upload service was called correctly
      const result = await VibeCheckService.createVibeCheck(formData, mockUserLocation);

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data?.photo_url).toBe('https://example.com/uploaded-photo.jpg');
      
      // Verify photo upload was called with correct parameters
      expect(mockPhotoUploadService.uploadPhoto).toHaveBeenCalledWith(
        mockPhoto,
        'user-123',
        expect.objectContaining({
          quality: 0.8,
          maxWidth: 1200,
          maxHeight: 1200,
        })
      );
    });

    it('should handle photo upload failure gracefully', async () => {
      // Mock photo upload failure
      mockPhotoUploadService.uploadPhoto.mockResolvedValue({
        data: null,
        error: 'Upload failed due to network error',
      });

      const formData = {
        venue_id: 'venue-123',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
        photo: mockPhoto,
      };

      const result = await VibeCheckService.createVibeCheck(formData, mockUserLocation);

      expect(result.data).toBeNull();
      expect(result.error).toBe('Photo upload failed: Upload failed due to network error');
    });

    it('should create vibe check without photo when no photo provided', async () => {
      // Mock vibe check insertion without photo
      const mockVibeCheckInsert = jest.fn().mockResolvedValue({
        data: {
          id: 'vibe-123',
          venue_id: 'venue-123',
          user_id: 'user-123',
          busyness_rating: 4,
          comment: 'Great atmosphere!',
          photo_url: null,
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      const mockInsertSelect = jest.fn().mockReturnValue({
        single: mockVibeCheckInsert,
      });

      const mockInsert = jest.fn().mockReturnValue({
        select: mockInsertSelect,
      });

      const mockVibeChecksFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      });

      const { supabase } = require('../../lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'venues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockVenue,
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'vibe_checks') {
          return mockVibeChecksFrom();
        }
        return {};
      });

      const formData = {
        venue_id: 'venue-123',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
        // No photo provided
      };

      const result = await VibeCheckService.createVibeCheck(formData, mockUserLocation);

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data?.photo_url).toBeNull();
      
      // Verify photo upload was not called
      expect(mockPhotoUploadService.uploadPhoto).not.toHaveBeenCalled();
    });

    it('should handle location verification failure', async () => {
      // Mock location verification failure
      mockLocationService.verifyUserAtVenue.mockResolvedValue({
        is_valid: false,
        distance_meters: 150,
        venue_name: 'Test Venue',
      });

      const formData = {
        venue_id: 'venue-123',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
        photo: mockPhoto,
      };

      const result = await VibeCheckService.createVibeCheck(formData, mockUserLocation);

      expect(result.data).toBeNull();
      expect(result.error).toContain('You must be within');
      
      // Verify photo upload was not attempted
      expect(mockPhotoUploadService.uploadPhoto).not.toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      // Mock rate limiting
      jest.spyOn(VibeCheckService, 'canUserPostVibeCheck').mockResolvedValue(false);

      const formData = {
        venue_id: 'venue-123',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
        photo: mockPhoto,
      };

      const result = await VibeCheckService.createVibeCheck(formData, mockUserLocation);

      expect(result.data).toBeNull();
      expect(result.error).toContain('one vibe check per venue per hour');
      
      // Verify photo upload was not attempted
      expect(mockPhotoUploadService.uploadPhoto).not.toHaveBeenCalled();
    });

    it('should handle authentication errors', async () => {
      // Mock authentication failure
      const { supabase } = require('../../lib/supabase');
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const formData = {
        venue_id: 'venue-123',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
        photo: mockPhoto,
      };

      const result = await VibeCheckService.createVibeCheck(formData, mockUserLocation);

      expect(result.data).toBeNull();
      expect(result.error).toBe('User not authenticated');
      
      // Verify photo upload was not attempted
      expect(mockPhotoUploadService.uploadPhoto).not.toHaveBeenCalled();
    });
  });

  describe('Photo upload service integration', () => {
    it('should pass correct compression options to PhotoUploadService', async () => {
      // Mock successful photo upload
      mockPhotoUploadService.uploadPhoto.mockResolvedValue({
        data: 'https://example.com/uploaded-photo.jpg',
        error: null,
      });

      // Mock vibe check insertion
      const mockVibeCheckInsert = jest.fn().mockResolvedValue({
        data: {
          id: 'vibe-123',
          photo_url: 'https://example.com/uploaded-photo.jpg',
        },
        error: null,
      });

      const { supabase } = require('../../lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'venues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockVenue,
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'vibe_checks') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: mockVibeCheckInsert,
              }),
            }),
          };
        }
        return {};
      });

      const formData = {
        venue_id: 'venue-123',
        busyness_rating: 4 as const,
        photo: mockPhoto,
      };

      await VibeCheckService.createVibeCheck(formData, mockUserLocation);

      // Verify PhotoUploadService was called with correct options
      expect(mockPhotoUploadService.uploadPhoto).toHaveBeenCalledWith(
        mockPhoto,
        'user-123',
        expect.objectContaining({
          quality: 0.8,
          maxWidth: 1200,
          maxHeight: 1200,
          onProgress: expect.any(Function),
        })
      );
    });

    it('should handle photo upload timeout scenarios', async () => {
      // Mock photo upload timeout
      mockPhotoUploadService.uploadPhoto.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Upload timeout')), 100);
        });
      });

      const formData = {
        venue_id: 'venue-123',
        busyness_rating: 4 as const,
        photo: mockPhoto,
      };

      const result = await VibeCheckService.createVibeCheck(formData, mockUserLocation);

      expect(result.data).toBeNull();
      expect(result.error).toBe('Photo upload failed: Upload timeout');
    });
  });

  describe('Error recovery and cleanup', () => {
    it('should not create vibe check if photo upload fails', async () => {
      // Mock photo upload failure
      mockPhotoUploadService.uploadPhoto.mockResolvedValue({
        data: null,
        error: 'Network error',
      });

      const mockInsert = jest.fn();
      const { supabase } = require('../../lib/supabase');
      supabase.from.mockImplementation((table: string) => {
        if (table === 'venues') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockVenue,
                  error: null,
                }),
              }),
            }),
          };
        } else if (table === 'vibe_checks') {
          return {
            insert: mockInsert,
          };
        }
        return {};
      });

      const formData = {
        venue_id: 'venue-123',
        busyness_rating: 4 as const,
        photo: mockPhoto,
      };

      const result = await VibeCheckService.createVibeCheck(formData, mockUserLocation);

      expect(result.data).toBeNull();
      expect(result.error).toBe('Photo upload failed: Network error');
      
      // Verify vibe check insertion was not attempted
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('Performance and reliability', () => {
    it('should handle concurrent photo uploads', async () => {
      // Mock multiple photo uploads
      const uploadPromises = Array.from({ length: 3 }, (_, index) => {
        mockPhotoUploadService.uploadPhoto.mockResolvedValueOnce({
          data: `https://example.com/photo-${index}.jpg`,
          error: null,
        });

        return VibeCheckService.uploadVibeCheckPhoto(
          { ...mockPhoto, name: `photo-${index}.jpg` },
          `user-${index}`
        );
      });

      const results = await Promise.all(uploadPromises);

      results.forEach((result, index) => {
        expect(result.data).toBe(`https://example.com/photo-${index}.jpg`);
        expect(result.error).toBeNull();
      });

      expect(mockPhotoUploadService.uploadPhoto).toHaveBeenCalledTimes(3);
    });

    it('should handle large photo files efficiently', async () => {
      const largePhoto = {
        ...mockPhoto,
        name: 'large-photo.jpg',
      };

      // Mock successful upload with progress tracking
      mockPhotoUploadService.uploadPhoto.mockImplementation(async (photo, userId, options) => {
        // Simulate slower upload for large file
        const progressSteps = [0, 10, 25, 50, 75, 90, 100];
        
        for (const percentage of progressSteps) {
          if (options?.onProgress) {
            options.onProgress({ 
              loaded: percentage, 
              total: 100, 
              percentage 
            });
          }
          // Small delay to simulate processing time
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        return {
          data: 'https://example.com/large-photo.jpg',
          error: null,
        };
      });

      const result = await VibeCheckService.uploadVibeCheckPhoto(largePhoto, 'user-123');

      expect(result.data).toBe('https://example.com/large-photo.jpg');
      expect(result.error).toBeNull();
    });
  });
});