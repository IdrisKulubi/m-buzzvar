/**
 * Error handling utilities for the Live Vibe Check feature
 * Provides comprehensive error types, user-friendly messages, and retry mechanisms
 */

// Error types for different failure scenarios
export enum ErrorType {
  // Location-related errors
  LOCATION_PERMISSION_DENIED = 'LOCATION_PERMISSION_DENIED',
  LOCATION_SERVICES_DISABLED = 'LOCATION_SERVICES_DISABLED',
  LOCATION_UNAVAILABLE = 'LOCATION_UNAVAILABLE',
  LOCATION_TOO_FAR = 'LOCATION_TOO_FAR',
  
  // Network-related errors
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Authentication errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  
  // Rate limiting errors
  RATE_LIMITED = 'RATE_LIMITED',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  PHOTO_TOO_LARGE = 'PHOTO_TOO_LARGE',
  PHOTO_INVALID_FORMAT = 'PHOTO_INVALID_FORMAT',
  
  // Server errors
  SERVER_ERROR = 'SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',       // User can continue with limited functionality
  MEDIUM = 'MEDIUM', // User should retry the action
  HIGH = 'HIGH',     // User cannot proceed without fixing the issue
  CRITICAL = 'CRITICAL' // App functionality is severely impacted
}

// Structured error interface
export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  actionable: boolean;
  retryable: boolean;
  retryDelay?: number; // milliseconds
  maxRetries?: number;
  metadata?: Record<string, any>;
}

// Error factory functions
export class ErrorFactory {
  // Location errors
  static locationPermissionDenied(): AppError {
    return {
      type: ErrorType.LOCATION_PERMISSION_DENIED,
      severity: ErrorSeverity.HIGH,
      message: 'Location permission denied by user',
      userMessage: 'Location access is required to post vibe checks. Please enable location permissions in your device settings.',
      actionable: true,
      retryable: true,
      metadata: { 
        action: 'Open device settings to enable location permissions',
        settingsPath: 'Settings > Privacy & Security > Location Services'
      }
    };
  }

  static locationServicesDisabled(): AppError {
    return {
      type: ErrorType.LOCATION_SERVICES_DISABLED,
      severity: ErrorSeverity.HIGH,
      message: 'Location services are disabled on device',
      userMessage: 'Location services are turned off. Please enable them in your device settings to post vibe checks.',
      actionable: true,
      retryable: true,
      metadata: { 
        action: 'Enable location services in device settings',
        settingsPath: 'Settings > Privacy & Security > Location Services'
      }
    };
  }

  static locationUnavailable(): AppError {
    return {
      type: ErrorType.LOCATION_UNAVAILABLE,
      severity: ErrorSeverity.MEDIUM,
      message: 'Unable to determine current location',
      userMessage: 'Unable to get your location. Please check your GPS signal and try again.',
      actionable: true,
      retryable: true,
      retryDelay: 3000,
      maxRetries: 3,
      metadata: { 
        action: 'Move to an area with better GPS signal and try again'
      }
    };
  }

  static locationTooFar(distance: number, maxDistance: number = 100): AppError {
    return {
      type: ErrorType.LOCATION_TOO_FAR,
      severity: ErrorSeverity.MEDIUM,
      message: `User is ${distance}m away from venue (max: ${maxDistance}m)`,
      userMessage: `You're ${distance}m away from the venue. You need to be within ${maxDistance}m to post a vibe check.`,
      actionable: true,
      retryable: true,
      metadata: { 
        distance,
        maxDistance,
        action: 'Move closer to the venue and try again'
      }
    };
  }

  // Network errors
  static networkOffline(): AppError {
    return {
      type: ErrorType.NETWORK_OFFLINE,
      severity: ErrorSeverity.HIGH,
      message: 'Device is offline',
      userMessage: 'No internet connection. Please check your network connection and try again.',
      actionable: true,
      retryable: true,
      retryDelay: 5000,
      maxRetries: 5,
      metadata: { 
        action: 'Check your WiFi or cellular connection'
      }
    };
  }

  static networkTimeout(): AppError {
    return {
      type: ErrorType.NETWORK_TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      message: 'Network request timed out',
      userMessage: 'Request timed out. Please check your connection and try again.',
      actionable: true,
      retryable: true,
      retryDelay: 2000,
      maxRetries: 3
    };
  }

