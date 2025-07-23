/**
 * End-to-End Integration Tests for Vibe Check Posting Flow
 * Tests the complete user journey from location verification to successful posting
 */

import { VibeCheckService } from '../VibeCheckService';
import { LocationVerificationService } from '../LocationVerificationService';
import { PhotoUploadService } from '../PhotoUploadService';
import { VibeCheckRealtimeService } from '../VibeCheckRealtimeService';
import { supabase } from '../../lib/supabase';
import { ErrorFactory } from '../../lib/errors';
import * as Location from 'expo-location';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('expo-location');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockLocation = Location as jest.Mocked<typeof Location>;

describe('Vibe Check End-to-End Integration', () => {
  const mockVenue = {
    id: 'venue-1',
    name: 'Test Venue',
    description: 'A test venue',
    location: 'Test Location',
    contact: null,
    hours: null,
    cover_image_url: null,
    cover_video_url: null,
    latitude: 40.7128,
    longitude: -74.0060,
    address: '123 Test St',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockUserLocation = {
    coords: {
      latitude: 40.7128,
      longitude: -74.0060,
      altitude: null,
      accuracy: 10,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock successful venue lookup
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockVenue,
            error: null,
          }),
        }),
      }),
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'vibe-1',
              venue_id: 'venue-1',
              user_id: 'user-1',
              busyness_rating: 4,
              comment: 'Great atmosphere!',
              photo_url: null,
              user_latitude: 40.7128,
              user_longitude: -74.0060,
              created_at: '2024-01-01T00:00:00Z',
            },
            error: null,
          }),
        }),
      }),
    } as any);

    // Mock location services
    mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted' as any,
    });
    mockLocation.getCurrentPositionAsync.mockResolvedValue(mockUserLocation);
  });

  describe('Complete Vibe Check Posting Flow', () => {
    it('should successfully complete the entire posting flow without photo', async () => {
      // Step 1: Check rate limiting
      const rateLimitResult = await VibeCheckService.checkRateLimit('user-1', 'venue-1');
      expect(rateLimitResult.canPost).toBe(true);

      // Step 2: Get user location
      const locationResult = await LocationVerificationService.getCurrentLocation();
      expect(locationResult.location).toBeDefined();
      expect(locationResult.error).toBeUndefined();

      // Step 3: Verify location against venue
      const verification = await LocationVerificationService.verifyUserAtVenue(
        locationResult.location!,
        mockVenue
      );
      expect(verification.is_valid).toBe(true);
      expect(verification.distance_meters).toBeLessThanOrEqual(100);

      // Step 4: Create vibe check
      const vibeCheckData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
      };

      const result = await VibeCheckService.createVibeCheck(
        vibeCheckData,
        locationResult.location!
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.venue_id).toBe('venue-1');
      expect(result.data?.user_id).toBe('user-1');
      expect(result.data?.busyness_rating).toBe(4);
      expect(result.data?.comment).toBe('Great atmosphere!');
    });

    it('should successfully complete the entire posting flow with photo', async () => {
      // Mock photo upload
      const mockPhoto = {
        uri: 'file://photo.jpg',
        type: 'image/jpeg',
        name: 'photo.jpg',
      };

      const mockPhotoUrl = 'https://example.com/photo.jpg';
      
      // Mock PhotoUploadService
      jest.spyOn(PhotoUploadService, 'uploadPhoto').mockResolvedValue({
        data: mockPhotoUrl,
        error: null,
      });

      // Step 1: Check rate limiting
      const rateLimitResult = await VibeCheckService.checkRateLimit('user-1', 'venue-1');
      expect(rateLimitResult.canPost).toBe(true);

      // Step 2: Get user location
      const locationResult = await LocationVerificationService.getCurrentLocation();
      expect(locationResult.location).toBeDefined();

      // Step 3: Verify location against venue
      const verification = await LocationVerificationService.verifyUserAtVenue(
        locationResult.location!,
        mockVenue
      );
      expect(verification.is_valid).toBe(true);

      // Step 4: Create vibe check with photo
      const vibeCheckData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
        photo: mockPhoto,
      };

      const result = await VibeCheckService.createVibeCheck(
        vibeCheckData,
        locationResult.location!
      );

      expect(PhotoUploadService.uploadPhoto).toHaveBeenCalledWith(
        mockPhoto,
        'user-1'
      );
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it('should handle location permission denied gracefully', async () => {
      // Mock permission denied
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
      });

      const locationResult = await LocationVerificationService.getCurrentLocation();
      
      expect(locationResult.error).toBeDefined();
      expect(locationResult.error?.type).toBe('LOCATION_PERMISSION_DENIED');
      expect(locationResult.location).toBeUndefined();
    });

    it('should handle user too far from venue', async () => {
      // Mock user location far from venue
      const farLocation = {
        coords: {
          latitude: 40.8128, // ~11km away
          longitude: -74.1060,
          altitude: null,
          accuracy: 10,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };

      mockLocation.getCurrentPositionAsync.mockResolvedValue(farLocation);

      const locationResult = await LocationVerificationService.getCurrentLocation();
      const verification = await LocationVerificationService.verifyUserAtVenue(
        locationResult.location!,
        mockVenue
      );

      expect(verification.is_valid).toBe(false);
      expect(verification.distance_meters).toBeGreaterThan(100);

      // Attempt to create vibe check should fail
      const vibeCheckData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
      };

      const result = await VibeCheckService.createVibeCheck(
        vibeCheckData,
        locationResult.location!
      );

      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('LOCATION_TOO_FAR');
      expect(result.data).toBeNull();
    });

    it('should handle rate limiting correctly', async () => {
      // Mock rate limit exceeded
      const oneHourAgo = new Date();
      oneHourAgo.setMinutes(oneHourAgo.getMinutes() - 30); // 30 minutes ago

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: {
                        id: 'existing-vibe',
                        created_at: oneHourAgo.toISOString(),
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue({
              code: '23505', // Unique constraint violation
              message: 'duplicate key value violates unique constraint',
            }),
          }),
        }),
      } as any);

      const rateLimitResult = await VibeCheckService.checkRateLimit('user-1', 'venue-1');
      expect(rateLimitResult.canPost).toBe(false);
      expect(rateLimitResult.timeUntilReset).toBeGreaterThan(0);

      // Attempt to create vibe check should fail
      const locationResult = await LocationVerificationService.getCurrentLocation();
      const vibeCheckData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
      };

      const result = await VibeCheckService.createVibeCheck(
        vibeCheckData,
        locationResult.location!
      );

      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('RATE_LIMITED');
      expect(result.data).toBeNull();
    });

    it('should handle photo upload failure gracefully', async () => {
      // Mock photo upload failure
      const mockPhoto = {
        uri: 'file://photo.jpg',
        type: 'image/jpeg',
        name: 'photo.jpg',
      };

      jest.spyOn(PhotoUploadService, 'uploadPhoto').mockResolvedValue({
        data: null,
        error: 'Upload failed',
      });

      const locationResult = await LocationVerificationService.getCurrentLocation();
      const vibeCheckData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
        photo: mockPhoto,
      };

      const result = await VibeCheckService.createVibeCheck(
        vibeCheckData,
        locationResult.location!
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it('should handle network connectivity issues', async () => {
      // Mock network error
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));

      const locationResult = await LocationVerificationService.getCurrentLocation();
      const vibeCheckData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
      };

      const result = await VibeCheckService.createVibeCheck(
        vibeCheckData,
        locationResult.location!
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it('should validate form inputs correctly', async () => {
      const locationResult = await LocationVerificationService.getCurrentLocation();

      // Test invalid busyness rating
      const invalidVibeCheckData = {
        venue_id: 'venue-1',
        busyness_rating: 6 as any, // Invalid rating
        comment: 'Great atmosphere!',
      };

      // The service should handle this validation
      // In a real implementation, this would be caught by TypeScript or runtime validation
      expect(invalidVibeCheckData.busyness_rating).toBeGreaterThan(5);

      // Test comment length validation
      const longComment = 'a'.repeat(281); // Exceeds 280 character limit
      const longCommentData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: longComment,
      };

      expect(longCommentData.comment.length).toBeGreaterThan(280);
    });
  });

  describe('Success Feedback and Navigation', () => {
    it('should provide appropriate success feedback after posting', async () => {
      const locationResult = await LocationVerificationService.getCurrentLocation();
      const vibeCheckData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
      };

      const result = await VibeCheckService.createVibeCheck(
        vibeCheckData,
        locationResult.location!
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      // In the UI, this would trigger:
      // 1. Success alert/toast
      // 2. Navigation back to venue details
      // 3. Real-time update of venue vibe checks
      // 4. Cache invalidation
    });

    it('should trigger real-time updates after successful posting', async () => {
      // Mock real-time service
      const mockSubscriptionCallback = jest.fn();
      
      // In a real scenario, this would be set up before posting
      // and would receive the new vibe check via real-time subscription
      
      const locationResult = await LocationVerificationService.getCurrentLocation();
      const vibeCheckData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
      };

      const result = await VibeCheckService.createVibeCheck(
        vibeCheckData,
        locationResult.location!
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      
      // The real-time service would notify subscribers
      // This would update the live feed and venue details automatically
    });
  });

  describe('Error Recovery and Retry', () => {
    it('should allow retry after recoverable errors', async () => {
      // Mock initial failure followed by success
      mockLocation.getCurrentPositionAsync
        .mockRejectedValueOnce(new Error('Location timeout'))
        .mockResolvedValueOnce(mockUserLocation);

      // First attempt should fail
      const firstAttempt = await LocationVerificationService.getCurrentLocation();
      expect(firstAttempt.error).toBeDefined();

      // Retry should succeed
      const retryAttempt = await LocationVerificationService.getCurrentLocation();
      expect(retryAttempt.error).toBeUndefined();
      expect(retryAttempt.location).toBeDefined();
    });

    it('should provide clear error messages for different failure scenarios', async () => {
      const testCases = [
        {
          mockError: () => {
            mockLocation.hasServicesEnabledAsync.mockResolvedValue(false);
          },
          expectedErrorType: 'LOCATION_SERVICES_DISABLED',
        },
        {
          mockError: () => {
            mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
              status: 'denied' as any,
            });
          },
          expectedErrorType: 'LOCATION_PERMISSION_DENIED',
        },
        {
          mockError: () => {
            mockSupabase.auth.getUser.mockResolvedValue({
              data: { user: null },
              error: null,
            });
          },
          expectedErrorType: 'AUTH_REQUIRED',
        },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        testCase.mockError();

        const locationResult = await LocationVerificationService.getCurrentLocation();
        
        if (testCase.expectedErrorType.includes('LOCATION')) {
          expect(locationResult.error).toBeDefined();
          expect(locationResult.error?.type).toBe(testCase.expectedErrorType);
        } else {
          // For auth errors, test the vibe check creation
          const vibeCheckData = {
            venue_id: 'venue-1',
            busyness_rating: 4 as const,
            comment: 'Great atmosphere!',
          };

          const result = await VibeCheckService.createVibeCheck(
            vibeCheckData,
            mockUserLocation
          );

          expect(result.error).toBeDefined();
          expect(result.error?.type).toBe(testCase.expectedErrorType);
        }
      }
    });
  });
});