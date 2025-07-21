import * as Location from "expo-location";
import {
  VibeCheck,
  VibeCheckWithDetails,
  VibeCheckFormData,
} from "../lib/types";
import { LocationVerificationService } from "./LocationVerificationService";
import { standaloneAuth } from "../../lib/auth/standalone-auth";
import { standaloneDb } from "../../lib/database/standalone-db";

export class VibeCheckServiceStandalone {
  /**
   * Create a new vibe check
   * @param data Form data for the vibe check
   * @param userLocation User's current location for verification
   * @returns Promise with created vibe check or error
   */
  static async createVibeCheck(
    data: VibeCheckFormData,
    userLocation: Location.LocationObject
  ): Promise<{ data: VibeCheck | null; error: Error | null }> {
    try {
      // Get current user
      const user = standaloneAuth.getUser();
      if (!user) {
        throw new Error("Authentication required");
      }

      // First get the venue data
      const venueResult = await standaloneDb.query<any>(
        `SELECT * FROM venues WHERE id = $1`,
        [data.venue_id]
      );

      if (venueResult.data.length === 0) {
        throw new Error("Venue not found");
      }

      const venue = venueResult.data[0];

      // Verify location
      const locationVerification =
        await LocationVerificationService.verifyLocationForVenue(venue);

      if (locationVerification.error) {
        throw new Error(locationVerification.error.message);
      }

      if (!locationVerification.verification?.is_valid) {
        throw new Error(
          `You must be within 100m of ${locationVerification.verification?.venue_name} to post a vibe check`
        );
      }

      // Check if user can post (rate limiting)
      const canPost = await this.canUserPostVibeCheck(user.id, data.venue_id);
      if (!canPost) {
        throw new Error("You can only post one vibe check per venue per hour");
      }

      // Handle photo upload if provided
      let photoUrl: string | null = null;
      if (data.photo) {
        // For now, we'll skip photo upload in standalone mode
        // In a real implementation, you'd upload to your chosen storage service
        console.log("Photo upload not implemented in standalone mode");
      }

      // Create vibe check
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

      return { data: vibeCheckResult.data[0], error: null };
    } catch (error) {
      console.error("🔴 Create vibe check failed:", error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Check if user can post a vibe check (rate limiting)
   */
  static async canUserPostVibeCheck(
    userId: string,
    venueId: string
  ): Promise<boolean> {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const recentVibeChecksResult = await standaloneDb.query<any>(
        `SELECT id FROM vibe_checks 
         WHERE user_id = $1 AND venue_id = $2 AND created_at > $3`,
        [userId, venueId, oneHourAgo.toISOString()]
      );

      return recentVibeChecksResult.data.length === 0;
    } catch (error) {
      console.error("🔴 Check user can post failed:", error);
      return false;
    }
  }

  /**
   * Get vibe checks for a venue
   */
  static async getVenueVibeChecks(
    venueId: string,
    limit: number = 20
  ): Promise<{ data: VibeCheckWithDetails[]; error: Error | null }> {
    try {
      const vibeChecksResult = await standaloneDb.query<any>(
        `SELECT 
          vc.*,
          u.name as user_name,
          u.avatar_url as user_avatar_url,
          v.name as venue_name,
          v.address as venue_address
         FROM vibe_checks vc
         LEFT JOIN users u ON vc.user_id = u.id
         LEFT JOIN venues v ON vc.venue_id = v.id
         WHERE vc.venue_id = $1
         ORDER BY vc.created_at DESC
         LIMIT $2`,
        [venueId, limit]
      );

      const vibeChecksWithDetails: VibeCheckWithDetails[] = vibeChecksResult.data.map(
        (vc: any) => ({
          ...vc,
          user: {
            id: vc.user_id,
            name: vc.user_name || "Anonymous",
            avatar_url: vc.user_avatar_url,
          },
          venue: {
            id: vc.venue_id,
            name: vc.venue_name,
            address: vc.venue_address,
          },
          time_ago: this.formatTimeAgo(new Date(vc.created_at)),
          is_recent: this.isRecent(new Date(vc.created_at)),
        })
      );

      return { data: vibeChecksWithDetails, error: null };
    } catch (error) {
      console.error("🔴 Get venue vibe checks failed:", error);
      return { data: [], error: error as Error };
    }
  }

  /**
   * Get recent vibe checks across all venues
   */
  static async getRecentVibeChecks(
    limit: number = 50
  ): Promise<{ data: VibeCheckWithDetails[]; error: Error | null }> {
    try {
      const vibeChecksResult = await standaloneDb.query<any>(
        `SELECT 
          vc.*,
          u.name as user_name,
          u.avatar_url as user_avatar_url,
          v.name as venue_name,
          v.address as venue_address
         FROM vibe_checks vc
         LEFT JOIN users u ON vc.user_id = u.id
         LEFT JOIN venues v ON vc.venue_id = v.id
         WHERE vc.created_at > NOW() - INTERVAL '4 hours'
         ORDER BY vc.created_at DESC
         LIMIT $1`,
        [limit]
      );

      const vibeChecksWithDetails: VibeCheckWithDetails[] = vibeChecksResult.data.map(
        (vc: any) => ({
          ...vc,
          user: {
            id: vc.user_id,
            name: vc.user_name || "Anonymous",
            avatar_url: vc.user_avatar_url,
          },
          venue: {
            id: vc.venue_id,
            name: vc.venue_name,
            address: vc.venue_address,
          },
          time_ago: this.formatTimeAgo(new Date(vc.created_at)),
          is_recent: this.isRecent(new Date(vc.created_at)),
        })
      );

      return { data: vibeChecksWithDetails, error: null };
    } catch (error) {
      console.error("🔴 Get recent vibe checks failed:", error);
      return { data: [], error: error as Error };
    }
  }

  /**
   * Format time ago string
   */
  private static formatTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) {
      const years = Math.floor(interval);
      return years + (years === 1 ? " year ago" : " years ago");
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      const months = Math.floor(interval);
      return months + (months === 1 ? " month ago" : " months ago");
    }
    interval = seconds / 86400;
    if (interval > 1) {
      const days = Math.floor(interval);
      return days + (days === 1 ? " day ago" : " days ago");
    }
    interval = seconds / 3600;
    if (interval > 1) {
      const hours = Math.floor(interval);
      return hours + (hours === 1 ? " hour ago" : " hours ago");
    }
    interval = seconds / 60;
    if (interval > 1) {
      const minutes = Math.floor(interval);
      return minutes + (minutes === 1 ? " minute ago" : " minutes ago");
    }
    if (seconds < 10) {
      return "just now";
    }
    return Math.floor(seconds) + " seconds ago";
  }

  /**
   * Check if a date is recent (within 2 hours)
   */
  private static isRecent(date: Date): boolean {
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    return date > twoHoursAgo;
  }
}
