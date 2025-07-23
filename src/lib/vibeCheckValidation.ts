/**
 * Comprehensive validation utilities for vibe check posting
 * Ensures all form inputs meet requirements before submission
 */

import { VibeCheckFormData, BusynessRating, LocationVerification } from './types';
import { ErrorFactory, AppError } from './errors';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export class VibeCheckValidator {
  private static readonly MAX_COMMENT_LENGTH = 280;
  private static readonly MIN_BUSYNESS_RATING = 1;
  private static readonly MAX_BUSYNESS_RATING = 5;
  private static readonly MAX_DISTANCE_METERS = 100;
  private static readonly SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
  private static readonly MAX_IMAGE_SIZE_MB = 5;

  /**
   * Validate complete vibe check form data
   */
  static validateVibeCheckForm(
    data: VibeCheckFormData,
    locationVerification?: LocationVerification
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate venue ID
    const venueValidation = this.validateVenueId(data.venue_id);
    if (!venueValidation.isValid) {
      errors.push(...venueValidation.errors);
    }

    // Validate busyness rating
    const ratingValidation = this.validateBusynessRating(data.busyness_rating);
    if (!ratingValidation.isValid) {
      errors.push(...ratingValidation.errors);
    }

    // Validate comment (optional)
    if (data.comment) {
      const commentValidation = this.validateComment(data.comment);
      if (!commentValidation.isValid) {
        errors.push(...commentValidation.errors);
      }
    }

    // Validate photo (optional)
    if (data.photo) {
      const photoValidation = this.validatePhoto(data.photo);
      if (!photoValidation.isValid) {
        errors.push(...photoValidation.errors);
      }
    }

    // Validate location verification
    if (locationVerification) {
      const locationValidation = this.validateLocationVerification(locationVerification);
      if (!locationValidation.isValid) {
        errors.push(...locationValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate venue ID
   */
  static validateVenueId(venueId: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!venueId) {
      errors.push({
        field: 'venue_id',
        message: 'Venue ID is required',
        code: 'VENUE_ID_REQUIRED',
      });
    } else if (typeof venueId !== 'string') {
      errors.push({
        field: 'venue_id',
        message: 'Venue ID must be a string',
        code: 'VENUE_ID_INVALID_TYPE',
      });
    } else if (venueId.trim().length === 0) {
      errors.push({
        field: 'venue_id',
        message: 'Venue ID cannot be empty',
        code: 'VENUE_ID_EMPTY',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate busyness rating
   */
  static validateBusynessRating(rating: BusynessRating): ValidationResult {
    const errors: ValidationError[] = [];

    if (rating === undefined || rating === null) {
      errors.push({
        field: 'busyness_rating',
        message: 'Busyness rating is required',
        code: 'BUSYNESS_RATING_REQUIRED',
      });
    } else if (!Number.isInteger(rating)) {
      errors.push({
        field: 'busyness_rating',
        message: 'Busyness rating must be a whole number',
        code: 'BUSYNESS_RATING_NOT_INTEGER',
      });
    } else if (rating < this.MIN_BUSYNESS_RATING || rating > this.MAX_BUSYNESS_RATING) {
      errors.push({
        field: 'busyness_rating',
        message: `Busyness rating must be between ${this.MIN_BUSYNESS_RATING} and ${this.MAX_BUSYNESS_RATING}`,
        code: 'BUSYNESS_RATING_OUT_OF_RANGE',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate comment text
   */
  static validateComment(comment: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof comment !== 'string') {
      errors.push({
        field: 'comment',
        message: 'Comment must be a string',
        code: 'COMMENT_INVALID_TYPE',
      });
    } else if (comment.length > this.MAX_COMMENT_LENGTH) {
      errors.push({
        field: 'comment',
        message: `Comment cannot exceed ${this.MAX_COMMENT_LENGTH} characters`,
        code: 'COMMENT_TOO_LONG',
      });
    } else if (comment.trim().length === 0 && comment.length > 0) {
      errors.push({
        field: 'comment',
        message: 'Comment cannot be only whitespace',
        code: 'COMMENT_ONLY_WHITESPACE',
      });
    }

    // Check for potentially harmful content
    const harmfulPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(comment)) {
        errors.push({
          field: 'comment',
          message: 'Comment contains potentially harmful content',
          code: 'COMMENT_HARMFUL_CONTENT',
        });
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate photo data
   */
  static validatePhoto(photo: { uri: string; type: string; name: string }): ValidationResult {
    const errors: ValidationError[] = [];

    if (!photo.uri) {
      errors.push({
        field: 'photo.uri',
        message: 'Photo URI is required',
        code: 'PHOTO_URI_REQUIRED',
      });
    } else if (typeof photo.uri !== 'string') {
      errors.push({
        field: 'photo.uri',
        message: 'Photo URI must be a string',
        code: 'PHOTO_URI_INVALID_TYPE',
      });
    }

    if (!photo.type) {
      errors.push({
        field: 'photo.type',
        message: 'Photo type is required',
        code: 'PHOTO_TYPE_REQUIRED',
      });
    } else if (!this.SUPPORTED_IMAGE_TYPES.includes(photo.type.toLowerCase())) {
      errors.push({
        field: 'photo.type',
        message: `Photo type must be one of: ${this.SUPPORTED_IMAGE_TYPES.join(', ')}`,
        code: 'PHOTO_TYPE_UNSUPPORTED',
      });
    }

    if (!photo.name) {
      errors.push({
        field: 'photo.name',
        message: 'Photo name is required',
        code: 'PHOTO_NAME_REQUIRED',
      });
    } else if (typeof photo.name !== 'string') {
      errors.push({
        field: 'photo.name',
        message: 'Photo name must be a string',
        code: 'PHOTO_NAME_INVALID_TYPE',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate location verification
   */
  static validateLocationVerification(verification: LocationVerification): ValidationResult {
    const errors: ValidationError[] = [];

    if (!verification.is_valid) {
      if (verification.distance_meters > this.MAX_DISTANCE_METERS) {
        errors.push({
          field: 'location',
          message: `You must be within ${this.MAX_DISTANCE_METERS}m of the venue to post a vibe check`,
          code: 'LOCATION_TOO_FAR',
        });
      } else {
        errors.push({
          field: 'location',
          message: 'Location verification failed',
          code: 'LOCATION_VERIFICATION_FAILED',
        });
      }
    }

    if (typeof verification.distance_meters !== 'number' || verification.distance_meters < 0) {
      errors.push({
        field: 'location.distance',
        message: 'Invalid distance measurement',
        code: 'LOCATION_DISTANCE_INVALID',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate rate limiting constraints
   */
  static validateRateLimit(rateLimitInfo: {
    canPost: boolean;
    timeUntilReset?: number;
    lastVibeCheck?: Date;
  }): ValidationResult {
    const errors: ValidationError[] = [];

    if (!rateLimitInfo.canPost) {
      const timeRemaining = rateLimitInfo.timeUntilReset || 0;
      const minutes = Math.ceil(timeRemaining / (1000 * 60));
      
      errors.push({
        field: 'rate_limit',
        message: `You can post another vibe check in ${minutes} minute${minutes === 1 ? '' : 's'}`,
        code: 'RATE_LIMITED',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create AppError from validation result
   */
  static createValidationError(validationResult: ValidationResult): AppError {
    if (validationResult.isValid) {
      throw new Error('Cannot create error from valid validation result');
    }

    const primaryError = validationResult.errors[0];
    const allMessages = validationResult.errors.map(e => e.message).join('; ');

    switch (primaryError.code) {
      case 'LOCATION_TOO_FAR':
        return ErrorFactory.locationTooFar(0, this.MAX_DISTANCE_METERS);
      case 'RATE_LIMITED':
        return ErrorFactory.rateLimited(3600000); // 1 hour default
      case 'COMMENT_TOO_LONG':
        return ErrorFactory.invalidInput('comment', `Comment exceeds ${this.MAX_COMMENT_LENGTH} characters`);
      case 'BUSYNESS_RATING_OUT_OF_RANGE':
        return ErrorFactory.invalidInput('busyness_rating', `Rating must be between ${this.MIN_BUSYNESS_RATING} and ${this.MAX_BUSYNESS_RATING}`);
      case 'PHOTO_TYPE_UNSUPPORTED':
        return ErrorFactory.invalidInput('photo', `Unsupported image type. Use: ${this.SUPPORTED_IMAGE_TYPES.join(', ')}`);
      default:
        return ErrorFactory.invalidInput('form', allMessages);
    }
  }

  /**
   * Get user-friendly error message for validation error
   */
  static getErrorMessage(error: ValidationError): string {
    const messages: Record<string, string> = {
      VENUE_ID_REQUIRED: 'Please select a venue',
      BUSYNESS_RATING_REQUIRED: 'Please rate how busy the venue is',
      BUSYNESS_RATING_OUT_OF_RANGE: 'Please select a rating between 1 and 5',
      COMMENT_TOO_LONG: `Comment is too long (max ${this.MAX_COMMENT_LENGTH} characters)`,
      COMMENT_HARMFUL_CONTENT: 'Comment contains invalid content',
      PHOTO_TYPE_UNSUPPORTED: 'Please use a JPEG or PNG image',
      LOCATION_TOO_FAR: `You must be within ${this.MAX_DISTANCE_METERS}m of the venue`,
      RATE_LIMITED: 'Please wait before posting another vibe check',
    };

    return messages[error.code] || error.message;
  }

  /**
   * Sanitize comment text
   */
  static sanitizeComment(comment: string): string {
    if (!comment || typeof comment !== 'string') {
      return '';
    }

    return comment
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .substring(0, this.MAX_COMMENT_LENGTH); // Truncate if too long
  }

  /**
   * Check if form data is complete for submission
   */
  static isFormComplete(data: Partial<VibeCheckFormData>): boolean {
    return !!(
      data.venue_id &&
      data.busyness_rating &&
      data.busyness_rating >= this.MIN_BUSYNESS_RATING &&
      data.busyness_rating <= this.MAX_BUSYNESS_RATING
    );
  }

  /**
   * Get validation summary for UI display
   */
  static getValidationSummary(validationResult: ValidationResult): {
    hasErrors: boolean;
    errorCount: number;
    primaryMessage: string;
    allMessages: string[];
  } {
    return {
      hasErrors: !validationResult.isValid,
      errorCount: validationResult.errors.length,
      primaryMessage: validationResult.errors.length > 0 
        ? this.getErrorMessage(validationResult.errors[0])
        : '',
      allMessages: validationResult.errors.map(error => this.getErrorMessage(error)),
    };
  }
}