import * as Location from "expo-location";
import {
  VibeCheck,
  VibeCheckWithDetails,
  VibeCheckFormData,
} from "../lib/types";
import { LocationVerificationService } from "./LocationVerificationService";
import {
  PhotoUploadServiceR2,
  PhotoUploadProgress,
} from "./PhotoUploadServiceR2";
import {
  ErrorFactory,
  AppError,
  RetryManager,
  ErrorParser,
} from "../lib/errors";
import { ConnectivityManager } from "../lib/connectivity";
import { VibeCheckCacheService } from "./CacheService";
import { OptimizedQueryService } from "./OptimizedQueryService";
import { standaloneAuth } from "../../lib/auth/standalone-auth";
import { standaloneDb } from "../../lib/database/standalone-db";

export class VibeCheckService {
  /**
   * Create a new vibe check with comprehensive error handling and retry mechanism
   * @param data Form data for the vibe check
   * @param userLocation User's current location for verification
   * @returns Promise with created vibe check or structured error
   */
  static async createVibeCheck(
    data: VibeCheckFormData,
    userLocation: Location.LocationObject
  ): Promise<{ data: VibeCheck | null; error: AppError | null }> {
    const operation = async () => {
      // Check network connectivity
      const isConnected = await ConnectivityManager.isConnected();
      if (!isConnected) {
        throw ErrorFactory.networkOffline();
      }

      // Get current user
      const user = standaloneAuth.getUser();

      if (!user) {
        throw ErrorFactory.authRequired();
      }

      // Verify location against venue
      const venueResult = await standaloneDb.query<any>(
        `SELECT * FROM venues WHERE id = $1`,
        [data.venue_id]
      );

      if (venueResult.data.length === 0) {
        throw ErrorFactory.invalidInput("venue", "Venue not found");
      }

      const venue = venueResult.data[0];

      const locationVerification =
        await LocationVerificationService.verifyUserAtVenue(
          userLocation,
          venue
        );

      if (!locationVerification.is_valid) {
        throw ErrorFactory.locationTooFar(
          locationVerification.distance_meters,
          LocationVerificationService.MAX_DISTANCE_METERS
        );
      }

      // Check rate limiting (one vibe check per user per venue per hour)
      const rateLimitResult = await this.checkRateLimit(user.id, data.venue_id);
      if (!rateLimitResult.canPost) {
        throw ErrorFactory.rateLimited(
          rateLimitResult.timeUntilReset || 3600000
        );
      }

      // Upload photo if provided
      let photoUrl: string | null = null;
      if (data.photo) {
        const photoResult = await this.uploadVibeCheckPhoto(
          data.photo,
          user.id
        );
        if (photoResult.error) {
          throw ErrorParser.parseError(photoResult.error);
        }
        photoUrl = photoResult.data;
      }

      // Create vibe check record
      const vibeCheckId = `vibe_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`;

      const vibeCheckResult = await standaloneDb.query<VibeCheck>(
        `INSERT INTO vibe_checks (id, user_id, venue_id, rating, comment, photo_url, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
         RETURNING *`,
        [
          vibeCheckId,
          user.id,
          data.venue_id,
          data.busyness_rating,
          data.comment || null,
          photoUrl,
        ]
      );

      if (vibeCheckResult.data.length === 0) {
        throw ErrorFactory.databaseError("Failed to create vibe check");
      }

      const vibeCheck = vibeCheckResult.data[0];

      // Invalidate relevant cache entries
      await VibeCheckCacheService.invalidateOnVibeCheckCreate(data.venue_id);

      return vibeCheck;
    };

    try {
      const vibeCheck = await RetryManager.executeWithRetry(
        operation,
        ErrorFactory.unknownError(),
        `createVibeCheck_${data.venue_id}`
      );
      return { data: vibeCheck, error: null };
    } catch (error) {
      console.error("Failed to create vibe check:", error);
      const appError =
        error instanceof Error
          ? ErrorParser.parseError(error)
          : (error as AppError);
      return { data: null, error: appError };
    }
  }

