import { CacheService, VibeCheckCacheService } from '../CacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VibeCheckWithDetails } from '../../lib/types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear memory cache
    (CacheService as any).memoryCache.clear();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get data from memory cache', async () => {
      const testData = { id: '1', name: 'Test' };
      
      await CacheService.set('test-key', testData);
      const result = await CacheService.get('test-key');
      
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await CacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle cache expiration', async () => {
      const testData = { id: '1', name: 'Test' };
      
      // Set with very short TTL
      await CacheService.set('test-key', testData, { ttl: 1 });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await CacheService.get('test-key');
      expect(result).toBeNull();
    });

    it('should remove data from cache', async () => {
      const testData = { id: '1', name: 'Test' };
      
      await CacheService.set('test-key', testData);
      await CacheService.remove('test-key');
      
      const result = await CacheService.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('Memory Cache Management', () => {
    it('should enforce memory cache size limit', async () => {
      const maxSize = (CacheService as any).MAX_MEMORY_CACHE_SIZE;
      
      // Fill cache beyond limit
      for (let i = 0; i < maxSize + 10; i++) {
        await CacheService.set(`key-${i}`, { data: i });
      }
      
      const stats = CacheService.getCacheStats();
      expect(stats.memorySize).toBeLessThanOrEqual(maxSize);
    });

    it('should clean up expired entries', async () => {
      // Add expired entries
      for (let i = 0; i < 5; i++) {
        await CacheService.set(`expired-${i}`, { data: i }, { ttl: 1 });
      }
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Add new entry to trigger cleanup
      await CacheService.set('new-key', { data: 'new' });
      
      const stats = CacheService.getCacheStats();
      expect(stats.memoryKeys.filter(key => key.startsWith('expired-'))).toHaveLength(0);
    });
  });

  describe('AsyncStorage Integration', () => {
    it('should fallback to AsyncStorage when memory cache misses', async () => {
      const testData = { id: '1', name: 'Test' };
      const cacheEntry = {
        data: testData,
        timestamp: Date.now(),
        expiresAt: Date.now() + 60000,
      };
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cacheEntry));
      
      const result = await CacheService.get('test-key');
      
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('buzzvar_cache_test-key');
      expect(result).toEqual(testData);
    });

    it('should save to AsyncStorage when setting cache', async () => {
      const testData = { id: '1', name: 'Test' };
      
      await CacheService.set('test-key', testData);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'buzzvar_cache_test-key',
        expect.stringContaining('"data":{"id":"1","name":"Test"}')
      );
    });
  });
});

describe('VibeCheckCacheService', () => {
  const mockVibeCheck: VibeCheckWithDetails = {
    id: '1',
    venue_id: 'venue-1',
    user_id: 'user-1',
    busyness_rating: 3,
    comment: 'Test comment',
    photo_url: null,
    user_latitude: 40.7128,
    user_longitude: -74.0060,
    created_at: new Date().toISOString(),
    user: {
      id: 'user-1',
      name: 'Test User',
      avatar_url: null,
    },
    venue: {
      id: 'venue-1',
      name: 'Test Venue',
      address: '123 Test St',
    },
    time_ago: 'Just now',
    is_recent: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (CacheService as any).memoryCache.clear();
  });

  describe('Venue Vibe Checks Caching', () => {
    it('should cache and retrieve venue vibe checks', async () => {
      const vibeChecks = [mockVibeCheck];
      
      await VibeCheckCacheService.cacheVenueVibeChecks('venue-1', 4, vibeChecks);
      const result = await VibeCheckCacheService.getCachedVenueVibeChecks('venue-1', 4);
      
      expect(result).toEqual(vibeChecks);
    });

    it('should generate correct cache keys for venue vibe checks', () => {
      const key = CacheService.getVenueVibeChecksCacheKey('venue-1', 4);
      expect(key).toBe('venue_vibe_checks_venue-1_4h');
    });
  });

  describe('Live Vibe Checks Caching', () => {
    it('should cache and retrieve live vibe checks', async () => {
      const vibeChecks = [mockVibeCheck];
      
      await VibeCheckCacheService.cacheLiveVibeChecks(4, 50, vibeChecks);
      const result = await VibeCheckCacheService.getCachedLiveVibeChecks(4, 50);
      
      expect(result).toEqual(vibeChecks);
    });

    it('should generate correct cache keys for live vibe checks', () => {
      const key = CacheService.getLiveVibeChecksCacheKey(4, 50);
      expect(key).toBe('live_vibe_checks_4h_50');
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate venue-specific cache', async () => {
      const vibeChecks = [mockVibeCheck];
      
      // Cache some data
      await VibeCheckCacheService.cacheVenueVibeChecks('venue-1', 4, vibeChecks);
      await VibeCheckCacheService.cacheVenueVibeStats('venue-1', 4, { recent_count: 1 });
      
      // Invalidate venue cache
      await VibeCheckCacheService.invalidateVenueCache('venue-1');
      
      // Check that cache is cleared
      const venueVibeChecks = await VibeCheckCacheService.getCachedVenueVibeChecks('venue-1', 4);
      const venueStats = await VibeCheckCacheService.getCachedVenueVibeStats('venue-1', 4);
      
      expect(venueVibeChecks).toBeNull();
      expect(venueStats).toBeNull();
    });

    it('should invalidate live feed cache', async () => {
      const vibeChecks = [mockVibeCheck];
      
      // Cache live feed data
      await VibeCheckCacheService.cacheLiveVibeChecks(4, 50, vibeChecks);
      
      // Invalidate live feed cache
      await VibeCheckCacheService.invalidateLiveFeedCache();
      
      // Check that cache is cleared
      const liveVibeChecks = await VibeCheckCacheService.getCachedLiveVibeChecks(4, 50);
      expect(liveVibeChecks).toBeNull();
    });

    it('should invalidate cache on vibe check create', async () => {
      const vibeChecks = [mockVibeCheck];
      
      // Cache data for venue
      await VibeCheckCacheService.cacheVenueVibeChecks('venue-1', 4, vibeChecks);
      await VibeCheckCacheService.cacheLiveVibeChecks(4, 50, vibeChecks);
      
      // Simulate vibe check creation
      await VibeCheckCacheService.invalidateOnVibeCheckCreate('venue-1');
      
      // Check that both venue and live feed caches are cleared
      const venueVibeChecks = await VibeCheckCacheService.getCachedVenueVibeChecks('venue-1', 4);
      const liveVibeChecks = await VibeCheckCacheService.getCachedLiveVibeChecks(4, 50);
      
      expect(venueVibeChecks).toBeNull();
      expect(liveVibeChecks).toBeNull();
    });
  });

  describe('Rate Limit Caching', () => {
    it('should cache and retrieve rate limit data', async () => {
      const rateLimitData = {
        canPost: false,
        timeUntilReset: 3600000,
        lastVibeCheck: new Date(),
      };
      
      await VibeCheckCacheService.cacheUserRateLimit('user-1', 'venue-1', rateLimitData);
      const result = await VibeCheckCacheService.getCachedUserRateLimit('user-1', 'venue-1');
      
      expect(result).toEqual(rateLimitData);
    });

    it('should use short TTL for rate limit data', async () => {
      const rateLimitData = { canPost: true };
      
      await VibeCheckCacheService.cacheUserRateLimit('user-1', 'venue-1', rateLimitData);
      
      // Wait longer than rate limit TTL (30 seconds)
      jest.advanceTimersByTime(31000);
      
      const result = await VibeCheckCacheService.getCachedUserRateLimit('user-1', 'venue-1');
      expect(result).toBeNull();
    });
  });
});