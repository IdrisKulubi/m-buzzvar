import AsyncStorage from '@react-native-async-storage/async-storage';
import { VibeCheckWithDetails } from '../lib/types';
import { PerformanceMonitoringService } from './PerformanceMonitoringService';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export class CacheService {
  private static memoryCache = new Map<string, CacheEntry<any>>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_MEMORY_CACHE_SIZE = 100;
  private static readonly STORAGE_PREFIX = 'buzzvar_cache_';

  /**
   * Get data from cache (memory first, then AsyncStorage)
   * @param key Cache key
   * @returns Cached data or null if not found/expired
   */
  static async get<T>(key: string): Promise<T | null> {
    const timer = PerformanceMonitoringService.startTimer('cache_get', { key });
    
    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
        PerformanceMonitoringService.recordCacheHit('memory');
        timer();
        return memoryEntry.data;
      }

      // Check AsyncStorage
      try {
        const storageKey = this.STORAGE_PREFIX + key;
        const storedData = await AsyncStorage.getItem(storageKey);
        
        if (storedData) {
          const entry: CacheEntry<T> = JSON.parse(storedData);
          
          if (entry.expiresAt > Date.now()) {
            // Move to memory cache for faster access
            this.memoryCache.set(key, entry);
            this.cleanupMemoryCache();
            PerformanceMonitoringService.recordCacheHit('storage');
            timer();
            return entry.data;
          } else {
            // Remove expired entry
            await AsyncStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.warn('Error reading from cache:', error);
      }

      PerformanceMonitoringService.recordCacheMiss('cache_get');
      timer();
      return null;
    } catch (error) {
      timer();
      throw error;
    }
  }

  /**
   * Set data in cache (both memory and AsyncStorage)
   * @param key Cache key
   * @param data Data to cache
   * @param options Cache options
   */
  static async set<T>(
    key: string, 
    data: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    const ttl = options.ttl || this.DEFAULT_TTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    // Set in memory cache
    this.memoryCache.set(key, entry);
    this.cleanupMemoryCache();

    // Set in AsyncStorage for persistence
    try {
      const storageKey = this.STORAGE_PREFIX + key;
      await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      console.warn('Error writing to cache:', error);
    }
  }

  /**
   * Remove data from cache
   * @param key Cache key
   */
  static async remove(key: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(key);

    // Remove from AsyncStorage
    try {
      const storageKey = this.STORAGE_PREFIX + key;
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Error removing from cache:', error);
    }
  }

  /**
   * Clear all cache data
   */
  static async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear AsyncStorage cache entries
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    memorySize: number;
    memoryKeys: string[];
  } {
    return {
      memorySize: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys()),
    };
  }

  /**
   * Clean up expired entries from memory cache and enforce size limit
   */
  private static cleanupMemoryCache(): void {
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }

    // Enforce size limit by removing oldest entries
    if (this.memoryCache.size > this.MAX_MEMORY_CACHE_SIZE) {
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const entriesToRemove = entries.slice(0, this.memoryCache.size - this.MAX_MEMORY_CACHE_SIZE);
      for (const [key] of entriesToRemove) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Generate cache key for vibe checks by venue
   */
  static getVenueVibeChecksCacheKey(venueId: string, hoursBack: number): string {
    return `venue_vibe_checks_${venueId}_${hoursBack}h`;
  }

  /**
   * Generate cache key for live vibe checks
   */
  static getLiveVibeChecksCacheKey(hoursBack: number, limit: number): string {
    return `live_vibe_checks_${hoursBack}h_${limit}`;
  }

  /**
   * Generate cache key for venue vibe stats
   */
  static getVenueVibeStatsCacheKey(venueId: string, hoursBack: number): string {
    return `venue_vibe_stats_${venueId}_${hoursBack}h`;
  }

  /**
   * Generate cache key for user rate limit check
   */
  static getUserRateLimitCacheKey(userId: string, venueId: string): string {
    return `user_rate_limit_${userId}_${venueId}`;
  }

  /**
   * Invalidate cache entries related to a venue
   */
  static async invalidateVenueCache(venueId: string): Promise<void> {
    const keysToRemove: string[] = [];
    
    // Find all cache keys related to this venue
    for (const key of this.memoryCache.keys()) {
      if (key.includes(venueId)) {
        keysToRemove.push(key);
      }
    }

    // Remove from memory cache
    for (const key of keysToRemove) {
      this.memoryCache.delete(key);
    }

    // Remove from AsyncStorage
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.startsWith(this.STORAGE_PREFIX) && key.includes(venueId)
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Error invalidating venue cache:', error);
    }
  }

  /**
   * Invalidate all live feed cache entries
   */
  static async invalidateLiveFeedCache(): Promise<void> {
    const keysToRemove: string[] = [];
    
    // Find all live feed cache keys
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith('live_vibe_checks_')) {
        keysToRemove.push(key);
      }
    }

    // Remove from memory cache
    for (const key of keysToRemove) {
      this.memoryCache.delete(key);
    }

    // Remove from AsyncStorage
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.startsWith(this.STORAGE_PREFIX + 'live_vibe_checks_')
      );
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Error invalidating live feed cache:', error);
    }
  }
}