  /**
   * Get recent vibe checks for a specific venue with caching and optimization
   * @param venueId ID of the venue
   * @param hoursBack Number of hours to look back (default: 4)
   * @returns Promise with vibe checks or structured error
   */
  static async getVenueVibeChecks(
    venueId: string,
    hoursBack: number = 4
  ): Promise<{ data: VibeCheckWithDetails[]; error: AppError | null }> {
    try {
      // Check cache first
      const cachedData = await VibeCheckCacheService.getCachedVenueVibeChecks(
        venueId,
        hoursBack
      );
      if (cachedData) {
        return { data: cachedData, error: null };
      }

      // Try to fetch data first, then check connectivity only if it fails
      try {
        // Use optimized query service
        const { data: vibeChecks, error } =
          await OptimizedQueryService.getVenueVibeChecksOptimized(
            venueId,
            hoursBack
          );

        if (error) {
          // If there's a database error, check if it's a connectivity issue
          const isConnected = await ConnectivityManager.isConnected();
          if (!isConnected) {
            return { data: [], error: ErrorFactory.networkOffline() };
          }

          const appError =
            error instanceof Error
              ? ErrorParser.parseError(error)
              : (error as AppError);
          return { data: [], error: appError };
        }

        // Cache the results
        await VibeCheckCacheService.cacheVenueVibeChecks(
          venueId,
          hoursBack,
          vibeChecks
        );

        return { data: vibeChecks, error: null };
      } catch (networkError) {
        // Only check connectivity if the actual request failed
        const isConnected = await ConnectivityManager.isConnected();
        if (!isConnected) {
          return { data: [], error: ErrorFactory.networkOffline() };
        }
        throw networkError; // Re-throw if it's not a connectivity issue
      }
    } catch (error) {
      console.error("Failed to fetch venue vibe checks:", error);
      const appError =
        error instanceof Error
          ? ErrorParser.parseError(error)
          : (error as AppError);
      return { data: [], error: appError };
    }
  }

  /**
   * Get live feed of all recent vibe checks across venues with caching and optimization
   * @param hoursBack Number of hours to look back (default: 4)
   * @param limit Maximum number of results (default: 50)
   * @returns Promise with vibe checks or structured error
   */
  static async getLiveVibeChecks(
    hoursBack: number = 4,
    limit: number = 50
  ): Promise<{ data: VibeCheckWithDetails[]; error: AppError | null }> {
    try {
      // Check cache first
      const cachedData = await VibeCheckCacheService.getCachedLiveVibeChecks(
        hoursBack,
        limit
      );
      if (cachedData) {
        return { data: cachedData, error: null };
      }

      // Check network connectivity
      const isConnected = await ConnectivityManager.isConnected();
      if (!isConnected) {
        return { data: [], error: ErrorFactory.networkOffline() };
      }

      // Use optimized query service
      const { data: vibeChecks, error } =
        await OptimizedQueryService.getLiveVibeChecksOptimized(hoursBack, {
          limit,
        });

      if (error) {
        const appError =
          error instanceof Error
            ? ErrorParser.parseError(error)
            : (error as AppError);
        return { data: [], error: appError };
      }

      // Cache the results
      await VibeCheckCacheService.cacheLiveVibeChecks(
        hoursBack,
        limit,
        vibeChecks
      );

      return { data: vibeChecks, error: null };
    } catch (error) {
      console.error("Failed to fetch live vibe checks:", error);
      const appError =
        error instanceof Error
          ? ErrorParser.parseError(error)
          : (error as AppError);
      return { data: [], error: appError };
    }
  }

