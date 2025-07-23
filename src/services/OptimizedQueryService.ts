import { supabase } from '../lib/supabase';
import { VibeCheckWithDetails } from '../lib/types';

export interface QueryOptions {
  useIndex?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface BatchQueryResult<T> {
  data: T[];
  hasMore: boolean;
  nextOffset?: number;
  totalCount?: number;
}

/**
 * Optimized database query service for vibe checks
 * Implements efficient querying strategies with proper indexing
 */
export class OptimizedQueryService {
  /**
   * Get vibe checks for a venue with optimized query
   * Uses composite index on (venue_id, created_at DESC)
   */
  static async getVenueVibeChecksOptimized(
    venueId: string,
    hoursBack: number = 4,
    options: QueryOptions = {}
  ): Promise<{ data: VibeCheckWithDetails[]; error: any }> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

      // Use optimized query with proper index utilization
      let query = supabase
        .from('vibe_checks')
        .select(`
          id,
          venue_id,
          user_id,
          busyness_rating,
          comment,
          photo_url,
          user_latitude,
          user_longitude,
          created_at,
          user:users!inner(id, name, avatar_url),
          venue:venues!inner(id, name, address)
        `)
        .eq('venue_id', venueId)
        .gte('created_at', cutoffTime.toISOString());

      // Apply ordering to utilize index
      query = query.order('created_at', { ascending: false });

      // Apply limit if specified
      if (options.limit) {
        query = query.limit(options.limit);
      }

      // Apply offset for pagination
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data: vibeChecks, error } = await query;

      if (error) {
        return { data: [], error };
      }

