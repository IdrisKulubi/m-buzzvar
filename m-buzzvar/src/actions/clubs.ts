import { mobileDb as standaloneDb } from "../lib/database/mobile-database-service";
import * as Location from "expo-location";

export interface Venue {
  id: string;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  contact: string | null;
  hours: string | null;
  cover_image_url: string | null;
  cover_video_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface VenueWithDistance extends Venue {
  distance?: number;
  menus?: Menu[];
  promotions?: Promotion[];
  isBookmarked?: boolean;
  recent_vibe_count?: number;
  average_recent_busyness?: number | null;
  has_live_activity?: boolean;
  latest_vibe_check?: any;
}

export interface Menu {
  id: string;
  venue_id: string;
  type: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Promotion {
  id: string;
  venue_id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

// Calculate distance between two coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fetch all venues with optional location-based sorting and vibe check data
export async function getVenues(userLocation?: Location.LocationObject) {
  try {
    const { data: venues, error } = await supabase
      .from("venues")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!venues) return { data: [], error: null };

    // Fetch vibe check data and review stats for all venues
    const venuesWithVibeData = await Promise.all(
      venues.map(async (venue) => {
        let distance: number | undefined;

        if (userLocation && venue.latitude && venue.longitude) {
          distance = calculateDistance(
            userLocation.coords.latitude,
            userLocation.coords.longitude,
            venue.latitude,
            venue.longitude
          );
        }

        // Get vibe check summary for this venue
        const vibeStats = await getVenueVibeStats(venue.id);

        // Get review stats for this venue
        const reviewStats = await getVenueReviewStats(venue.id);

        return {
          ...venue,
          distance,
          recent_vibe_count: vibeStats.recent_count,
          average_recent_busyness: vibeStats.average_busyness,
          has_live_activity: vibeStats.has_live_activity,
          latest_vibe_check: vibeStats.latest_vibe_check,
          review_count: reviewStats.count,
          average_rating: reviewStats.average,
        };
      })
    );

    // Sort by live activity first, then by distance if available
    venuesWithVibeData.sort((a, b) => {
      // Prioritize venues with live activity
      if (a.has_live_activity && !b.has_live_activity) return -1;
      if (!a.has_live_activity && b.has_live_activity) return 1;

      // Then sort by distance if available
      if (userLocation) {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      }

      // Finally sort by creation date
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return { data: venuesWithVibeData, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

// Get a single venue with full details
export async function getVenueById(venueId: string, userId?: string) {
  try {
    // Fetch venue details
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("*")
      .eq("id", venueId)
      .single();

    if (venueError) throw venueError;

    // Fetch menus
    const { data: menus, error: menusError } = await supabase
      .from("menus")
      .select("*")
      .eq("venue_id", venueId);

    if (menusError) throw menusError;

    // Fetch promotions
    const { data: promotions, error: promotionsError } = await supabase
      .from("promotions")
      .select("*")
      .eq("venue_id", venueId)
      .eq("is_active", true)
      .gte("end_date", new Date().toISOString().split("T")[0]);

    if (promotionsError) throw promotionsError;

    // Fetch vibe check summary (last 4 hours)
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

    const { data: vibeChecks, error: vibeChecksError } = await supabase
      .from("vibe_checks")
      .select(
        `
        *,
        users(id, name, avatar_url)
      `
      )
      .eq("venue_id", venueId)
      .gte("created_at", fourHoursAgo.toISOString())
      .order("created_at", { ascending: false });

    if (vibeChecksError) {
      console.warn("Error fetching vibe checks:", vibeChecksError);
    }

    // Calculate vibe check summary
    const recentVibeChecks = vibeChecks || [];
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const recentVibeCount = recentVibeChecks.length;
    const averageRecentBusyness =
      recentVibeCount > 0
        ? recentVibeChecks.reduce((sum, vc) => sum + vc.busyness_rating, 0) /
          recentVibeCount
        : null;

    const hasLiveActivity = recentVibeChecks.some(
      (vc) => new Date(vc.created_at) > twoHoursAgo
    );

    const latestVibeCheck =
      recentVibeChecks.length > 0 ? recentVibeChecks[0] : null;

    // Check if bookmarked by user
    let isBookmarked = false;
    if (userId) {
      const { data: bookmark } = await supabase
        .from("user_bookmarks")
        .select("id")
        .eq("user_id", userId)
        .eq("venue_id", venueId)
        .single();

      isBookmarked = !!bookmark;
    }

    const venueWithDetails: VenueWithDistance = {
      ...venue,
      menus: menus || [],
      promotions: promotions || [],
      isBookmarked,
      // Add vibe check summary
      recent_vibe_count: recentVibeCount,
      average_recent_busyness: averageRecentBusyness,
      has_live_activity: hasLiveActivity,
      latest_vibe_check: latestVibeCheck,
    };

    // Record the view
    if (userId) {
      await recordClubView(venueId, userId, "view");
    }

    return { data: venueWithDetails, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Record club interaction (view, like, share)
export async function recordClubView(
  clubId: string,
  userId: string,
  interactionType: "view" | "like" | "bookmark" | "share" = "view"
) {
  try {
    const { error } = await supabase.from("club_views").upsert(
      {
        club_id: clubId,
        user_id: userId,
        interaction_type: interactionType,
        viewed_at: new Date().toISOString(),
      },
      {
        onConflict: "club_id,user_id,interaction_type",
      }
    );

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error };
  }
}

// Bookmark/unbookmark venue
export async function toggleBookmark(venueId: string, userId: string) {
  try {
    // Check if already bookmarked
    const { data: existing } = await supabase
      .from("user_bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("venue_id", venueId)
      .single();

    if (existing) {
      // Remove bookmark
      const { error } = await supabase
        .from("user_bookmarks")
        .delete()
        .eq("id", existing.id);

      if (error) throw error;
      return { data: { bookmarked: false }, error: null };
    } else {
      // Add bookmark
      const { error } = await supabase.from("user_bookmarks").insert({
        user_id: userId,
        venue_id: venueId,
      });

      if (error) throw error;

      // Record bookmark interaction
      await recordClubView(venueId, userId, "bookmark");

      return { data: { bookmarked: true }, error: null };
    }
  } catch (error) {
    return { data: null, error };
  }
}

// Get user's bookmarked venues
export async function getUserBookmarks(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_bookmarks")
      .select(
        `
        venue_id,
        created_at,
        venues (*)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const bookmarkedVenues =
      data?.map((bookmark: any) => ({
        ...bookmark.venues,
        bookmarked_at: bookmark.created_at,
      })) || [];

    return { data: bookmarkedVenues, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

// Search venues by name or description
export async function searchVenues(
  query: string,
  userLocation?: Location.LocationObject
) {
  try {
    const { data: venues, error } = await supabase
      .from("venues")
      .select("*")
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order("name");

    if (error) throw error;

    if (!venues) return { data: [], error: null };

    // Add distance calculation if user location is provided
    const venuesWithDistance: VenueWithDistance[] = venues.map((venue) => {
      let distance: number | undefined;

      if (userLocation && venue.latitude && venue.longitude) {
        distance = calculateDistance(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          venue.latitude,
          venue.longitude
        );
      }

      return {
        ...venue,
        distance,
      };
    });

    return { data: venuesWithDistance, error: null };
  } catch (error) {
    return { data: [], error };
  }
}

// Get venues near a specific location
export async function getNearbyVenues(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
) {
  // This would ideally be a call to a PostgREST function
  // for performance, but this is a simple implementation.
  const { data, error } = await supabase.from("venues").select("*");

  if (error) {
    console.error("Error fetching venues for nearby search:", error);
    return { data: [], error };
  }

  const nearby = data
    .map((venue) => {
      if (!venue.latitude || !venue.longitude) return null;
      const distance = calculateDistance(
        latitude,
        longitude,
        venue.latitude,
        venue.longitude
      );
      return { ...venue, distance };
    })
    .filter(
      (v): v is VenueWithDistance => v !== null && v.distance! <= radiusKm
    )
    .sort((a, b) => a.distance! - b.distance!);

  return { data: nearby, error: null };
}

export async function addReview({
  venueId,
  userId,
  rating,
  comment,
}: {
  venueId: string;
  userId: string;
  rating: number;
  comment: string;
}) {
  if (rating < 1 || rating > 5) {
    return {
      data: null,
      error: { message: "Rating must be between 1 and 5." },
    };
  }

  const { data, error } = await supabase
    .from("reviews")
    .upsert(
      {
        venue_id: venueId,
        user_id: userId,
        rating: rating,
        comment: comment.trim() || null,
      },
      { onConflict: "user_id, venue_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("Error adding or updating review:", error);
  }

  return { data, error };
}

// Get venue review statistics
export async function getVenueReviewStats(venueId: string) {
  try {
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("rating")
      .eq("venue_id", venueId);

    if (error) {
      console.warn("Error fetching reviews for venue stats:", error);
      return { count: 0, average: 0 };
    }

    const reviewList = reviews || [];
    const count = reviewList.length;
    const average =
      count > 0
        ? reviewList.reduce((sum, review) => sum + review.rating, 0) / count
        : 0;

    return { count, average };
  } catch (error) {
    console.warn("Error in getVenueReviewStats:", error);
    return { count: 0, average: 0 };
  }
}

// Get venue vibe check statistics
async function getVenueVibeStats(venueId: string) {
  try {
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const { data: vibeChecks, error } = await supabase
      .from("vibe_checks")
      .select(
        `
        *,
        users(id, name, avatar_url)
      `
      )
      .eq("venue_id", venueId)
      .gte("created_at", fourHoursAgo.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Error fetching vibe checks for venue stats:", error);
      return {
        recent_count: 0,
        average_busyness: null,
        has_live_activity: false,
        latest_vibe_check: null,
      };
    }

    const recentVibeChecks = vibeChecks || [];
    const recentCount = recentVibeChecks.length;
    const averageBusyness =
      recentCount > 0
        ? recentVibeChecks.reduce((sum, vc) => sum + vc.busyness_rating, 0) /
          recentCount
        : null;

    const hasLiveActivity = recentVibeChecks.some(
      (vc) => new Date(vc.created_at) > twoHoursAgo
    );

    const latestVibeCheck =
      recentVibeChecks.length > 0 ? recentVibeChecks[0] : null;

    return {
      recent_count: recentCount,
      average_busyness: averageBusyness,
      has_live_activity: hasLiveActivity,
      latest_vibe_check: latestVibeCheck,
    };
  } catch (error) {
    console.warn("Error in getVenueVibeStats:", error);
    return {
      recent_count: 0,
      average_busyness: null,
      has_live_activity: false,
      latest_vibe_check: null,
    };
  }
}

export async function addVibeCheck({
  venueId,
  userId,
  busyness_rating,
  comment,
}: {
  venueId: string;
  userId: string;
  busyness_rating: number;
  comment?: string;
}) {
  if (busyness_rating < 1 || busyness_rating > 5) {
    return {
      data: null,
      error: { message: "Busyness rating must be between 1 and 5." },
    };
  }

  try {
    // Get user's current location for verification
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return {
        data: null,
        error: {
          message: "Location permission is required to post vibe checks.",
        },
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    // Get venue details for location verification
    const { data: venue, error: venueError } = await standaloneDb.query<Venue[]>(
      `SELECT * FROM venues WHERE id = $1 LIMIT 1`,
      [venueId]
    ).then(result => {
      return { 
        data: result[0] || null, 
        error: result.length === 0 ? new Error('Venue not found') : null 
      };
    });

    if (venueError || !venue) {
      return { data: null, error: { message: "Venue not found." } };
    }

    // Verify user is within 100m of venue
    if (venue.latitude && venue.longitude) {
      const distance = calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        venue.latitude,
        venue.longitude
      );

      // Convert km to meters
      const distanceInMeters = distance * 1000;

      if (distanceInMeters > 100) {
        return {
          data: null,
          error: {
            message: `You must be within 100m of the venue to post a vibe check. You are ${Math.round(
              distanceInMeters
            )}m away.`,
          },
        };
      }
    }

    // Check if user has already posted a vibe check for this venue in the last hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const existingVibeChecks = await standaloneDb.query<{id: string}[]>(
      `SELECT id FROM vibe_checks 
       WHERE user_id = $1 
       AND venue_id = $2 
       AND created_at >= $3
       LIMIT 1`,
      [userId, venueId, oneHourAgo.toISOString()]
    );
    
    const existingVibeCheck = existingVibeChecks.length > 0 ? existingVibeChecks[0] : null;

    if (existingVibeCheck) {
      return {
        data: null,
        error: {
          message:
            "You can only post one vibe check per venue per hour. Please wait before posting again.",
        },
      };
    }

    // Insert the vibe check
    const vibeCheckId = `vibe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await standaloneDb.query<any[]>(
      `INSERT INTO vibe_checks 
       (id, venue_id, user_id, rating, comment, user_latitude, user_longitude, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
       RETURNING *`,
      [
        vibeCheckId,
        venueId,
        userId,
        busyness_rating,
        comment?.trim() || null,
        location.coords.latitude,
        location.coords.longitude
      ]
    );
    
    const data = result.length > 0 ? result[0] : null;
    const error = result.length === 0 ? new Error('Failed to insert vibe check') : null;

    if (error) {
      console.error("Error adding vibe check:", error);
      return {
        data: null,
        error: { message: "Failed to post vibe check. Please try again." },
      };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Error in addVibeCheck:", error);
    return {
      data: null,
      error: { message: "Failed to post vibe check. Please try again." },
    };
  }
}

// Get recent vibe checks for homepage feed
export async function getRecentVibeChecks(limit: number = 10) {
  try {
    const fourHoursAgo = new Date();
    fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

    const { data: vibeChecks, error } = await supabase
      .from("vibe_checks")
      .select(
        `
        *,
        users(id, name, avatar_url),
        venues(id, name, address, cover_image_url)
      `
      )
      .gte("created_at", fourHoursAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent vibe checks:", error);
      return { data: [], error };
    }

    // Format the data to match VibeCheckWithDetails interface
    const formattedVibeChecks =
      vibeChecks?.map((vc) => ({
        ...vc,
        user: vc.users,
        venue: vc.venues,
        time_ago: formatTimeAgo(vc.created_at),
        is_recent: isWithinHours(vc.created_at, 2),
      })) || [];

    return { data: formattedVibeChecks, error: null };
  } catch (error) {
    console.error("Error in getRecentVibeChecks:", error);
    return { data: [], error };
  }
}

// Get venues with recent activity for homepage
export async function getVenuesWithRecentActivity(limit: number = 5) {
  try {
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const { data: venuesWithActivity, error } = await supabase
      .from("venues")
      .select(
        `
        *,
        vibe_checks!inner(
          id,
          busyness_rating,
          created_at,
          users(id, name, avatar_url)
        )
      `
      )
      .gte("vibe_checks.created_at", twoHoursAgo.toISOString())
      .order("vibe_checks.created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching venues with recent activity:", error);
      return { data: [], error };
    }

    // Process and format the data
    const processedVenues =
      venuesWithActivity?.map((venue) => {
        const recentVibeChecks = venue.vibe_checks || [];
        const averageBusyness =
          recentVibeChecks.length > 0
            ? recentVibeChecks.reduce(
                (sum: number, vc: any) => sum + vc.busyness_rating,
                0
              ) / recentVibeChecks.length
            : null;

        return {
          ...venue,
          recent_vibe_count: recentVibeChecks.length,
          average_recent_busyness: averageBusyness,
          has_live_activity: true,
          latest_vibe_check: recentVibeChecks[0] || null,
        };
      }) || [];

    return { data: processedVenues, error: null };
  } catch (error) {
    console.error("Error in getVenuesWithRecentActivity:", error);
    return { data: [], error };
  }
}

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

// Helper function to check if date is within specified hours
function isWithinHours(dateString: string, hours: number): boolean {
  const now = new Date();
  const date = new Date(dateString);
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  return diffInHours <= hours;
}

// Get venues with live activity for homepage
export async function getVenuesWithLiveActivity(limit: number = 5) {
  try {
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    // Get venues that have recent vibe checks
    const { data: venuesWithVibes, error } = await supabase
      .from("venues")
      .select(
        `
        *,
        vibe_checks!inner(
          id,
          busyness_rating,
          created_at,
          users(id, name, avatar_url)
        )
      `
      )
      .gte("vibe_checks.created_at", twoHoursAgo.toISOString())
      .order("vibe_checks.created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching venues with live activity:", error);
      return { data: [], error };
    }

    // Process the data to include vibe check summary and review stats
    const processedVenues = await Promise.all(
      (venuesWithVibes || []).map(async (venue) => {
        const recentVibeChecks = venue.vibe_checks || [];
        const averageBusyness =
          recentVibeChecks.length > 0
            ? recentVibeChecks.reduce(
                (sum: number, vc: any) => sum + vc.busyness_rating,
                0
              ) / recentVibeChecks.length
            : null;

        // Get review stats for this venue
        const reviewStats = await getVenueReviewStats(venue.id);

        return {
          ...venue,
          recent_vibe_count: recentVibeChecks.length,
          average_recent_busyness: averageBusyness,
          has_live_activity: true,
          latest_vibe_check: recentVibeChecks[0] || null,
          review_count: reviewStats.count,
          average_rating: reviewStats.average,
        };
      })
    );

    return { data: processedVenues, error: null };
  } catch (error) {
    console.error("Error in getVenuesWithLiveActivity:", error);
    return { data: [], error };
  }
}