  /**
   * Upload a photo for a vibe check with compression and progress tracking
   * @param photo Photo data from form
   * @param userId User ID for file naming
   * @param onProgress Optional progress callback
   * @returns Promise with photo URL or error
   */
  static async uploadVibeCheckPhoto(
    photo: { uri: string; type: string; name: string },
    userId: string,
    onProgress?: (progress: PhotoUploadProgress) => void
  ): Promise<{ data: string | null; error: any }> {
    try {
      const result = await PhotoUploadServiceR2.uploadPhoto(photo, userId, {
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        onProgress,
      });

      return result;
    } catch (error) {
      console.error("Photo upload error:", error);
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload photo. Please try again.",
      };
    }
  }

  /**
   * Check rate limiting with caching and optimization
   * @param userId User ID
   * @param venueId Venue ID
   * @returns Promise with rate limit status and time until reset
   */
  static async checkRateLimit(
    userId: string,
    venueId: string
  ): Promise<{
    canPost: boolean;
    timeUntilReset?: number;
    lastVibeCheck?: Date;
  }> {
    try {
      // Check cache first
      const cachedResult = await VibeCheckCacheService.getCachedUserRateLimit(
        userId,
        venueId
      );
      if (cachedResult) {
        return cachedResult;
      }

      // Use optimized query service
      const { data: result, error } =
        await OptimizedQueryService.getUserRecentVibeCheckOptimized(
          userId,
          venueId
        );

      if (error) {
        console.warn("Error checking rate limit:", error);
        return { canPost: true };
      }

      // Cache the result
      await VibeCheckCacheService.cacheUserRateLimit(userId, venueId, result);

      return result;
    } catch (error) {
      console.warn("Error checking rate limit:", error);
      return { canPost: true };
    }
  }

  /**
   * Check if user can post a vibe check for a venue (rate limiting)
   * @param userId User ID
   * @param venueId Venue ID
   * @returns Promise with boolean result
   * @deprecated Use checkRateLimit for more detailed information
   */
  static async canUserPostVibeCheck(
    userId: string,
    venueId: string
  ): Promise<boolean> {
    const result = await this.checkRateLimit(userId, venueId);
    return result.canPost;
  }

  /**
   * Get user's recent vibe check for a venue (for editing purposes)
   * @param userId User ID
   * @param venueId Venue ID
   * @returns Promise with vibe check or null
   */
  static async getUserRecentVibeCheck(
    userId: string,
    venueId: string
  ): Promise<{ data: VibeCheckWithDetails | null; error: any }> {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const vibeCheckResult = await standaloneDb.query<any>(
        `SELECT 
          vc.*,
          u.name as user_name,
          u.avatar_url as user_avatar_url,
          v.name as venue_name,
          v.address as venue_address
         FROM vibe_checks vc
         LEFT JOIN users u ON vc.user_id = u.id
         LEFT JOIN venues v ON vc.venue_id = v.id
         WHERE vc.user_id = $1 AND vc.venue_id = $2 AND vc.created_at >= $3
         ORDER BY vc.created_at DESC
         LIMIT 1`,
        [userId, venueId, oneHourAgo.toISOString()]
      );

      if (vibeCheckResult.data.length === 0) {
        return { data: null, error: null };
      }

      const rawData = vibeCheckResult.data[0];
      const vibeCheckWithDetails = this.transformToVibeCheckWithDetails({
        ...rawData,
        user: {
          id: rawData.user_id,
          name: rawData.user_name,
          avatar_url: rawData.user_avatar_url,
        },
        venue: {
          id: rawData.venue_id,
          name: rawData.venue_name,
          address: rawData.venue_address,
        },
      });

      return { data: vibeCheckWithDetails, error: null };
    } catch (error) {
      console.error(error)
      return {
        data: null,
        error: "Failed to fetch user vibe check. Please try again.",
      };
    }
  }

  /**
   * Update an existing vibe check (within 1 hour of creation)
   * @param vibeCheckId ID of the vibe check to update
   * @param updates Partial data to update
   * @returns Promise with updated vibe check or error
   */
  static async updateVibeCheck(
    vibeCheckId: string,
    updates: Partial<Pick<VibeCheck, "rating" | "comment" | "photo_url">>
  ): Promise<{ data: VibeCheck | null; error: any }> {
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.rating !== undefined) {
        setParts.push(`rating = $${paramIndex++}`);
        values.push(updates.rating);
      }
      if (updates.comment !== undefined) {
        setParts.push(`comment = $${paramIndex++}`);
        values.push(updates.comment);
      }
      if (updates.photo_url !== undefined) {
        setParts.push(`photo_url = $${paramIndex++}`);
        values.push(updates.photo_url);
      }

      if (setParts.length === 0) {
        return { data: null, error: "No updates provided" };
      }

      setParts.push(`updated_at = NOW()`);
      values.push(vibeCheckId);

      const vibeCheckResult = await standaloneDb.query<VibeCheck>(
        `UPDATE vibe_checks SET ${setParts.join(
          ", "
        )} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (vibeCheckResult.data.length === 0) {
        return { data: null, error: "Vibe check not found" };
      }

      return { data: vibeCheckResult.data[0], error: null };
    } catch (error) {
      console.error(error);
      return {
        data: null,
        error: "Failed to update vibe check. Please try again.",
      };
    }
  }

  /**
   * Delete a vibe check
   * @param vibeCheckId ID of the vibe check to delete
   * @returns Promise with success status or error
   */
  static async deleteVibeCheck(
    vibeCheckId: string
  ): Promise<{ success: boolean; error: any }> {
    try {
      const result = await standaloneDb.query<any>(
        `DELETE FROM vibe_checks WHERE id = $1`,
        [vibeCheckId]
      );

      // Check if any rows were affected (deleted)
      if (result.rowCount === 0) {
        return {
          success: false,
          error: "Vibe check not found or already deleted",
        };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("Failed to delete vibe check:", error);
      return {
        success: false,
        error: "Failed to delete vibe check. Please try again.",
      };
    }
  }

  /**
   * Transform raw vibe check data to VibeCheckWithDetails
   * @param rawData Raw data from database query
   * @returns Transformed VibeCheckWithDetails object
   */
  private static transformToVibeCheckWithDetails(
    rawData: any
  ): VibeCheckWithDetails {
    const createdAt = new Date(rawData.created_at);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60)
    );
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Generate human-readable time ago string
    let timeAgo: string;
    if (diffInMinutes < 1) {
      timeAgo = "Just now";
    } else if (diffInMinutes < 60) {
      timeAgo = `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
    } else if (diffInMinutes < 1440) {
      // Less than 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      timeAgo = `${hours} hour${hours === 1 ? "" : "s"} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      timeAgo = `${days} day${days === 1 ? "" : "s"} ago`;
    }

    return {
      id: rawData.id,
      venue_id: rawData.venue_id,
      user_id: rawData.user_id,
      rating: rawData.rating,
      comment: rawData.comment,
      photo_url: rawData.photo_url,
      created_at: rawData.created_at,
      updated_at: rawData.updated_at,
      user: {
        id: rawData.user.id,
        name: rawData.user.name || "Anonymous",
        avatar_url: rawData.user.avatar_url,
      },
      venue: {
        id: rawData.venue.id,
        name: rawData.venue.name || "Unknown Venue",
        address: rawData.venue.address,
      },
      time_ago: timeAgo,
      is_recent: createdAt > twoHoursAgo,
    };
  }

  /**
   * Get venue statistics based on recent vibe checks with caching and optimization
   * @param venueId ID of the venue
   * @param hoursBack Number of hours to look back (default: 4)
   * @returns Promise with venue statistics or error
   */
  static async getVenueVibeStats(
    venueId: string,
    hoursBack: number = 4
  ): Promise<{
    data: {
      recent_count: number;
      average_busyness: number | null;
      has_live_activity: boolean;
      latest_vibe_check: VibeCheckWithDetails | null;
    } | null;
    error: any;
  }> {
    try {
      // Check cache first
      const cachedStats = await VibeCheckCacheService.getCachedVenueVibeStats(
        venueId,
        hoursBack
      );
      if (cachedStats) {
        return { data: cachedStats, error: null };
      }

      // Use optimized query service
      const { data: stats, error } =
        await OptimizedQueryService.getVenueVibeStatsOptimized(
          venueId,
          hoursBack
        );

      if (error) {
        return {
          data: null,
          error: error.message || "Failed to fetch venue vibe stats",
        };
      }

      // Cache the results
      await VibeCheckCacheService.cacheVenueVibeStats(
        venueId,
        hoursBack,
        stats
      );

      return { data: stats, error: null };
    } catch (error) {
      console.error(error);
      return {
        data: null,
        error: "Failed to fetch venue vibe stats. Please try again.",
      };
    }
  }
}
