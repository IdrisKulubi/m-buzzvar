import * as Location from "expo-location";
import { supabase } from "../lib/supabase";
import {
  VibeCheck,
  VibeCheckWithDetails,
  VibeCheckFormData,
  Venue,
  User,
} from "../lib/types";
import { LocationVerificationService } from "./LocationVerificationService";

export class VibeCheckService {
  /**
   * Create a new vibe check with location verification
   * @param data Form data for the vibe check
   * @param userLocation User's current location for verification
   * @returns Promise with created vibe check or error
   */
  static async createVibeCheck(
    data: VibeCheckFormData,
    userLocation: Location.LocationObject
  ): Promise<{ data: VibeCheck | null; error: any }> {
    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return { data: null, error: "User not authenticated" };
      }

      // Verify location against venue
      const { data: venue, error: venueError } = await supabase
        .from("venues")
        .select("*")
        .eq("id", data.venue_id)
        .single();

      if (venueError || !venue) {
        return { data: null, error: "Venue not found" };
      }

      const locationVerification =
        await LocationVerificationService.verifyUserAtVenue(
          userLocation,
          venue
        );

      if (!locationVerification.is_valid) {
        return {
          data: null,
          error: `You must be within ${LocationVerificationService.MAX_DISTANCE_METERS}m of the venue to post a vibe check. You are ${locationVerification.distance_meters}m away.`,
        };
      }

      // Check rate limiting (one vibe check per user per venue per hour)
      const canPost = await this.canUserPostVibeCheck(user.id, data.venue_id);
      if (!canPost) {
        return {
          data: null,
          error:
            "You can only post one vibe check per venue per hour. Please wait before posting again.",
        };
      }

      // Upload photo if provided
      let photoUrl: string | null = null;
      if (data.photo) {
        const photoResult = await this.uploadVibeCheckPhoto(
          data.photo,
          user.id
        );
        if (photoResult.error) {
          return {
            data: null,
            error: `Photo upload failed: ${photoResult.error}`,
          };
        }
        photoUrl = photoResult.data;
      }

      // Create vibe check record
      const vibeCheckData = {
        venue_id: data.venue_id,
        user_id: user.id,
        busyness_rating: data.busyness_rating,
        comment: data.comment || null,
        photo_url: photoUrl,
        user_latitude: userLocation.coords.latitude,
        user_longitude: userLocation.coords.longitude,
      };