  static networkError(details?: string): AppError {
    return {
      type: ErrorType.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: `Network error: ${details || 'Unknown network issue'}`,
      userMessage: 'Network error occurred. Please try again.',
      actionable: true,
      retryable: true,
      retryDelay: 1000,
      maxRetries: 3,
      metadata: { details }
    };
  }

  // Rate limiting errors
  static rateLimited(timeUntilReset: number): AppError {
    const minutes = Math.ceil(timeUntilReset / (1000 * 60));
    return {
      type: ErrorType.RATE_LIMITED,
      severity: ErrorSeverity.LOW,
      message: `Rate limited, reset in ${timeUntilReset}ms`,
      userMessage: `You can only post one vibe check per venue per hour. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      actionable: false,
      retryable: true,
      retryDelay: timeUntilReset,
      maxRetries: 1,
      metadata: { 
        timeUntilReset,
        minutes,
        action: 'Wait before posting another vibe check to this venue'
      }
    };
  }

  // Validation errors
  static invalidInput(field: string, reason: string): AppError {
    return {
      type: ErrorType.INVALID_INPUT,
      severity: ErrorSeverity.LOW,
      message: `Invalid input for ${field}: ${reason}`,
      userMessage: `Please check your ${field}. ${reason}`,
      actionable: true,
      retryable: false,
      metadata: { field, reason }
    };
  }

  static photoTooLarge(size: number, maxSize: number): AppError {
    const sizeMB = Math.round(size / (1024 * 1024) * 10) / 10;
    const maxSizeMB = Math.round(maxSize / (1024 * 1024) * 10) / 10;
    
    return {
      type: ErrorType.PHOTO_TOO_LARGE,
      severity: ErrorSeverity.LOW,
      message: `Photo size ${sizeMB}MB exceeds limit of ${maxSizeMB}MB`,
      userMessage: `Photo is too large (${sizeMB}MB). Please choose a smaller photo (max ${maxSizeMB}MB).`,
      actionable: true,
      retryable: false,
      metadata: { size, maxSize, sizeMB, maxSizeMB }
    };
  }

  static photoInvalidFormat(format: string): AppError {
    return {
      type: ErrorType.PHOTO_INVALID_FORMAT,
      severity: ErrorSeverity.LOW,
      message: `Invalid photo format: ${format}`,
      userMessage: 'Invalid photo format. Please choose a JPEG or PNG image.',
      actionable: true,
      retryable: false,
      metadata: { format }
    };
  }

  // Server errors
  static serverError(statusCode?: number, details?: string): AppError {
    return {
      type: ErrorType.SERVER_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: `Server error ${statusCode || ''}: ${details || 'Unknown server issue'}`,
      userMessage: 'Server error occurred. Please try again in a moment.',
      actionable: true,
      retryable: true,
      retryDelay: 5000,
      maxRetries: 2,
      metadata: { statusCode, details }
    };
  }

  static databaseError(details?: string): AppError {
    return {
      type: ErrorType.DATABASE_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: `Database error: ${details || 'Unknown database issue'}`,
      userMessage: 'Data error occurred. Please try again.',
      actionable: true,
      retryable: true,
      retryDelay: 2000,
      maxRetries: 2,
      metadata: { details }
    };
  }

  // Authentication errors
  static authRequired(): AppError {
    return {
      type: ErrorType.AUTH_REQUIRED,
      severity: ErrorSeverity.HIGH,
      message: 'User authentication required',
      userMessage: 'Please sign in to post vibe checks.',
      actionable: true,
      retryable: false,
      metadata: { 
        action: 'Sign in to your account'
      }
    };
  }

  static authExpired(): AppError {
    return {
      type: ErrorType.AUTH_EXPIRED,
      severity: ErrorSeverity.HIGH,
      message: 'User session expired',
      userMessage: 'Your session has expired. Please sign in again.',
      actionable: true,
      retryable: false,
      metadata: { 
        action: 'Sign in again to continue'
      }
    };
  }

  // Unknown errors
  static unknownError(originalError?: any): AppError {
    return {
      type: ErrorType.UNKNOWN_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: `Unknown error: ${originalError?.message || 'Unexpected error occurred'}`,
      userMessage: 'Something went wrong. Please try again.',
      actionable: true,
      retryable: true,
      retryDelay: 1000,
      maxRetries: 1,
      metadata: { originalError }
    };
  }
}

// Error parsing utility to convert various error types to AppError
export class ErrorParser {
  static parseError(error: any): AppError {
    // Handle network errors
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
      return ErrorFactory.networkError(error.message);
    }

    // Handle timeout errors
    if (error?.code === 'TIMEOUT' || error?.message?.includes('timeout')) {
      return ErrorFactory.networkTimeout();
    }

    // Handle authentication errors
    if (error?.status === 401 || error?.message?.includes('unauthorized')) {
      return ErrorFactory.authRequired();
    }

    if (error?.status === 403 || error?.message?.includes('forbidden')) {
      return ErrorFactory.authExpired();
    }

    // Handle server errors
    if (error?.status >= 500) {
      return ErrorFactory.serverError(error.status, error.message);
    }

    // Handle database errors
    if (error?.code?.startsWith('PGRST') || error?.message?.includes('database')) {
      return ErrorFactory.databaseError(error.message);
    }

    // Handle location errors
    if (error?.message?.includes('location permission')) {
      return ErrorFactory.locationPermissionDenied();
    }

    if (error?.message?.includes('location services')) {
      return ErrorFactory.locationServicesDisabled();
    }

    if (error?.message?.includes('location')) {
      return ErrorFactory.locationUnavailable();
    }

    // Handle rate limiting
    if (error?.message?.includes('rate limit') || error?.message?.includes('one vibe check per hour')) {
      // Try to extract time from error message or default to 1 hour
      const timeMatch = error.message.match(/(\d+)\s*(minute|hour)/);
      const timeUntilReset = timeMatch ? 
        (parseInt(timeMatch[1]) * (timeMatch[2] === 'hour' ? 3600000 : 60000)) : 
        3600000; // 1 hour default
      return ErrorFactory.rateLimited(timeUntilReset);
    }

    // Default to unknown error
    return ErrorFactory.unknownError(error);
  }
}

// Retry mechanism utility
export class RetryManager {
  private static retryAttempts = new Map<string, number>();

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    error: AppError,
    operationId?: string
  ): Promise<T> {
    const id = operationId || `operation_${Date.now()}`;
    const currentAttempts = this.retryAttempts.get(id) || 0;

    try {
      const result = await operation();
      // Reset retry count on success
      this.retryAttempts.delete(id);
      return result;
    } catch (err) {
      const parsedError = ErrorParser.parseError(err);
      
      if (!parsedError.retryable || 
          (parsedError.maxRetries && currentAttempts >= parsedError.maxRetries)) {
        this.retryAttempts.delete(id);
        throw parsedError;
      }

      // Increment retry count
      this.retryAttempts.set(id, currentAttempts + 1);

      // Wait before retry if delay is specified
      if (parsedError.retryDelay) {
        await new Promise(resolve => setTimeout(resolve, parsedError.retryDelay));
      }

      // Retry the operation
      return this.executeWithRetry(operation, parsedError, id);
    }
  }

  static clearRetryHistory(operationId?: string): void {
    if (operationId) {
      this.retryAttempts.delete(operationId);
    } else {
      this.retryAttempts.clear();
    }
  }

  static getRetryCount(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }
}

// Rate limiting countdown utility
export class RateLimitManager {
  private static countdowns = new Map<string, NodeJS.Timeout>();

  static startCountdown(
    key: string,
    duration: number,
    onTick?: (remainingMs: number) => void,
    onComplete?: () => void
  ): void {
    // Clear existing countdown
    this.clearCountdown(key);

    const startTime = Date.now();
    const endTime = startTime + duration;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);

      if (remaining <= 0) {
        this.clearCountdown(key);
        onComplete?.();
      } else {
        onTick?.(remaining);
      }
    }, 1000); // Update every second

    this.countdowns.set(key, interval);
  }

  static clearCountdown(key: string): void {
    const interval = this.countdowns.get(key);
    if (interval) {
      clearInterval(interval);
      this.countdowns.delete(key);
    }
  }

  static clearAllCountdowns(): void {
    this.countdowns.forEach((interval) => clearInterval(interval));
    this.countdowns.clear();
  }

  static formatTimeRemaining(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }
}