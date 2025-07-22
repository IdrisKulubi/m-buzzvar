import { standaloneAuth } from "../../lib/auth/standalone-auth";
import { mobileDb as standaloneDb } from "../lib/database/mobile-database-service";
import type { User, Venue, Promotion } from "../lib/types";

// Re-export auth functions for convenience
export const {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut,
  getUser,
  getSession,
  hasRole,
} = standaloneAuth;

// User profile operations
export async function createUserProfile(
  profileData: Omit<User, "id" | "created_at" | "updated_at">
) {
  try {
    console.log("🔵 Creating user profile...");
    const userId = `user_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    const result = await standaloneDb.query<User>(
      `INSERT INTO users (id, email, name, avatar_url, role, university, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
       RETURNING *`,
      [
        userId,
        profileData.email,
        profileData.name,
        profileData.avatar_url || null,
        profileData.role || "user",
        profileData.university || null,
      ]
    );

    const user = result.data[0];
    console.log("🟢 User profile created successfully");
    return { data: user, error: null };
  } catch (error) {
    console.error("🔴 Create profile failed:", error);
    return { data: null, error: error as Error };
  }
}

export async function getUserProfile(userId: string) {
  try {
    console.log("🔵 Getting user profile...");
    const result = await standaloneDb.getUserById(userId);
    const user = result.data[0];
    if (!user) {
      throw new Error("User profile not found");
    }
    console.log("🟢 User profile retrieved successfully");
    return { data: user, error: null };
  } catch (error) {
    console.error("🔴 Get profile failed:", error);
    return { data: null, error: error as Error };
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Omit<User, "id" | "created_at">>
) {
  try {
    console.log("🔵 Updating user profile...");
    const result = await standaloneDb.updateUser(userId, updates);
    const user = result.data[0];
    if (!user) {
      throw new Error("User profile not found");
    }
    console.log("🟢 User profile updated successfully");
    return { data: user, error: null };
  } catch (error) {
    console.error("🔴 Update profile failed:", error);
    return { data: null, error: error as Error };
  }
}

export async function checkUserProfile(userId: string) {
  try {
    console.log("🔵 Checking user profile...");
    const result = await standaloneDb.getUserById(userId);
    const user = result.data[0];
    console.log("🟢 User profile check completed");
    return { hasProfile: !!user, error: null };
  } catch (error) {
    console.error("🔴 Check profile failed:", error);
    return { hasProfile: false, error: error as Error };
  }
}

// Venue operations
export async function getVenues(limit: number = 50, offset: number = 0) {
  try {
    console.log("🔵 Getting venues...");
    const result = await standaloneDb.getVenues({}, limit, offset);
    console.log("🟢 Venues retrieved successfully");
    return { data: result.data, error: null };
  } catch (error) {
    console.error("🔴 Get venues failed:", error);
    return { data: [], error: error as Error };
  }
}

export async function getVenueById(venueId: string) {
  try {
    console.log("🔵 Getting venue by ID...");
    const result = await standaloneDb.getVenueById(venueId);
    const venue = result.data[0];
    if (!venue) {
      throw new Error("Venue not found");
    }
    console.log("🟢 Venue retrieved successfully");
    return { data: venue, error: null };
  } catch (error) {
    console.error("🔴 Get venue failed:", error);
    return { data: null, error: error as Error };
  }
}

export async function getVenuesByOwner(ownerId: string) {
  try {
    console.log("🔵 Getting venues by owner...");
    const result = await standaloneDb.query<Venue[]>(
      `SELECT * FROM venues WHERE owner_id = $1 ORDER BY created_at DESC`,
      [ownerId]
    );
    console.log("� Owner vennues retrieved successfully");
    return { data: result.data, error: null };
  } catch (error) {
    console.error("🔴 Get owner venues failed:", error);
    return { data: [], error: error as Error };
  }
}

export async function createVenue(
  venueData: Omit<Venue, "id" | "created_at" | "updated_at">
) {
  try {
    // Check if user has permission to create venues
    const currentUser = standaloneAuth.getUser();
    if (!currentUser || !standaloneAuth.hasRole("venue_owner")) {
      throw new Error("Insufficient permissions to create venue");
    }

    console.log("🔵 Creating venue...");
    const venueId = `venue_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    const result = await standaloneDb.query<Venue>(
      `INSERT INTO venues (id, name, description, address, latitude, longitude, owner_id, cover_image_url, hours, contact, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) 
       RETURNING *`,
      [
        venueId,
        venueData.name,
        venueData.description || null,
        venueData.address,
        venueData.latitude,
        venueData.longitude,
        currentUser.id,
        venueData.cover_image_url || null,
        venueData.hours || null,
        venueData.contact || null,
      ]
    );

    const venue = result.data[0];
    console.log("🟢 Venue created successfully");
    return { data: venue, error: null };
  } catch (error) {
    console.error("🔴 Create venue failed:", error);
    return { data: null, error: error as Error };
  }
}

// Promotion operations
export async function getPromotions(
  venueId?: string,
  limit: number = 50,
  offset: number = 0
) {
  try {
    console.log("🔵 Getting promotions...");
    let sql = `SELECT * FROM promotions`;
    let params: any[] = [limit, offset];

    if (venueId) {
      sql += ` WHERE venue_id = $3`;
      params.push(venueId);
    }

    sql += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;

    const result = await standaloneDb.query<Promotion>(sql, params);
    console.log("🟢 Promotions retrieved successfully");
    return { data: result.data, error: null };
  } catch (error) {
    console.error("🔴 Get promotions failed:", error);
    return { data: [], error: error as Error };
  }
}

export async function createPromotion(
  promotionData: Omit<Promotion, "id" | "created_at" | "updated_at">
) {
  try {
    // Check if user has permission to create promotions
    const currentUser = standaloneAuth.getUser();
    if (!currentUser || !standaloneAuth.hasRole("venue_owner")) {
      throw new Error("Insufficient permissions to create promotion");
    }

    // Verify user owns the venue
    const venueResult = await standaloneDb.getVenueById(promotionData.venue_id);
    const venue = venueResult.data[0];
    if (!venue || venue.owner_id !== currentUser.id) {
      throw new Error("You can only create promotions for your own venues");
    }

    console.log("🔵 Creating promotion...");
    const promotionId = `promo_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    const result = await standaloneDb.query<Promotion>(
      `INSERT INTO promotions (id, venue_id, title, description, start_date, end_date, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
       RETURNING *`,
      [
        promotionId,
        promotionData.venue_id,
        promotionData.title,
        promotionData.description || null,
        promotionData.start_date,
        promotionData.end_date,
        promotionData.is_active !== false,
      ]
    );

    const promotion = result.data[0];
    console.log("🟢 Promotion created successfully");
    return { data: promotion, error: null };
  } catch (error) {
    console.error("🔴 Create promotion failed:", error);
    return { data: null, error: error as Error };
  }
}

// Database health check
export async function checkDatabaseHealth() {
  try {
    console.log("🔵 Checking database health...");
    const health = await standaloneDb.checkHealth();
    console.log("🟢 Database health check completed");
    return { data: health, error: null };
  } catch (error) {
    console.error("🔴 Database health check failed:", error);
    return { data: null, error: error as Error };
  }
}

// Search functionality
export async function searchVenues(query: string, limit: number = 20) {
  try {
    console.log("🔵 Searching venues...");
    const result = await standaloneDb.query<Venue>(
      `SELECT * FROM venues 
       WHERE name ILIKE $1 OR description ILIKE $1 OR address ILIKE $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [`%${query}%`, limit]
    );
    console.log("🟢 Venue search completed");
    return { data: result.data, error: null };
  } catch (error) {
    console.error("🔴 Venue search failed:", error);
    return { data: [], error: error as Error };
  }
}

// Location-based venue search
export async function getNearbyVenues(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
  limit: number = 20
) {
  try {
    console.log("🔵 Getting nearby venues...");
    // Using Haversine formula for distance calculation
    const result = await standaloneDb.query<Venue & { distance: number }>(
      `SELECT *, 
       (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) AS distance
       FROM venues 
       WHERE (6371 * acos(cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude)))) <= $3
       ORDER BY distance ASC 
       LIMIT $4`,
      [latitude, longitude, radiusKm, limit]
    );
    console.log("🟢 Nearby venues retrieved successfully");
    return { data: result.data, error: null };
  } catch (error) {
    console.error("🔴 Get nearby venues failed:", error);
    return { data: [], error: error as Error };
  }
}

// Analytics functions (for venue owners and admins)
export async function getVenueAnalytics(venueId: string) {
  try {
    const currentUser = standaloneAuth.getUser();
    if (!currentUser || !standaloneAuth.hasRole("venue_owner")) {
      throw new Error("Insufficient permissions to view analytics");
    }

    // Verify user owns the venue or is admin
    if (!standaloneAuth.hasRole("admin")) {
      const venueResult = await standaloneDb.getVenueById(venueId);
      const venue = venueResult.data[0];
      if (!venue || venue.owner_id !== currentUser.id) {
        throw new Error("You can only view analytics for your own venues");
      }
    }

    console.log("🔵 Getting venue analytics...");

    // Get basic venue stats
    const promotionCountResult = await standaloneDb.query<{ count: number }>(
      "SELECT COUNT(*) as count FROM promotions WHERE venue_id = $1",
      [venueId]
    );

    const activePromotionCountResult = await standaloneDb.query<{
      count: number;
    }>(
      "SELECT COUNT(*) as count FROM promotions WHERE venue_id = $1 AND is_active = true",
      [venueId]
    );

    const analytics = {
      venue_id: venueId,
      total_promotions: promotionCountResult.data[0]?.count || 0,
      active_promotions: activePromotionCountResult.data[0]?.count || 0,
      generated_at: new Date().toISOString(),
    };

    console.log("🟢 Venue analytics retrieved successfully");
    return { data: analytics, error: null };
  } catch (error) {
    console.error("🔴 Get venue analytics failed:", error);
    return { data: null, error: error as Error };
  }
}

// Password reset (placeholder - would need email service in production)
export async function resetPassword(email: string) {
  try {
    console.log("🔵 Password reset requested for:", email);

    // In a real app, you would:
    // 1. Check if user exists
    // 2. Generate a secure reset token
    // 3. Send email with reset link
    // 4. Store token with expiration

    const result = await standaloneDb.query<User>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    const user = result.data[0];
    if (!user) {
      // Don't reveal if user exists or not for security
      console.log("🟡 Password reset requested for non-existent user");
    }

    console.log("🟢 Password reset email would be sent (not implemented)");
    return { error: null };
  } catch (error) {
    console.error("🔴 Password reset failed:", error);
    return { error: error as Error };
  }
}
export async function getVenueReviews(venueId: string, limit: number = 50) {
  try {
    console.log("🔵 Getting venue reviews...");
    const result = await standaloneDb.query<any>(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       LEFT JOIN users u ON r.user_id = u.id 
       WHERE r.venue_id = $1 
       ORDER BY r.created_at DESC 
       LIMIT $2`,
      [venueId, limit]
    );
    console.log("🟢 Venue reviews retrieved successfully");
    return { data: result.data, error: null };
  } catch (error) {
    console.error("🔴 Get venue reviews failed:", error);
    return { data: [], error: error as Error };
  }
}

export async function createReview(reviewData: {
  venue_id: string;
  rating: number;
  comment?: string;
}) {
  try {
    const currentUser = standaloneAuth.getUser();
    if (!currentUser) {
      throw new Error("You must be logged in to create a review");
    }

    console.log("🔵 Creating review...");
    const result = await standaloneDb.query<any>(
      `INSERT INTO reviews (id, user_id, venue_id, rating, comment, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
       RETURNING *`,
      [
        `review_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        currentUser.id,
        reviewData.venue_id,
        reviewData.rating,
        reviewData.comment || null,
      ]
    );
    console.log("🟢 Review created successfully");
    return { data: result.data[0], error: null };
  } catch (error) {
    console.error("🔴 Create review failed:", error);
    return { data: null, error: error as Error };
  }
}