      const { data: vibeCheck, error: insertError } = await supabase
        .from("vibe_checks")
        .insert(vibeCheckData)
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError.message };
      }

      return { data: vibeCheck, error: null };
    } catch (error) {
      console.error(error)
      return {
        data: null,
        error: "Failed to create vibe check. Please try again.",
      };
    }
  }

  /**
   * Get recent vibe checks for a specific venue
   * @param venueId ID of the venue
   * @param hoursBack Number of hours to look back (default: 4)
   * @returns Promise with vibe checks or error
   */
  static async getVenueVibeChecks(
    venueId: string,
    hoursBack: number = 4
  ): Promise<{ data: VibeCheckWithDetails[]; error: any }> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

      const { data: vibeChecks, error } = await supabase
        .from("vibe_checks")
        .select(
          `
          *,
          user:users(id, name, avatar_url),
          venue:venues(id, name, address)
        `
        )
        .eq("venue_id", venueId)
        .gte("created_at", cutoffTime.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        return { data: [], error: error.message };
      }

      const vibeChecksWithDetails = vibeChecks.map(
        this.transformToVibeCheckWithDetails
      );
      return { data: vibeChecksWithDetails, error: null };
    } catch (error) {
      console.error(error)
      return {
        data: [],
        error: "Failed to fetch venue vibe checks. Please try again.",
      };
    }
  }

  /**
   * Get live feed of all recent vibe checks across venues
   * @param hoursBack Number of hours to look back (default: 4)
   * @param limit Maximum number of results (default: 50)
   * @returns Promise with vibe checks or error
   */
  static async getLiveVibeChecks(
    hoursBack: number = 4,
    limit: number = 50
  ): Promise<{ data: VibeCheckWithDetails[]; error: any }> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

      const { data: vibeChecks, error } = await supabase
        .from("vibe_checks")
        .select(
          `
          *,
          user:users(id, name, avatar_url),
          venue:venues(id, name, address)
        `
        )
        .gte("created_at", cutoffTime.toISOString())
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        return { data: [], error: error.message };
      }

      const vibeChecksWithDetails = vibeChecks.map(
        this.transformToVibeCheckWithDetails
      );
      return { data: vibeChecksWithDetails, error: null };
    } catch (error) {
      return {
        data: [],
        error: "Failed to fetch live vibe checks. Please try again.",
      };
    }
  }

  /**
   * Upload a photo for a vibe check
   * @param photo Photo data from form
   * @param userId User ID for file naming
   * @returns Promise with photo URL or error
   */
  static async uploadVibeCheckPhoto(
    photo: { uri: string; type: string; name: string },
    userId: string
  ): Promise<{ data: string | null; error: any }> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = photo.name.split(".").pop() || "jpg";
      const fileName = `vibe-checks/${userId}/${timestamp}.${fileExtension}`;

      // Convert URI to blob for upload
      const response = await fetch(photo.uri);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("photos")
        .upload(fileName, blob, {
          contentType: photo.type,
          upsert: false,
        });

      if (error) {
        return { data: null, error: error.message };
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("photos").getPublicUrl(fileName);

      return { data: publicUrl, error: null };
    } catch (error) {
      return { data: null, error: "Failed to upload photo. Please try again." };
    }
  }

  /**
   * Check if user can post a vibe check for a venue (rate limiting)
   * @param userId User ID
   * @param venueId Venue ID
   * @returns Promise with boolean result
   */
  static async canUserPostVibeCheck(
    userId: string,
    venueId: string
  ): Promise<boolean> {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const { data, error } = await supabase
        .from("vibe_checks")
        .select("id")
        .eq("user_id", userId)
        .eq("venue_id", venueId)
        .gte("created_at", oneHourAgo.toISOString())
        .limit(1);

      if (error) {
        // If there's an error checking, allow the post (fail open)
        console.warn("Error checking rate limit:", error);
        return true;
      }

      // User can post if no recent vibe check exists
      return data.length === 0;
    } catch (error) {
      // If there's an error checking, allow the post (fail open)
      console.warn("Error checking rate limit:", error);
      return true;
    }
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

      const { data: vibeCheck, error } = await supabase
        .from("vibe_checks")
        .select(
          `
          *,
          user:users(id, name, avatar_url),
          venue:venues(id, name, address)
        `
        )
        .eq("user_id", userId)
        .eq("venue_id", venueId)
        .gte("created_at", oneHourAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          return { data: null, error: null };
        }
        return { data: null, error: error.message };
      }

      const vibeCheckWithDetails =
        this.transformToVibeCheckWithDetails(vibeCheck);
      return { data: vibeCheckWithDetails, error: null };
    } catch (error) {
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
    updates: Partial<
      Pick<VibeCheck, "busyness_rating" | "comment" | "photo_url">
    >
  ): Promise<{ data: VibeCheck | null; error: any }> {
    try {
      const { data: vibeCheck, error } = await supabase
        .from("vibe_checks")
        .update(updates)
        .eq("id", vibeCheckId)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: vibeCheck, error: null };
    } catch (error) {
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
      const { error } = await supabase
        .from("vibe_checks")
        .delete()
        .eq("id", vibeCheckId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
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
      busyness_rating: rawData.busyness_rating,
      comment: rawData.comment,
      photo_url: rawData.photo_url,
      user_latitude: rawData.user_latitude,
      user_longitude: rawData.user_longitude,
      created_at: rawData.created_at,
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
   * Get venue statistics based on recent vibe checks
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
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursBack);
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const { data: vibeChecks, error } = await supabase
        .from("vibe_checks")
        .select(
          `
          *,
          user:users(id, name, avatar_url),
          venue:venues(id, name, address)
        `
        )
        .eq("venue_id", venueId)
        .gte("created_at", cutoffTime.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        return { data: null, error: error.message };
      }

      const recentCount = vibeChecks.length;
      const averageBusyness =
        recentCount > 0
          ? vibeChecks.reduce((sum, vc) => sum + vc.busyness_rating, 0) /
            recentCount
          : null;

      const hasLiveActivity = vibeChecks.some(
        (vc) => new Date(vc.created_at) > twoHoursAgo
      );

      const latestVibeCheck =
        vibeChecks.length > 0
          ? this.transformToVibeCheckWithDetails(vibeChecks[0])
          : null;

      return {
        data: {
          recent_count: recentCount,
          average_busyness: averageBusyness,
          has_live_activity: hasLiveActivity,
          latest_vibe_check: latestVibeCheck,
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: "Failed to fetch venue vibe stats. Please try again.",
      };
    }
  }
}
