import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { VibeCheckWithDetails } from '../lib/types';
import { OptimizedQueryService } from './OptimizedQueryService';
import { VibeCheckCacheService } from './CacheService';

export interface SubscriptionConfig {
  venueId?: string;
  batchUpdates?: boolean;
  batchDelay?: number;
  maxRetries?: number;
  onVibeCheckInsert?: (vibeCheck: VibeCheckWithDetails) => void;
  onVibeCheckUpdate?: (vibeCheck: VibeCheckWithDetails) => void;
  onVibeCheckDelete?: (vibeCheckId: string) => void;
  onError?: (error: any) => void;
  onConnectionChange?: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
}

interface PendingUpdate {
  type: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

/**
 * Optimized real-time service with connection pooling, batching, and error recovery
 */
export class OptimizedRealtimeService {
  private static subscriptions = new Map<string, {
    channel: RealtimeChannel;
    config: SubscriptionConfig;
    retryCount: number;
    lastActivity: number;
  }>();
  
  private static pendingUpdates = new Map<string, PendingUpdate[]>();
  private static batchTimers = new Map<string, NodeJS.Timeout>();
  private static connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  private static heartbeatInterval: NodeJS.Timeout | null = null;
  
  private static readonly DEFAULT_BATCH_DELAY = 500; // 500ms
  private static readonly MAX_RETRIES = 3;
  private static readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private static readonly SUBSCRIPTION_TIMEOUT = 10000; // 10 seconds

  /**
   * Initialize the optimized real-time service
   */
  static initialize(): void {
    this.startHeartbeat();
    this.setupGlobalErrorHandling();
  }

  /**
   * Create an optimized subscription with connection pooling
   */
  static async subscribe(
    subscriptionId: string,
    config: SubscriptionConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove existing subscription if it exists
      await this.unsubscribe(subscriptionId);

      // Create optimized channel name
      const channelName = this.generateChannelName(config.venueId);
      
      // Check if we can reuse an existing channel
      const existingSubscription = this.findReusableChannel(channelName, config);
      if (existingSubscription) {
        return this.reuseChannel(subscriptionId, existingSubscription, config);
      }

      // Create new channel with optimized configuration
      const channel = supabase.channel(channelName, {
        config: {
          presence: { key: subscriptionId },
          broadcast: { self: false },
        },
      });

      // Configure subscription with proper filtering
      const subscription = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vibe_checks',
          ...(config.venueId && { filter: `venue_id=eq.${config.venueId}` }),
        },
        (payload) => this.handleRealtimeEvent(subscriptionId, payload, config)
      );

