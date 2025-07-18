/**
 * Tests for vibe check validation utilities
 * Ensures all form validation works correctly
 */

import { VibeCheckValidator } from '../vibeCheckValidation';
import { VibeCheckFormData, BusynessRating, LocationVerification } from '../types';

describe('VibeCheckValidator', () => {
  const validFormData: VibeCheckFormData = {
    venue_id: 'venue-123',
    busyness_rating: 4,
    comment: 'Great atmosphere!',
    photo: {
      uri: 'file://photo.jpg',
      type: 'image/jpeg',
      name: 'photo.jpg',
    },
  };

  const validLocationVerification: LocationVerification = {
    is_valid: true,
    distance_meters: 50,
    venue_name: 'Test Venue',
  };

  describe('validateVibeCheckForm', () => {
    it('should validate complete valid form data', () => {
      const result = VibeCheckValidator.validateVibeCheckForm(
        validFormData,
        validLocationVerification
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate minimal valid form data', () => {
      const minimalData: VibeCheckFormData = {
        venue_id: 'venue-123',
        busyness_rating: 3,
      };

      const result = VibeCheckValidator.validateVibeCheckForm(minimalData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should collect all validation errors', () => {
      const invalidData: VibeCheckFormData = {
        venue_id: '',
        busyness_rating: 6 as BusynessRating,
        comment: 'a'.repeat(281), // Too long
        photo: {
          uri: '',
          type: 'image/gif', // Unsupported
          name: '',
        },
      };

      const invalidLocation: LocationVerification = {
        is_valid: false,
        distance_meters: 200,
        venue_name: 'Test Venue',
      };

      const result = VibeCheckValidator.validateVibeCheckForm(
        invalidData,
        invalidLocation
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check that we have errors for each invalid field
      const errorFields = result.errors.map(e => e.field);
      expect(errorFields).toContain('venue_id');
      expect(errorFields).toContain('busyness_rating');
      expect(errorFields).toContain('comment');
      expect(errorFields).toContain('location');
    });
  });

  describe('validateVenueId', () => {
    it('should accept valid venue ID', () => {
      const result = VibeCheckValidator.validateVenueId('venue-123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty venue ID', () => {
      const result = VibeCheckValidator.validateVenueId('');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('VENUE_ID_EMPTY');
    });

    it('should reject null/undefined venue ID', () => {
      const result = VibeCheckValidator.validateVenueId(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('VENUE_ID_REQUIRED');
    });

    it('should reject non-string venue ID', () => {
      const result = VibeCheckValidator.validateVenueId(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('VENUE_ID_INVALID_TYPE');
    });
  });

  describe('validateBusynessRating', () => {
    it('should accept valid ratings 1-5', () => {
      for (let rating = 1; rating <= 5; rating++) {
        const result = VibeCheckValidator.validateBusynessRating(rating as BusynessRating);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should reject ratings outside 1-5 range', () => {
      const invalidRatings = [0, 6, -1, 10];
      
      for (const rating of invalidRatings) {
        const result = VibeCheckValidator.validateBusynessRating(rating as BusynessRating);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('BUSYNESS_RATING_OUT_OF_RANGE');
      }
    });

    it('should reject non-integer ratings', () => {
      const result = VibeCheckValidator.validateBusynessRating(3.5 as BusynessRating);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('BUSYNESS_RATING_NOT_INTEGER');
    });

    it('should reject null/undefined ratings', () => {
      const result = VibeCheckValidator.validateBusynessRating(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('BUSYNESS_RATING_REQUIRED');
    });
  });

  describe('validateComment', () => {
    it('should accept valid comments', () => {
      const validComments = [
        'Great place!',
        'Really busy tonight 🎉',
        'a'.repeat(280), // Max length
      ];

      for (const comment of validComments) {
        const result = VibeCheckValidator.validateComment(comment);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should reject comments that are too long', () => {
      const longComment = 'a'.repeat(281);
      const result = VibeCheckValidator.validateComment(longComment);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('COMMENT_TOO_LONG');
    });

    it('should reject comments with only whitespace', () => {
      const whitespaceComment = '   \n\t   ';
      const result = VibeCheckValidator.validateComment(whitespaceComment);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('COMMENT_ONLY_WHITESPACE');
    });

    it('should reject comments with harmful content', () => {
      const harmfulComments = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<div onclick="alert()">click</div>',
      ];

      for (const comment of harmfulComments) {
        const result = VibeCheckValidator.validateComment(comment);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('COMMENT_HARMFUL_CONTENT');
      }
    });

    it('should reject non-string comments', () => {
      const result = VibeCheckValidator.validateComment(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('COMMENT_INVALID_TYPE');
    });
  });

  describe('validatePhoto', () => {
    it('should accept valid photo data', () => {
      const validPhotos = [
        { uri: 'file://photo.jpg', type: 'image/jpeg', name: 'photo.jpg' },
        { uri: 'file://image.png', type: 'image/png', name: 'image.png' },
        { uri: 'file://pic.JPG', type: 'image/jpg', name: 'pic.JPG' },
      ];

      for (const photo of validPhotos) {
        const result = VibeCheckValidator.validatePhoto(photo);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });

    it('should reject photos with missing URI', () => {
      const photo = { uri: '', type: 'image/jpeg', name: 'photo.jpg' };
      const result = VibeCheckValidator.validatePhoto(photo);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('PHOTO_URI_REQUIRED');
    });

    it('should reject photos with unsupported types', () => {
      const unsupportedTypes = ['image/gif', 'image/bmp', 'video/mp4', 'text/plain'];
      
      for (const type of unsupportedTypes) {
        const photo = { uri: 'file://photo.ext', type, name: 'photo.ext' };
        const result = VibeCheckValidator.validatePhoto(photo);
        
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('PHOTO_TYPE_UNSUPPORTED');
      }
    });

    it('should reject photos with missing name', () => {
      const photo = { uri: 'file://photo.jpg', type: 'image/jpeg', name: '' };
      const result = VibeCheckValidator.validatePhoto(photo);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('PHOTO_NAME_REQUIRED');
    });
  });

  describe('validateLocationVerification', () => {
    it('should accept valid location verification', () => {
      const result = VibeCheckValidator.validateLocationVerification(validLocationVerification);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject location too far from venue', () => {
      const farLocation: LocationVerification = {
        is_valid: false,
        distance_meters: 200,
        venue_name: 'Test Venue',
      };

      const result = VibeCheckValidator.validateLocationVerification(farLocation);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('LOCATION_TOO_FAR');
    });

    it('should reject invalid distance measurements', () => {
      const invalidLocation: LocationVerification = {
        is_valid: true,
        distance_meters: -1,
        venue_name: 'Test Venue',
      };

      const result = VibeCheckValidator.validateLocationVerification(invalidLocation);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('LOCATION_DISTANCE_INVALID');
    });
  });

  describe('validateRateLimit', () => {
    it('should accept when user can post', () => {
      const rateLimitInfo = { canPost: true };
      const result = VibeCheckValidator.validateRateLimit(rateLimitInfo);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject when user is rate limited', () => {
      const rateLimitInfo = {
        canPost: false,
        timeUntilReset: 1800000, // 30 minutes
      };
      
      const result = VibeCheckValidator.validateRateLimit(rateLimitInfo);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('RATE_LIMITED');
    });
  });

  describe('sanitizeComment', () => {
    it('should trim whitespace and normalize spaces', () => {
      const input = '  Great   place   with   multiple    spaces!  ';
      const expected = 'Great place with multiple spaces!';
      
      const result = VibeCheckValidator.sanitizeComment(input);
      expect(result).toBe(expected);
    });

    it('should truncate long comments', () => {
      const longComment = 'a'.repeat(300);
      const result = VibeCheckValidator.sanitizeComment(longComment);
      
      expect(result.length).toBe(280);
      expect(result).toBe('a'.repeat(280));
    });

    it('should handle empty/null input', () => {
      expect(VibeCheckValidator.sanitizeComment('')).toBe('');
      expect(VibeCheckValidator.sanitizeComment(null as any)).toBe('');
      expect(VibeCheckValidator.sanitizeComment(undefined as any)).toBe('');
    });
  });

  describe('isFormComplete', () => {
    it('should return true for complete form', () => {
      const completeForm = {
        venue_id: 'venue-123',
        busyness_rating: 4 as BusynessRating,
      };
      
      expect(VibeCheckValidator.isFormComplete(completeForm)).toBe(true);
    });

    it('should return false for incomplete form', () => {
      const incompleteForm = {
        venue_id: 'venue-123',
        // Missing busyness_rating
      };
      
      expect(VibeCheckValidator.isFormComplete(incompleteForm)).toBe(false);
    });

    it('should return false for invalid rating', () => {
      const invalidForm = {
        venue_id: 'venue-123',
        busyness_rating: 6 as BusynessRating,
      };
      
      expect(VibeCheckValidator.isFormComplete(invalidForm)).toBe(false);
    });
  });

  describe('getValidationSummary', () => {
    it('should provide summary for valid form', () => {
      const validResult = { isValid: true, errors: [] };
      const summary = VibeCheckValidator.getValidationSummary(validResult);
      
      expect(summary.hasErrors).toBe(false);
      expect(summary.errorCount).toBe(0);
      expect(summary.primaryMessage).toBe('');
      expect(summary.allMessages).toHaveLength(0);
    });

    it('should provide summary for invalid form', () => {
      const invalidResult = {
        isValid: false,
        errors: [
          { field: 'venue_id', message: 'Venue ID is required', code: 'VENUE_ID_REQUIRED' },
          { field: 'busyness_rating', message: 'Rating out of range', code: 'BUSYNESS_RATING_OUT_OF_RANGE' },
        ],
      };
      
      const summary = VibeCheckValidator.getValidationSummary(invalidResult);
      
      expect(summary.hasErrors).toBe(true);
      expect(summary.errorCount).toBe(2);
      expect(summary.primaryMessage).toBe('Please select a venue');
      expect(summary.allMessages).toHaveLength(2);
    });
  });

  describe('createValidationError', () => {
    it('should create appropriate AppError for validation failures', () => {
      const validationResult = {
        isValid: false,
        errors: [
          { field: 'location', message: 'Too far', code: 'LOCATION_TOO_FAR' },
        ],
      };
      
      const appError = VibeCheckValidator.createValidationError(validationResult);
      expect(appError.type).toBe('LOCATION_TOO_FAR');
    });

    it('should throw error for valid validation result', () => {
      const validResult = { isValid: true, errors: [] };
      
      expect(() => {
        VibeCheckValidator.createValidationError(validResult);
      }).toThrow('Cannot create error from valid validation result');
    });
  });

  describe('getErrorMessage', () => {
    it('should return user-friendly messages for known error codes', () => {
      const testCases = [
        { code: 'VENUE_ID_REQUIRED', expected: 'Please select a venue' },
        { code: 'BUSYNESS_RATING_REQUIRED', expected: 'Please rate how busy the venue is' },
        { code: 'COMMENT_TOO_LONG', expected: 'Comment is too long (max 280 characters)' },
        { code: 'LOCATION_TOO_FAR', expected: 'You must be within 100m of the venue' },
      ];

      for (const testCase of testCases) {
        const error = { field: 'test', message: 'original', code: testCase.code };
        const message = VibeCheckValidator.getErrorMessage(error);
        expect(message).toBe(testCase.expected);
      }
    });

    it('should return original message for unknown error codes', () => {
      const error = { field: 'test', message: 'Custom error message', code: 'UNKNOWN_ERROR' };
      const message = VibeCheckValidator.getErrorMessage(error);
      expect(message).toBe('Custom error message');
    });
  });
});