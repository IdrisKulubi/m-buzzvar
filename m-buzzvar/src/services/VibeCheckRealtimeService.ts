import { VibeCheckWithDetails } from "../lib/types";
import { OptimizedRealtimeService } from "./OptimizedRealtimeService";

export interface RealtimeSubscriptionOptions {
  venueId?: string;
  onVibeCheckInsert?: (vibeCheck: VibeCheckWithDetails) => void;
  onVibeCheckUpdate?: (vibeCheck: VibeCheckWithDetails) => void;
  onVibeCheckDelete?: (vibeCheckId: string) => void;
  onError?: (error: any) => void;
}

export class VibeCheckRealtimeService {
  /**
   * Initialize the optimized real-time service
   */
  static initialize(): void {
    OptimizedRealtimeService.initialize();
  }

  /**
   * Subscribe to real-time vibe check updates using optimized service
   * @param subscriptionId Unique identifier for this subscription
   * @param options Subscription configuration options
   * @returns Promise with subscription result
   */
  static async subscribe(
    subscriptionId: string,
    options: RealtimeSubscriptionOptions
  ): Promise<{ success: boolean; error?: string }> {
    // Use optimized real-time service with batching and connection pooling
    return await OptimizedRealtimeService.subscribe(subscriptionId, {
      venueId: options.venueId,
      batchUpdates: true,
      batchDelay: 300, // 300ms batch delay for better performance
      maxRetries: 3,
      onVibeCheckInsert: options.onVibeCheckInsert,
      onVibeCheckUpdate: options.onVibeCheckUpdate,
      onVibeCheckDelete: options.onVibeCheckDelete,
      onError: options.onError,
    });
  }

  /**
   * Unsubscribe from real-time updates using optimized service
   * @param subscriptionId Unique identifier for the subscription to remove
   * @returns Promise with unsubscribe result
   */
  static async unsubscribe(
    subscriptionId: string
  ): Promise<{ success: boolean; error?: string }> {
    return await OptimizedRealtimeService.unsubscribe(subscriptionId);
  }

  /**
   * Unsubscribe from all active subscriptions using optimized service
   * @returns Promise with cleanup result
   */
  static async unsubscribeAll(): Promise<{ success: boolean; error?: string }> {
    return await OptimizedRealtimeService.unsubscribeAll();
  }

  /**
   * Get list of active subscription IDs from optimized service
   * @returns Array of active subscription identifiers
   */
  static getActiveSubscriptions(): string[] {
    const stats = OptimizedRealtimeService.getSubscriptionStats();
    return stats.subscriptionDetails.map((detail) => detail.id);
  }

  /**
   * Check if a subscription is active using optimized service
   * @param subscriptionId Subscription identifier to check
   * @returns Boolean indicating if subscription is active
   */
  static isSubscribed(subscriptionId: string): boolean {
    const activeSubscriptions = this.getActiveSubscriptions();
    return activeSubscriptions.includes(subscriptionId);
  }

  /**
   * Get subscription statistics from optimized service
   */
  static getSubscriptionStats() {
    return OptimizedRealtimeService.getSubscriptionStats();
  }

  /**
   * Handle real-time database events
   * @param payload Event payload from Supabase
   * @param options Subscription options with callbacks
   */
  private static async handleRealtimeEvent(
    payload: any,
    options: RealtimeSubscriptionOptions
  ): Promise<void> {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case "INSERT":
        if (newRecord && options.onVibeCheckInsert) {
          const vibeCheckWithDetails = await this.fetchVibeCheckWithDetails(
            newRecord.id
          );
          if (vibeCheckWithDetails) {
            options.onVibeCheckInsert(vibeCheckWithDetails);
          }
        }
        break;

      case "UPDATE":
        if (newRecord && options.onVibeCheckUpdate) {
          const vibeCheckWithDetails = await this.fetchVibeCheckWithDetails(
            newRecord.id
          );
          if (vibeCheckWithDetails) {
            options.onVibeCheckUpdate(vibeCheckWithDetails);
          }
        }
        break;

      case "DELETE":
        if (oldRecord && options.onVibeCheckDelete) {
          options.onVibeCheckDelete(oldRecord.id);
        }
        break;

      default:
        console.warn("Unknown realtime event type:", eventType);
    }
  }

  /**
   * Fetch complete vibe check details for real-time events
   * @param vibeCheckId ID of the vibe check to fetch
   * @returns Promise with complete vibe check details or null
   */
  private static async fetchVibeCheckWithDetails(
    vibeCheckId: string
  ): Promise<VibeCheckWithDetails | null> {
    try {
      // For now, return null since we don't have a direct method to fetch by ID
      // This method would need to be implemented based on your database layer
      console.warn(
        "fetchVibeCheckWithDetails not implemented - returning null"
      );
      return null;
    } catch (error) {
      console.error("Error fetching vibe check details:", error);
      return null;
    }
  }

  /**
   * Subscribe to live feed updates (all venues)
   * @param subscriptionId Unique identifier for this subscription
   * @param callbacks Event callbacks
   * @returns Promise with subscription result
   */
  static async subscribeToLiveFeed(
    subscriptionId: string,
    callbacks: {
      onVibeCheckInsert?: (vibeCheck: VibeCheckWithDetails) => void;
      onVibeCheckUpdate?: (vibeCheck: VibeCheckWithDetails) => void;
      onVibeCheckDelete?: (vibeCheckId: string) => void;
      onError?: (error: any) => void;
    }
  ): Promise<{ success: boolean; error?: string }> {
    return this.subscribe(subscriptionId, callbacks);
  }

  /**
   * Subscribe to venue-specific vibe check updates
   * @param subscriptionId Unique identifier for this subscription
   * @param venueId ID of the venue to monitor
   * @param callbacks Event callbacks
   * @returns Promise with subscription result
   */
  static async subscribeToVenue(
    subscriptionId: string,
    venueId: string,
    callbacks: {
      onVibeCheckInsert?: (vibeCheck: VibeCheckWithDetails) => void;
      onVibeCheckUpdate?: (vibeCheck: VibeCheckWithDetails) => void;
      onVibeCheckDelete?: (vibeCheckId: string) => void;
      onError?: (error: any) => void;
    }
  ): Promise<{ success: boolean; error?: string }> {
    return this.subscribe(subscriptionId, { ...callbacks, venueId });
  }
}