      // Subscribe with timeout and retry logic
      const subscribePromise = new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Subscription timeout'));
        }, this.SUBSCRIPTION_TIMEOUT);

        channel.subscribe((status) => {
          clearTimeout(timeout);
          
          if (status === 'SUBSCRIBED') {
            this.connectionStatus = 'connected';
            config.onConnectionChange?.('connected');
            resolve(true);
          } else if (status === 'CHANNEL_ERROR') {
            this.connectionStatus = 'disconnected';
            config.onConnectionChange?.('disconnected');
            reject(new Error('Channel subscription failed'));
          }
        });
      });

      await subscribePromise;

      // Store subscription with metadata
      this.subscriptions.set(subscriptionId, {
        channel,
        config,
        retryCount: 0,
        lastActivity: Date.now(),
      });

      console.log(`Optimized subscription created: ${subscriptionId}`);
      return { success: true };

    } catch (error) {
      console.error('Error creating optimized subscription:', error);
      
      // Attempt retry if configured
      const maxRetries = config.maxRetries || this.MAX_RETRIES;
      const subscription = this.subscriptions.get(subscriptionId);
      
      if (subscription && subscription.retryCount < maxRetries) {
        subscription.retryCount++;
        console.log(`Retrying subscription ${subscriptionId} (${subscription.retryCount}/${maxRetries})`);
        
        // Exponential backoff
        const delay = Math.pow(2, subscription.retryCount) * 1000;
        setTimeout(() => {
          this.subscribe(subscriptionId, config);
        }, delay);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      };
    }
  }

  /**
   * Unsubscribe with proper cleanup
   */
  static async unsubscribe(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        return { success: true };
      }

      // Clear any pending batch updates
      this.clearPendingUpdates(subscriptionId);

      // Remove channel
      await supabase.removeChannel(subscription.channel);
      this.subscriptions.delete(subscriptionId);

      console.log(`Unsubscribed: ${subscriptionId}`);
      return { success: true };

    } catch (error) {
      console.error('Error unsubscribing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
      };
    }
  }

  /**
   * Unsubscribe from all subscriptions with cleanup
   */
  static async unsubscribeAll(): Promise<{ success: boolean; error?: string }> {
    try {
      const subscriptionIds = Array.from(this.subscriptions.keys());
      
      // Clear all batch timers
      for (const timer of this.batchTimers.values()) {
        clearTimeout(timer);
      }
      this.batchTimers.clear();
      this.pendingUpdates.clear();

      // Unsubscribe from all channels
      for (const subscriptionId of subscriptionIds) {
        const result = await this.unsubscribe(subscriptionId);
        if (!result.success) {
          return result;
        }
      }

      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      console.log('All optimized subscriptions cleaned up');
      return { success: true };

    } catch (error) {
      console.error('Error cleaning up all subscriptions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup subscriptions',
      };
    }
  }

  /**
   * Get subscription statistics
   */
  static getSubscriptionStats(): {
    activeSubscriptions: number;
    connectionStatus: string;
    pendingUpdates: number;
    subscriptionDetails: Array<{
      id: string;
      venueId?: string;
      retryCount: number;
      lastActivity: number;
    }>;
  } {
    const subscriptionDetails = Array.from(this.subscriptions.entries()).map(
      ([id, sub]) => ({
        id,
        venueId: sub.config.venueId,
        retryCount: sub.retryCount,
        lastActivity: sub.lastActivity,
      })
    );

    const totalPendingUpdates = Array.from(this.pendingUpdates.values())
      .reduce((sum, updates) => sum + updates.length, 0);

    return {
      activeSubscriptions: this.subscriptions.size,
      connectionStatus: this.connectionStatus,
      pendingUpdates: totalPendingUpdates,
      subscriptionDetails,
    };
  }

  /**
   * Handle real-time events with batching and optimization
   */
  private static async handleRealtimeEvent(
    subscriptionId: string,
    payload: any,
    config: SubscriptionConfig
  ): Promise<void> {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (subscription) {
        subscription.lastActivity = Date.now();
      }

      const { eventType, new: newRecord, old: oldRecord } = payload;

      // Invalidate relevant cache entries
      if (newRecord?.venue_id) {
        await VibeCheckCacheService.invalidateOnVibeCheckCreate(newRecord.venue_id);
      }

      // Handle batching if enabled
      if (config.batchUpdates) {
        this.addToPendingUpdates(subscriptionId, {
          type: eventType.toLowerCase(),
          data: { newRecord, oldRecord },
          timestamp: Date.now(),
        });

        this.scheduleBatchProcessing(subscriptionId, config);
        return;
      }

      // Process immediately if batching is disabled
      await this.processRealtimeEvent(eventType, newRecord, oldRecord, config);

    } catch (error) {
      console.error('Error handling realtime event:', error);
      config.onError?.(error);
    }
  }

  /**
   * Process individual real-time event
   */
  private static async processRealtimeEvent(
    eventType: string,
    newRecord: any,
    oldRecord: any,
    config: SubscriptionConfig
  ): Promise<void> {
    switch (eventType) {
      case 'INSERT':
        if (newRecord && config.onVibeCheckInsert) {
          const vibeCheckWithDetails = await this.fetchVibeCheckWithDetailsOptimized(newRecord.id);
          if (vibeCheckWithDetails) {
            config.onVibeCheckInsert(vibeCheckWithDetails);
          }
        }
        break;

      case 'UPDATE':
        if (newRecord && config.onVibeCheckUpdate) {
          const vibeCheckWithDetails = await this.fetchVibeCheckWithDetailsOptimized(newRecord.id);
          if (vibeCheckWithDetails) {
            config.onVibeCheckUpdate(vibeCheckWithDetails);
          }
        }
        break;

      case 'DELETE':
        if (oldRecord && config.onVibeCheckDelete) {
          config.onVibeCheckDelete(oldRecord.id);
        }
        break;

      default:
        console.warn('Unknown realtime event type:', eventType);
    }
  }

  /**
   * Fetch vibe check details using optimized query
   */
  private static async fetchVibeCheckWithDetailsOptimized(
    vibeCheckId: string
  ): Promise<VibeCheckWithDetails | null> {
    try {
      const { data: vibeCheck, error } = await supabase
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
        .eq('id', vibeCheckId)
        .single();

      if (error || !vibeCheck) {
        console.error('Error fetching vibe check details:', error);
        return null;
      }

      return this.transformToVibeCheckWithDetails(vibeCheck);
    } catch (error) {
      console.error('Error fetching vibe check details:', error);
      return null;
    }
  }

  /**
   * Generate optimized channel name
   */
  private static generateChannelName(venueId?: string): string {
    return venueId ? `vibe-checks-venue-${venueId}` : 'vibe-checks-global';
  }

  /**
   * Find reusable channel for connection pooling
   */
  private static findReusableChannel(
    channelName: string,
    config: SubscriptionConfig
  ): { subscriptionId: string; subscription: any } | null {
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.channel.topic === channelName &&
          subscription.config.venueId === config.venueId) {
        return { subscriptionId: id, subscription };
      }
    }
    return null;
  }

  /**
   * Reuse existing channel for connection pooling
   */
  private static reuseChannel(
    subscriptionId: string,
    existingSubscription: { subscriptionId: string; subscription: any },
    config: SubscriptionConfig
  ): { success: boolean; error?: string } {
    // Clone the existing subscription with new config
    this.subscriptions.set(subscriptionId, {
      channel: existingSubscription.subscription.channel,
      config,
      retryCount: 0,
      lastActivity: Date.now(),
    });

    console.log(`Reused channel for subscription: ${subscriptionId}`);
    return { success: true };
  }

  /**
   * Add event to pending updates for batching
   */
  private static addToPendingUpdates(subscriptionId: string, update: PendingUpdate): void {
    if (!this.pendingUpdates.has(subscriptionId)) {
      this.pendingUpdates.set(subscriptionId, []);
    }
    this.pendingUpdates.get(subscriptionId)!.push(update);
  }

  /**
   * Schedule batch processing
   */
  private static scheduleBatchProcessing(subscriptionId: string, config: SubscriptionConfig): void {
    // Clear existing timer
    const existingTimer = this.batchTimers.get(subscriptionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new batch processing
    const delay = config.batchDelay || this.DEFAULT_BATCH_DELAY;
    const timer = setTimeout(() => {
      this.processBatchUpdates(subscriptionId, config);
    }, delay);

    this.batchTimers.set(subscriptionId, timer);
  }

  /**
   * Process batched updates
   */
  private static async processBatchUpdates(subscriptionId: string, config: SubscriptionConfig): Promise<void> {
    const updates = this.pendingUpdates.get(subscriptionId);
    if (!updates || updates.length === 0) {
      return;
    }

    try {
      // Group updates by type and process
      const groupedUpdates = updates.reduce((groups, update) => {
        if (!groups[update.type]) {
          groups[update.type] = [];
        }
        groups[update.type].push(update);
        return groups;
      }, {} as Record<string, PendingUpdate[]>);

      // Process each type of update
      for (const [type, typeUpdates] of Object.entries(groupedUpdates)) {
        for (const update of typeUpdates) {
          await this.processRealtimeEvent(
            type.toUpperCase(),
            update.data.newRecord,
            update.data.oldRecord,
            config
          );
        }
      }

      // Clear processed updates
      this.pendingUpdates.delete(subscriptionId);
      this.batchTimers.delete(subscriptionId);

    } catch (error) {
      console.error('Error processing batch updates:', error);
      config.onError?.(error);
    }
  }

  /**
   * Clear pending updates for a subscription
   */
  private static clearPendingUpdates(subscriptionId: string): void {
    const timer = this.batchTimers.get(subscriptionId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(subscriptionId);
    }
    this.pendingUpdates.delete(subscriptionId);
  }

  /**
   * Start heartbeat to monitor connection health
   */
  private static startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Check connection health and reconnect if needed
   */
  private static checkConnectionHealth(): void {
    const now = Date.now();
    const staleThreshold = this.HEARTBEAT_INTERVAL * 2;

    for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
      if (now - subscription.lastActivity > staleThreshold) {
        console.warn(`Stale subscription detected: ${subscriptionId}`);
        this.reconnectSubscription(subscriptionId);
      }
    }
  }

  /**
   * Reconnect a stale subscription
   */
  private static async reconnectSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    console.log(`Reconnecting subscription: ${subscriptionId}`);
    this.connectionStatus = 'reconnecting';
    subscription.config.onConnectionChange?.('reconnecting');

    try {
      await this.unsubscribe(subscriptionId);
      await this.subscribe(subscriptionId, subscription.config);
    } catch (error) {
      console.error(`Failed to reconnect subscription ${subscriptionId}:`, error);
      subscription.config.onError?.(error);
    }
  }

  /**
   * Setup global error handling
   */
  private static setupGlobalErrorHandling(): void {
    // Handle Supabase connection errors
    supabase.realtime.onOpen(() => {
      this.connectionStatus = 'connected';
      console.log('Supabase realtime connection opened');
    });

    supabase.realtime.onClose(() => {
      this.connectionStatus = 'disconnected';
      console.log('Supabase realtime connection closed');
    });

    supabase.realtime.onError((error) => {
      this.connectionStatus = 'disconnected';
      console.error('Supabase realtime error:', error);
    });
  }

  /**
   * Transform raw data to VibeCheckWithDetails (optimized)
   */
  private static transformToVibeCheckWithDetails(rawData: any): VibeCheckWithDetails {
    const createdAt = new Date(rawData.created_at);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60000);
    const twoHoursAgo = new Date(now.getTime() - 7200000);

    // Optimized time ago calculation
    let timeAgo: string;
    if (diffInMinutes < 1) {
      timeAgo = "Just now";
    } else if (diffInMinutes < 60) {
      timeAgo = `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      timeAgo = `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      timeAgo = `${Math.floor(diffInMinutes / 1440)}d ago`;
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