import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { VibeCheckWithDetails } from '../lib/types';
import { VibeCheckService } from './VibeCheckService';

export interface RealtimeSubscriptionOptions {
  venueId?: string;
  onVibeCheckInsert?: (vibeCheck: VibeCheckWithDetails) => void;
  onVibeCheckUpdate?: (vibeCheck: VibeCheckWithDetails) => void;
  onVibeCheckDelete?: (vibeCheckId: string) => void;
  onError?: (error: any) => void;
}

export class VibeCheckRealtimeService {
  private static subscriptions = new Map<string, RealtimeChannel>();

  /**
   * Clear all subscriptions (for testing purposes)
   * @internal
   */
  static _clearSubscriptions(): void {
    this.subscriptions.clear();
  }

  /**
   * Subscribe to real-time vibe check updates
   * @param subscriptionId Unique identifier for this subscription
   * @param options Subscription configuration options
   * @returns Promise with subscription result
   */
  static async subscribe(
    subscriptionId: string,
    options: RealtimeSubscriptionOptions
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove existing subscription if it exists
      await this.unsubscribe(subscriptionId);

      // Create channel name based on venue filter
      const channelName = options.venueId 
        ? `vibe-checks-venue-${options.venueId}`
        : 'vibe-checks-all';

      // Create new channel
      const channel = supabase.channel(channelName);

      // Configure subscription filter
      let subscription = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vibe_checks',
          ...(options.venueId && { filter: `venue_id=eq.${options.venueId}` })
        },
        async (payload) => {
          try {
            await this.handleRealtimeEvent(payload, options);
          } catch (error) {
            console.error('Error handling realtime event:', error);
            options.onError?.(error);
          }
        }
      );

      // Subscribe to the channel
      const subscribeResult = await channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${channelName}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to ${channelName}`);
          options.onError?.('Failed to establish real-time connection');
        }
      });

      // Store the subscription
      this.subscriptions.set(subscriptionId, channel);

      return { success: true };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create subscription' 
      };
    }
  }

  /**
   * Unsubscribe from real-time updates
   * @param subscriptionId Unique identifier for the subscription to remove
   * @returns Promise with unsubscribe result
   */
  static async unsubscribe(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const channel = this.subscriptions.get(subscriptionId);
      if (channel) {
        await supabase.removeChannel(channel);
        this.subscriptions.delete(subscriptionId);
        console.log(`Unsubscribed from ${subscriptionId}`);
      }
      return { success: true };
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to unsubscribe' 
      };
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   * @returns Promise with cleanup result
   */
  static async unsubscribeAll(): Promise<{ success: boolean; error?: string }> {
    try {
      const subscriptionIds = Array.from(this.subscriptions.keys());
      
      for (const subscriptionId of subscriptionIds) {
        const result = await this.unsubscribe(subscriptionId);
        if (!result.success) {
          return { success: false, error: result.error };
        }
      }

      console.log('Unsubscribed from all real-time subscriptions');
      return { success: true };
    } catch (error) {
      console.error('Error unsubscribing from all:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to unsubscribe from all' 
      };
    }
  }

  /**
   * Get list of active subscription IDs
   * @returns Array of active subscription identifiers
   */
  static getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Check if a subscription is active
   * @param subscriptionId Subscription identifier to check
   * @returns Boolean indicating if subscription is active
   */
  static isSubscribed(subscriptionId: string): boolean {
    return this.subscriptions.has(subscriptionId);
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
      case 'INSERT':
        if (newRecord && options.onVibeCheckInsert) {
          const vibeCheckWithDetails = await this.fetchVibeCheckWithDetails(newRecord.id);
          if (vibeCheckWithDetails) {
            options.onVibeCheckInsert(vibeCheckWithDetails);
          }
        }
        break;

      case 'UPDATE':
        if (newRecord && options.onVibeCheckUpdate) {
          const vibeCheckWithDetails = await this.fetchVibeCheckWithDetails(newRecord.id);
          if (vibeCheckWithDetails) {
            options.onVibeCheckUpdate(vibeCheckWithDetails);
          }
        }
        break;

      case 'DELETE':
        if (oldRecord && options.onVibeCheckDelete) {
          options.onVibeCheckDelete(oldRecord.id);
        }
        break;

      default:
        console.warn('Unknown realtime event type:', eventType);
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
      const { data: vibeCheck, error } = await supabase
        .from('vibe_checks')
        .select(`
          *,
          user:users(id, name, avatar_url),
          venue:venues(id, name, address)
        `)
        .eq('id', vibeCheckId)
        .single();

      if (error || !vibeCheck) {
        console.error('Error fetching vibe check details:', error);
        return null;
      }

      // Use the existing transformation method from VibeCheckService
      return this.transformToVibeCheckWithDetails(vibeCheck);
    } catch (error) {
      console.error('Error fetching vibe check details:', error);
      return null;
    }
  }

  /**
   * Transform raw vibe check data to VibeCheckWithDetails
   * This mirrors the private method in VibeCheckService
   * @param rawData Raw data from database query
   * @returns Transformed VibeCheckWithDetails object
   */
  private static transformToVibeCheckWithDetails(rawData: any): VibeCheckWithDetails {
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