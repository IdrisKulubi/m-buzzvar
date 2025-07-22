import { VibeCheckWithDetails } from "../lib/types";
import { mobileDb } from "../lib/database/mobile-database-service";
import { standaloneAuth } from "../../lib/auth/standalone-auth";

export interface SubscriptionConfig {
  venueId?: string;
  batchUpdates?: boolean;
  batchDelay?: number;
  maxRetries?: number;
  pollInterval?: number;
  onVibeCheckInsert?: (vibeCheck: VibeCheckWithDetails) => void;
  onVibeCheckUpdate?: (vibeCheck: VibeCheckWithDetails) => void;
  onVibeCheckDelete?: (vibeCheckId: string) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (
    status: "connected" | "disconnected" | "reconnecting"
  ) => void;
}

interface PendingUpdate {
  type: "insert" | "update" | "delete";
  data: VibeCheckWithDetails | string;
  timestamp: number;
}

interface PollingSubscription {
  config: SubscriptionConfig;
  retryCount: number;
  lastActivity: number;
  lastPollTimestamp: string;
  pollTimer?: ReturnType<typeof setInterval>;
}

/**
 * Optimized real-time service with polling-based updates, batching, and error recovery
 * Uses standalone database instead of Supabase real-time subscriptions
 */
export class OptimizedRealtimeService {
  private static subscriptions = new Map<string, PollingSubscription>();
  private static pendingUpdates = new Map<string, PendingUpdate[]>();
  private static batchTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private static connectionStatus:
    | "connected"
    | "disconnected"
    | "reconnecting" = "disconnected";
  private static healthCheckInterval: ReturnType<typeof setInterval> | null =
    null;

  private static readonly DEFAULT_BATCH_DELAY = 500; // 500ms
  private static readonly DEFAULT_POLL_INTERVAL = 5000; // 5 seconds
  private static readonly MAX_RETRIES = 3;
  private static readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  /**
   * Initialize the optimized real-time service
   */
  static initialize(): void {
    this.startHealthCheck();
    this.connectionStatus = "connected";
  }