      const transformedData = vibeChecks.map(this.transformToVibeCheckWithDetails);
      return { data: transformedData, error: null };
    } catch (error) {
      console.error('Error in optimized venue vibe checks query:', error);
      return { data: [], error };
    }
  }

  /**
   * Get live vibe checks with optimized query and pagination
   * Uses index on (created_at DESC)
   */
  static async getLiveVibeChecksOptimized(
    hoursBack: number = 4,
    options: QueryOptions = {}
  ): Promise<{ data: VibeCheckWithDetails[]; error: any; hasMore?: boolean }> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

      const limit = options.limit || 50;
      const offset = options.offset || 0;

      // Use optimized query with proper index utilization
      let query = supabase
        .from('vibe_checks')
        .select(`
          id,
          venue_id,
          user_id,
          busyness_rating,
          comment,
          photo_url,
          user_latitude,
          user_longitude,
          created_at,
          user:users!inner(id, name, avatar_url),
          venue:venues!inner(id, name, address)
        `)
        .gte('created_at', cutoffTime.toISOString())
        .order('created_at', { ascending: false })
        .range(offset, offset + limit);

      const { data: vibeChecks, error } = await query;

      if (error) {
        return { data: [], error, hasMore: false };
      }

      const transformedData = vibeChecks.map(this.transformToVibeCheckWithDetails);
      const hasMore = vibeChecks.length === limit + 1;

      // Remove extra item if we got one more than requested
      if (hasMore) {
        transformedData.pop();
      }

      return { data: transformedData, error: null, hasMore };
    } catch (error) {
      console.error('Error in optimized live vibe checks query:', error);
      return { data: [], error, hasMore: false };
    }
  }

  /**
   * Get venue vibe statistics with optimized aggregation query
   */
  static async getVenueVibeStatsOptimized(
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

      // Use a single optimized query to get all needed data
      const { data: vibeChecks, error } = await supabase
        .from('vibe_checks')
        .select(`
          id,
          venue_id,
          user_id,
          busyness_rating,
          comment,
          photo_url,
          user_latitude,
          user_longitude,
          created_at,
          user:users!inner(id, name, avatar_url),
          venue:venues!inner(id, name, address)
        `)
        .eq('venue_id', venueId)
        .gte('created_at', cutoffTime.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        return { data: null, error };
      }

      // Calculate statistics from the fetched data
      const recentCount = vibeChecks.length;
      const averageBusyness = recentCount > 0
        ? vibeChecks.reduce((sum, vc) => sum + vc.busyness_rating, 0) / recentCount
        : null;

      const hasLiveActivity = vibeChecks.some(
        vc => new Date(vc.created_at) > twoHoursAgo
      );

      const latestVibeCheck = vibeChecks.length > 0
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
      console.error('Error in optimized venue vibe stats query:', error);
      return { data: null, error };
    }
  }

  /**
   * Batch query multiple venues' vibe check data
   */
  static async batchGetVenueVibeStats(
    venueIds: string[],
    hoursBack: number = 4
  ): Promise<{
    data: Record<string, {
      recent_count: number;
      average_busyness: number | null;
      has_live_activity: boolean;
      latest_vibe_check: VibeCheckWithDetails | null;
    }>;
    error: any;
  }> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hoursBack);
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      // Single query to get all vibe checks for all venues
      const { data: vibeChecks, error } = await supabase
        .from('vibe_checks')
        .select(`
          id,
          venue_id,
          user_id,
          busyness_rating,
          comment,
          photo_url,
          user_latitude,
          user_longitude,
          created_at,
          user:users!inner(id, name, avatar_url),
          venue:venues!inner(id, name, address)
        `)
        .in('venue_id', venueIds)
        .gte('created_at', cutoffTime.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        return { data: {}, error };
      }

      // Group by venue and calculate statistics
      const venueStats: Record<string, any> = {};

      // Initialize all venues with empty stats
      venueIds.forEach(venueId => {
        venueStats[venueId] = {
          recent_count: 0,
          average_busyness: null,
          has_live_activity: false,
          latest_vibe_check: null,
        };
      });

      // Group vibe checks by venue
      const venueGroups: Record<string, any[]> = {};
      vibeChecks.forEach(vc => {
        if (!venueGroups[vc.venue_id]) {
          venueGroups[vc.venue_id] = [];
        }
        venueGroups[vc.venue_id].push(vc);
      });

      // Calculate stats for each venue
      Object.entries(venueGroups).forEach(([venueId, checks]) => {
        const recentCount = checks.length;
        const averageBusyness = recentCount > 0
          ? checks.reduce((sum, vc) => sum + vc.busyness_rating, 0) / recentCount
          : null;

        const hasLiveActivity = checks.some(
          vc => new Date(vc.created_at) > twoHoursAgo
        );

        const latestVibeCheck = checks.length > 0
          ? this.transformToVibeCheckWithDetails(checks[0])
          : null;

        venueStats[venueId] = {
          recent_count: recentCount,
          average_busyness: averageBusyness,
          has_live_activity: hasLiveActivity,
          latest_vibe_check: latestVibeCheck,
        };
      });

      return { data: venueStats, error: null };
    } catch (error) {
      console.error('Error in batch venue vibe stats query:', error);
      return { data: {}, error };
    }
  }

  /**
   * Get user's recent vibe check for rate limiting with optimized query
   */
  static async getUserRecentVibeCheckOptimized(
    userId: string,
    venueId: string
  ): Promise<{
    data: {
      canPost: boolean;
      timeUntilReset?: number;
      lastVibeCheck?: Date;
    };
    error: any;
  }> {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      // Use index on user_id for efficient lookup
      const { data, error } = await supabase
        .from('vibe_checks')
        .select('created_at')
        .eq('user_id', userId)
        .eq('venue_id', venueId)
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.warn('Error checking rate limit:', error);
        return { data: { canPost: true }, error: null };
      }

      if (data.length === 0) {
        return { data: { canPost: true }, error: null };
      }

      // Calculate time until user can post again
      const lastVibeCheck = new Date(data[0].created_at);
      const oneHourLater = new Date(lastVibeCheck.getTime() + 60 * 60 * 1000);
      const now = new Date();
      const timeUntilReset = Math.max(0, oneHourLater.getTime() - now.getTime());

      return {
        data: {
          canPost: timeUntilReset === 0,
          timeUntilReset: timeUntilReset > 0 ? timeUntilReset : undefined,
          lastVibeCheck,
        },
        error: null,
      };
    } catch (error) {
      console.warn('Error checking rate limit:', error);
      return { data: { canPost: true }, error: null };
    }
  }

  /**
   * Transform raw vibe check data to VibeCheckWithDetails
   * Optimized version with minimal processing
   */
  private static transformToVibeCheckWithDetails(rawData: any): VibeCheckWithDetails {
    const createdAt = new Date(rawData.created_at);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60)
    );
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Optimized time ago calculation
    let timeAgo: string;
    if (diffInMinutes < 1) {
      timeAgo = "Just now";
    } else if (diffInMinutes < 60) {
      timeAgo = `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      timeAgo = `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      timeAgo = `${days}d ago`;
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
}