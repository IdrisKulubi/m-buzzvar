/**
 * Complete End-to-End Vibe Check Posting Flow Test
 * Tests the entire user journey from form validation to successful posting
 */

import { VibeCheckService } from '../VibeCheckService';
import { LocationVerificationService } from '../LocationVerificationService';
import { PhotoUploadService } from '../PhotoUploadService';
import { VibeCheckValidator } from '../../lib/vibeCheckValidation';
import { supabase } from '../../lib/supabase';
import { ErrorFactory } from '../../lib/errors';
import * as Location from 'expo-location';

// Mock dependencies
jest.mock('../../lib/supabase');
jest.mock('expo-location');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockLocation = Location as jest.Mocked<typeof Location>;

describe('Complete Vibe Check Posting Flow', () => {
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

  describe('Successful Complete Flow', () => {
    it('should complete the entire vibe check posting flow successfully', async () => {
      // Step 1: Form Validation
      const formData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
      };

      const locationVerification = {
        is_valid: true,
        distance_meters: 50,
        venue_name: 'Test Venue',
      };

      // Validate form data
      const validation = VibeCheckValidator.validateVibeCheckForm(formData, locationVerification);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Step 2: Location Verification
      const locationResult = await LocationVerificationService.getCurrentLocation();
      expect(locationResult.location).toBeDefined();
      expect(locationResult.error).toBeUndefined();

      const venueVerification = await LocationVerificationService.verifyUserAtVenue(
        locationResult.location!,
        mockVenue
      );
      expect(venueVerification.is_valid).toBe(true);
      expect(venueVerification.distance_meters).toBeLessThanOrEqual(100);

      // Step 3: Rate Limit Check
      const rateLimitResult = await VibeCheckService.checkRateLimit('user-1', 'venue-1');
      expect(rateLimitResult.canPost).toBe(true);

      // Step 4: Create Vibe Check
      const result = await VibeCheckService.createVibeCheck(
        formData,
        locationResult.location!
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.venue_id).toBe('venue-1');
      expect(result.data?.user_id).toBe('user-1');
      expect(result.data?.busyness_rating).toBe(4);
      expect(result.data?.comment).toBe('Great atmosphere!');

      // Verify all service calls were made correctly
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('venues');
      expect(mockSupabase.from).toHaveBeenCalledWith('vibe_checks');
      expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalled();
    });

    it('should complete the flow with photo upload', async () => {
      const mockPhoto = {
        uri: 'file://photo.jpg',
        type: 'image/jpeg',
        name: 'photo.jpg',
      };

      const mockPhotoUrl = 'https://example.com/photo.jpg';

      // Mock photo upload
      jest.spyOn(PhotoUploadService, 'uploadPhoto').mockResolvedValue({
        data: mockPhotoUrl,
        error: null,
      });

      // Update mock to return photo URL
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
                photo_url: mockPhotoUrl,
                user_latitude: 40.7128,
                user_longitude: -74.0060,
                created_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const formData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
        photo: mockPhoto,
      };

      // Validate form with photo
      const validation = VibeCheckValidator.validateVibeCheckForm(formData);
      expect(validation.isValid).toBe(true);

      // Complete flow
      const locationResult = await LocationVerificationService.getCurrentLocation();
      const result = await VibeCheckService.createVibeCheck(
        formData,
        locationResult.location!
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.photo_url).toBe(mockPhotoUrl);
      expect(PhotoUploadService.uploadPhoto).toHaveBeenCalledWith(mockPhoto, 'user-1');
    });
  });

  describe('Error Handling in Complete Flow', () => {
    it('should handle form validation errors', async () => {
      const invalidFormData = {
        venue_id: '',
        busyness_rating: 6 as any,
        comment: 'a'.repeat(281), // Too long
      };

      const validation = VibeCheckValidator.validateVibeCheckForm(invalidFormData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      // Should not proceed with invalid form data
      const validationSummary = VibeCheckValidator.getValidationSummary(validation);
      expect(validationSummary.hasErrors).toBe(true);
      expect(validationSummary.errorCount).toBeGreaterThan(0);
    });

    it('should handle location permission denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
      });

      const locationResult = await LocationVerificationService.getCurrentLocation();
      expect(locationResult.error).toBeDefined();
      expect(locationResult.error?.type).toBe('LOCATION_PERMISSION_DENIED');

      // Should not proceed without location
      const formData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
      };

      // Cannot create vibe check without valid location
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

      // Form validation should catch this
      const formData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
      };

      const validation = VibeCheckValidator.validateVibeCheckForm(formData, verification);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].code).toBe('LOCATION_TOO_FAR');
    });

    it('should handle rate limiting', async () => {
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

      // Validation should catch rate limiting
      const rateLimitValidation = VibeCheckValidator.validateRateLimit(rateLimitResult);
      expect(rateLimitValidation.isValid).toBe(false);
      expect(rateLimitValidation.errors[0].code).toBe('RATE_LIMITED');
    });

    it('should handle photo upload failure', async () => {
      const mockPhoto = {
        uri: 'file://photo.jpg',
        type: 'image/jpeg',
        name: 'photo.jpg',
      };

      // Mock photo upload failure
      jest.spyOn(PhotoUploadService, 'uploadPhoto').mockResolvedValue({
        data: null,
        error: 'Upload failed',
      });

      const formData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
        photo: mockPhoto,
      };

      const locationResult = await LocationVerificationService.getCurrentLocation();
      const result = await VibeCheckService.createVibeCheck(
        formData,
        locationResult.location!
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const formData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
      };

      const locationResult = await LocationVerificationService.getCurrentLocation();
      const result = await VibeCheckService.createVibeCheck(
        formData,
        locationResult.location!
      );

      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe('AUTH_REQUIRED');
      expect(result.data).toBeNull();
    });

    it('should handle database errors', async () => {
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
            single: jest.fn().mockRejectedValue(new Error('Database connection failed')),
          }),
        }),
      } as any);

      const formData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
      };

      const locationResult = await LocationVerificationService.getCurrentLocation();
      const result = await VibeCheckService.createVibeCheck(
        formData,
        locationResult.location!
      );

      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe('Success Feedback and Navigation', () => {
    it('should provide success feedback after posting', async () => {
      const formData = {
        venue_id: 'venue-1',
        busyness_rating: 4 as const,
        comment: 'Great atmosphere!',
      };

      const locationResult = await LocationVerificationService.getCurrentLocation();
      const result = await VibeCheckService.createVibeCheck(
        formData,
        locationResult.location!
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();

      // Success should trigger:
      // 1. Success alert/toast
      // 2. Navigation back to venue details
      // 3. Real-time update of venue vibe checks
      // 4. Cache invalidation

      // Verify the created vibe check has all expected properties
      expect(result.data?.id).toBeDefined();
      expect(result.data?.venue_id).toBe('venue-1');
      expect(result.data?.user_id).toBe('user-1');
      expect(result.data?.busyness_rating).toBe(4);
      expect(result.data?.comment).toBe('Great atmosphere!');
      expect(result.data?.created_at).toBeDefined();
    });

    it('should handle successful posting with all optional fields', async () => {
      const mockPhoto = {
        uri: 'file://photo.jpg',
        type: 'image/jpeg',
        name: 'photo.jpg',
      };

      const mockPhotoUrl = 'https://example.com/photo.jpg';

      jest.spyOn(PhotoUploadService, 'uploadPhoto').mockResolvedValue({
        data: mockPhotoUrl,
        error: null,
      });

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
                busyness_rating: 5,
                comment: 'Amazing night with great music!',
                photo_url: mockPhotoUrl,
                user_latitude: 40.7128,
                user_longitude: -74.0060,
                created_at: '2024-01-01T00:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      const formData = {
        venue_id: 'venue-1',
        busyness_rating: 5 as const,
        comment: 'Amazing night with great music!',
        photo: mockPhoto,
      };

      const locationResult = await LocationVerificationService.getCurrentLocation();
      const result = await VibeCheckService.createVibeCheck(
        formData,
        locationResult.location!
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.busyness_rating).toBe(5);
      expect(result.data?.comment).toBe('Amazing night with great music!');
      expect(result.data?.photo_url).toBe(mockPhotoUrl);
    });
  });

  describe('Input Sanitization and Security', () => {
    it('should sanitize comment input', async () => {
      const unsanitizedComment = '  Great   place   with   multiple    spaces!  ';
      const sanitizedComment = VibeCheckValidator.sanitizeComment(unsanitizedComment);
      
      expect(sanitizedComment).toBe('Great place with multiple spaces!');
    });

    it('should reject harmful content in comments', async () => {
      const harmfulComment = '<script>alert("xss")</script>';
      const validation = VibeCheckValidator.validateComment(harmfulComment);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].code).toBe('COMMENT_HARMFUL_CONTENT');
    });

    it('should validate photo types for security', async () => {
      const invalidPhoto = {
        uri: 'file://malicious.exe',
        type: 'application/exe',
        name: 'malicious.exe',
      };

      const validation = VibeCheckValidator.validatePhoto(invalidPhoto);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].code).toBe('PHOTO_TYPE_UNSUPPORTED');
    });
  });
});