  /**
   * Create an optimized subscription with polling-based updates
   */
  static async subscribe(
    subscriptionId: string,
    config: SubscriptionConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Remove existing subscription if it exists
      await this.unsubscribe(subscriptionId);

      // Verify user is authenticated
      const currentUser = standaloneAuth.getUser();
      if (!currentUser) {
        throw new Error("User must be authenticated to subscribe to updates");
      }

      // Create polling subscription
      const subscription: PollingSubscription = {
        config,
        retryCount: 0,
        lastActivity: Date.now(),
        lastPollTimestamp: new Date().toISOString(),
      };

      // Start polling
      this.startPolling(subscriptionId, subscription);

      // Store subscription
      this.subscriptions.set(subscriptionId, subscription);

      // Notify connection established
      this.connectionStatus = "connected";
      config.onConnectionChange?.("connected");

      console.log(`Optimized polling subscription created: ${subscriptionId}`);
      return { success: true };
    } catch (error) {
      console.error("Error creating optimized subscription:", error);

      // Attempt retry if configured
      const maxRetries = config.maxRetries || this.MAX_RETRIES;
      const subscription = this.subscriptions.get(subscriptionId);

      if (subscription && subscription.retryCount < maxRetries) {
        subscription.retryCount++;
        console.log(
          `Retrying subscription ${subscriptionId} (${subscription.retryCount}/${maxRetries})`
        );

        // Exponential backoff
        const delay = Math.pow(2, subscription.retryCount) * 1000;
        setTimeout(() => {
          this.subscribe(subscriptionId, config);
        }, delay);
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create subscription",
      };
    }
  }

  /**
   * Unsubscribe with proper cleanup
   */
  static async unsubscribe(
    subscriptionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      if (!subscription) {
        return { success: true };
      }

      // Clear any pending batch updates
      this.clearPendingUpdates(subscriptionId);

      // Stop polling timer
      if (subscription.pollTimer) {
        clearInterval(subscription.pollTimer);
      }

      // Remove subscription
      this.subscriptions.delete(subscriptionId);

      console.log(`Unsubscribed: ${subscriptionId}`);
      return { success: true };
    } catch (error) {
      console.error("Error unsubscribing:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to unsubscribe",
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

      // Unsubscribe from all subscriptions
      for (const subscriptionId of subscriptionIds) {
        const result = await this.unsubscribe(subscriptionId);
        if (!result.success) {
          return result;
        }
      }

      // Stop health check
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      console.log("All optimized subscriptions cleaned up");
      return { success: true };
    } catch (error) {
      console.error("Error cleaning up all subscriptions:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to cleanup subscriptions",
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
    subscriptionDetails: {
      id: string;
      venueId?: string;
      retryCount: number;
      lastActivity: number;
      pollInterval: number;
    }[];
  } {
    const subscriptionDetails = Array.from(this.subscriptions.entries()).map(
      ([id, sub]) => ({
        id,
        venueId: sub.config.venueId,
        retryCount: sub.retryCount,
        lastActivity: sub.lastActivity,
        pollInterval: sub.config.pollInterval || this.DEFAULT_POLL_INTERVAL,
      })
    );

    const totalPendingUpdates = Array.from(this.pendingUpdates.values()).reduce(
      (sum, updates) => sum + updates.length,
      0
    );

    return {
      activeSubscriptions: this.subscriptions.size,
      connectionStatus: this.connectionStatus,
      pendingUpdates: totalPendingUpdates,
      subscriptionDetails,
    };
  }

  /**
   * Start polling for a subscription
   */
  private static startPolling(
    subscriptionId: string,
    subscription: PollingSubscription
  ): void {
    const pollInterval =
      subscription.config.pollInterval || this.DEFAULT_POLL_INTERVAL;

    subscription.pollTimer = setInterval(async () => {
      try {
        await this.pollForUpdates(subscriptionId, subscription);
      } catch (error) {
        console.error(
          `Polling error for subscription ${subscriptionId}:`,
          error
        );
        subscription.config.onError?.(error as Error);
      }
    }, pollInterval);
  }

  /**
   * Poll for updates from the database
   */
  private static async pollForUpdates(
    subscriptionId: string,
    subscription: PollingSubscription
  ): Promise<void> {
    try {
      subscription.lastActivity = Date.now();

      // Query for new vibe checks since last poll
      const sql = `
        SELECT vc.*, 
               u.name as user_name, 
               u.avatar_url as user_avatar,
               v.name as venue_name,
               v.address as venue_address
        FROM vibe_checks vc
        JOIN users u ON vc.user_id = u.id
        JOIN venues v ON vc.venue_id = v.id
        WHERE vc.created_at > $1
        ${subscription.config.venueId ? "AND vc.venue_id = $2" : ""}
        ORDER BY vc.created_at ASC
      `;

      const params = [subscription.lastPollTimestamp];
      if (subscription.config.venueId) {
        params.push(subscription.config.venueId);
      }

      const result = await mobileDb.query(sql, params);

      if (result.data && result.data.length > 0) {
        // Update last poll timestamp to the latest record
        const latestRecord = result.data[result.data.length - 1];
        subscription.lastPollTimestamp = latestRecord.created_at;

        // Process each new vibe check
        for (const record of result.data) {
          const vibeCheckWithDetails =
            this.transformToVibeCheckWithDetails(record);

          // Handle batching if enabled
          if (subscription.config.batchUpdates) {
            this.addToPendingUpdates(subscriptionId, {
              type: "insert",
              data: vibeCheckWithDetails,
              timestamp: Date.now(),
            });
            this.scheduleBatchProcessing(subscriptionId, subscription.config);
          } else {
            // Process immediately
            subscription.config.onVibeCheckInsert?.(vibeCheckWithDetails);
          }
        }
      }
    } catch (error) {
      console.error("Error polling for updates:", error);
      subscription.config.onError?.(error as Error);
    }
  }

  /**
   * Process individual update event
   */
  private static async processUpdateEvent(
    eventType: string,
    data: VibeCheckWithDetails | string,
    config: SubscriptionConfig
  ): Promise<void> {
    switch (eventType) {
      case "insert":
        if (data && typeof data === "object" && config.onVibeCheckInsert) {
          config.onVibeCheckInsert(data);
        }
        break;

      case "update":
        if (data && typeof data === "object" && config.onVibeCheckUpdate) {
          config.onVibeCheckUpdate(data);
        }
        break;

      case "delete":
        if (data && typeof data === "string" && config.onVibeCheckDelete) {
          config.onVibeCheckDelete(data);
        }
        break;

      default:
        console.warn("Unknown update event type:", eventType);
    }
  }

  /**
   * Fetch vibe check details using optimized query
   */
  private static async fetchVibeCheckWithDetailsOptimized(
    vibeCheckId: string
  ): Promise<VibeCheckWithDetails | null> {
    try {
      const sql = `
        SELECT vc.*, 
               u.name as user_name, 
               u.avatar_url as user_avatar,
               v.name as venue_name,
               v.address as venue_address
        FROM vibe_checks vc
        JOIN users u ON vc.user_id = u.id
        JOIN venues v ON vc.venue_id = v.id
        WHERE vc.id = $1
      `;

      const result = await mobileDb.query(sql, [vibeCheckId]);

      if (!result.data || result.data.length === 0) {
        console.error("Vibe check not found:", vibeCheckId);
        return null;
      }

      return this.transformToVibeCheckWithDetails(result.data[0]);
    } catch (error) {
      console.error("Error fetching vibe check details:", error);
      return null;
    }
  }

  /**
   * Add event to pending updates for batching
   */
  private static addToPendingUpdates(
    subscriptionId: string,
    update: PendingUpdate
  ): void {
    if (!this.pendingUpdates.has(subscriptionId)) {
      this.pendingUpdates.set(subscriptionId, []);
    }
    this.pendingUpdates.get(subscriptionId)!.push(update);
  }

  /**
   * Schedule batch processing
   */
  private static scheduleBatchProcessing(
    subscriptionId: string,
    config: SubscriptionConfig
  ): void {
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
   * Process batched updates
   */
  private static async processBatchUpdates(
    subscriptionId: string,
    config: SubscriptionConfig
  ): Promise<void> {
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
          await this.processUpdateEvent(type, update.data, config);
        }
      }

      // Clear processed updates
      this.pendingUpdates.delete(subscriptionId);
      this.batchTimers.delete(subscriptionId);
    } catch (error) {
      console.error("Error processing batch updates:", error);
      config.onError?.(error as Error);
    }
  }

  /**
   * Start health check to monitor connection and database health
   */
  private static startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.checkConnectionHealth();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Check connection health and reconnect if needed
   */
  private static async checkConnectionHealth(): Promise<void> {
    try {
      // Check database health
      const health = await mobileDb.checkHealth();

      if (health.status !== "healthy") {
        console.warn("Database health check failed:", health.error);
        this.connectionStatus = "disconnected";

        // Notify all subscriptions of connection issues
        for (const [, subscription] of this.subscriptions.entries()) {
          subscription.config.onConnectionChange?.("disconnected");
        }
        return;
      }

      // Check for stale subscriptions
      const now = Date.now();
      const staleThreshold = this.HEALTH_CHECK_INTERVAL * 2;

      for (const [
        subscriptionId,
        subscription,
      ] of this.subscriptions.entries()) {
        if (now - subscription.lastActivity > staleThreshold) {
          console.warn(`Stale subscription detected: ${subscriptionId}`);
          await this.reconnectSubscription(subscriptionId);
        }
      }

      // Update connection status if healthy
      if (this.connectionStatus !== "connected") {
        this.connectionStatus = "connected";
        for (const [, subscription] of this.subscriptions.entries()) {
          subscription.config.onConnectionChange?.("connected");
        }
      }
    } catch (error) {
      console.error("Health check failed:", error);
      this.connectionStatus = "disconnected";
    }
  }

  /**
   * Reconnect a stale subscription
   */
  private static async reconnectSubscription(
    subscriptionId: string
  ): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    console.log(`Reconnecting subscription: ${subscriptionId}`);
    this.connectionStatus = "reconnecting";
    subscription.config.onConnectionChange?.("reconnecting");

    try {
      // Stop current polling
      if (subscription.pollTimer) {
        clearInterval(subscription.pollTimer);
      }

      // Restart polling with fresh timestamp
      subscription.lastPollTimestamp = new Date().toISOString();
      subscription.lastActivity = Date.now();
      this.startPolling(subscriptionId, subscription);

      this.connectionStatus = "connected";
      subscription.config.onConnectionChange?.("connected");
    } catch (error) {
      console.error(
        `Failed to reconnect subscription ${subscriptionId}:`,
        error
      );
      subscription.config.onError?.(error as Error);
    }
  }

  /**
   * Transform raw data to VibeCheckWithDetails (optimized)
   */
  private static transformToVibeCheckWithDetails(
    rawData: any
  ): VibeCheckWithDetails {
    const createdAt = new Date(rawData.created_at);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - createdAt.getTime()) / 60000
    );
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
      rating: rawData.rating,
      comment: rawData.comment,
      photo_url: rawData.photo_url,
      created_at: rawData.created_at,
      updated_at: rawData.updated_at,
      user: {
        id: rawData.user_id,
        name: rawData.user_name || "Anonymous",
        avatar_url: rawData.user_avatar,
      },
      venue: {
        id: rawData.venue_id,
        name: rawData.venue_name || "Unknown Venue",
        address: rawData.venue_address,
      },
      time_ago: timeAgo,
      is_recent: createdAt > twoHoursAgo,
    };
  }
}