/**
 * Specialized cache service for vibe check data
 */
export class VibeCheckCacheService extends CacheService {
  private static readonly VIBE_CHECK_TTL = 2 * 60 * 1000; // 2 minutes for vibe checks
  private static readonly STATS_TTL = 5 * 60 * 1000; // 5 minutes for stats

  /**
   * Cache vibe checks for a venue
   */
  static async cacheVenueVibeChecks(
    venueId: string,
    hoursBack: number,
    vibeChecks: VibeCheckWithDetails[]
  ): Promise<void> {
    const key = this.getVenueVibeChecksCacheKey(venueId, hoursBack);
    await this.set(key, vibeChecks, { ttl: this.VIBE_CHECK_TTL });
  }

  /**
   * Get cached vibe checks for a venue
   */
  static async getCachedVenueVibeChecks(
    venueId: string,
    hoursBack: number
  ): Promise<VibeCheckWithDetails[] | null> {
    const key = this.getVenueVibeChecksCacheKey(venueId, hoursBack);
    return await this.get<VibeCheckWithDetails[]>(key);
  }

  /**
   * Cache live vibe checks
   */
  static async cacheLiveVibeChecks(
    hoursBack: number,
    limit: number,
    vibeChecks: VibeCheckWithDetails[]
  ): Promise<void> {
    const key = this.getLiveVibeChecksCacheKey(hoursBack, limit);
    await this.set(key, vibeChecks, { ttl: this.VIBE_CHECK_TTL });
  }

  /**
   * Get cached live vibe checks
   */
  static async getCachedLiveVibeChecks(
    hoursBack: number,
    limit: number
  ): Promise<VibeCheckWithDetails[] | null> {
    const key = this.getLiveVibeChecksCacheKey(hoursBack, limit);
    return await this.get<VibeCheckWithDetails[]>(key);
  }

  /**
   * Cache venue vibe stats
   */
  static async cacheVenueVibeStats(
    venueId: string,
    hoursBack: number,
    stats: any
  ): Promise<void> {
    const key = this.getVenueVibeStatsCacheKey(venueId, hoursBack);
    await this.set(key, stats, { ttl: this.STATS_TTL });
  }

  /**
   * Get cached venue vibe stats
   */
  static async getCachedVenueVibeStats(
    venueId: string,
    hoursBack: number
  ): Promise<any | null> {
    const key = this.getVenueVibeStatsCacheKey(venueId, hoursBack);
    return await this.get(key);
  }

  /**
   * Cache user rate limit status
   */
  static async cacheUserRateLimit(
    userId: string,
    venueId: string,
    rateLimitData: any
  ): Promise<void> {
    const key = this.getUserRateLimitCacheKey(userId, venueId);
    // Short TTL for rate limit data to ensure accuracy
    await this.set(key, rateLimitData, { ttl: 30 * 1000 }); // 30 seconds
  }

  /**
   * Get cached user rate limit status
   */
  static async getCachedUserRateLimit(
    userId: string,
    venueId: string
  ): Promise<any | null> {
    const key = this.getUserRateLimitCacheKey(userId, venueId);
    return await this.get(key);
  }

  /**
   * Invalidate cache when new vibe check is created
   */
  static async invalidateOnVibeCheckCreate(venueId: string): Promise<void> {
    // Invalidate venue-specific cache
    await this.invalidateVenueCache(venueId);
    
    // Invalidate live feed cache
    await this.invalidateLiveFeedCache();
  }
}