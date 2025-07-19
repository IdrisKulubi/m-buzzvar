import { OptimizedQueryService } from '../OptimizedQueryService';
import { supabase } from '../../lib/supabase';
import { VibeCheckWithDetails } from '../../lib/types';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('OptimizedQueryService', () => {
  const mockSupabaseQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
  };

  const mockVibeCheckData = {
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.from as jest.Mock).mockReturnValue(mockSupabaseQuery);
  });

  describe('getVenueVibeChecksOptimized', () => {
    it('should fetch venue vibe checks with proper query optimization', async () => {
      mockSupabaseQuery.select.mockResolvedValue({
        data: [mockVibeCheckData],
        error: null,
      });

      const result = await OptimizedQueryService.getVenueVibeChecksOptimized('venue-1', 4);

      expect(supabase.from).toHaveBeenCalledWith('vibe_checks');
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith(expect.stringContaining('user:users!inner'));
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('venue_id', 'venue-1');
      expect(mockSupabaseQuery.gte).toHaveBeenCalledWith('created_at', expect.any(String));
      expect(mockSupabaseQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      
      expect(result.data).toHaveLength(1);
      expect(result.error).toBeNull();
    });

    it('should apply limit and offset for pagination', async () => {
      mockSupabaseQuery.select.mockResolvedValue({
        data: [mockVibeCheckData],
        error: null,
      });

      await OptimizedQueryService.getVenueVibeChecksOptimized('venue-1', 4, {
        limit: 20,
        offset: 10,
      });

      expect(mockSupabaseQuery.range).toHaveBeenCalledWith(10, 29);
    });

    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database error');
      mockSupabaseQuery.select.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const result = await OptimizedQueryService.getVenueVibeChecksOptimized('venue-1', 4);

      expect(result.data).toEqual([]);
      expect(result.error).toBe(mockError);
    });
  });

  describe('getLiveVibeChecksOptimized', () => {
    it('should fetch live vibe checks with pagination support', async () => {
      const mockData = Array(51).fill(mockVibeCheckData); // One more than limit to test hasMore
      mockSupabaseQuery.select.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await OptimizedQueryService.getLiveVibeChecksOptimized(4, { limit: 50 });

      expect(supabase.from).toHaveBeenCalledWith('vibe_checks');
      expect(mockSupabaseQuery.gte).toHaveBeenCalledWith('created_at', expect.any(String));
      expect(mockSupabaseQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockSupabaseQuery.range).toHaveBeenCalledWith(0, 50);
      
      expect(result.data).toHaveLength(50); // Should remove extra item
      expect(result.hasMore).toBe(true);
    });

    it('should indicate no more data when result is smaller than limit', async () => {
      mockSupabaseQuery.select.mockResolvedValue({
        data: [mockVibeCheckData],
        error: null,
      });

      const result = await OptimizedQueryService.getLiveVibeChecksOptimized(4, { limit: 50 });

      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getVenueVibeStatsOptimized', () => {
    it('should calculate venue statistics from vibe checks', async () => {
      const mockVibeChecks = [
        { ...mockVibeCheckData, busyness_rating: 3, created_at: new Date().toISOString() },
        { ...mockVibeCheckData, busyness_rating: 4, created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
        { ...mockVibeCheckData, busyness_rating: 2, created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
      ];

      mockSupabaseQuery.select.mockResolvedValue({
        data: mockVibeChecks,
        error: null,
      });

      const result = await OptimizedQueryService.getVenueVibeStatsOptimized('venue-1', 4);

      expect(result.data).toEqual({
        recent_count: 3,
        average_busyness: 3, // (3 + 4 + 2) / 3
        has_live_activity: true, // Recent vibe check within 2 hours
        latest_vibe_check: expect.any(Object),
      });
      expect(result.error).toBeNull();
    });

    it('should handle empty results', async () => {
      mockSupabaseQuery.select.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await OptimizedQueryService.getVenueVibeStatsOptimized('venue-1', 4);

      expect(result.data).toEqual({
        recent_count: 0,
        average_busyness: null,
        has_live_activity: false,
        latest_vibe_check: null,
      });
    });
  });

  describe('batchGetVenueVibeStats', () => {
    it('should fetch stats for multiple venues in a single query', async () => {
      const venueIds = ['venue-1', 'venue-2', 'venue-3'];
      const mockVibeChecks = [
        { ...mockVibeCheckData, venue_id: 'venue-1', busyness_rating: 3 },
        { ...mockVibeCheckData, venue_id: 'venue-1', busyness_rating: 4 },
        { ...mockVibeCheckData, venue_id: 'venue-2', busyness_rating: 2 },
      ];

      mockSupabaseQuery.select.mockResolvedValue({
        data: mockVibeChecks,
        error: null,
      });

      const result = await OptimizedQueryService.batchGetVenueVibeStats(venueIds, 4);

      expect(mockSupabaseQuery.in).toHaveBeenCalledWith('venue_id', venueIds);
      
      expect(result.data['venue-1']).toEqual({
        recent_count: 2,
        average_busyness: 3.5,
        has_live_activity: expect.any(Boolean),
        latest_vibe_check: expect.any(Object),
      });
      
      expect(result.data['venue-2']).toEqual({
        recent_count: 1,
        average_busyness: 2,
        has_live_activity: expect.any(Boolean),
        latest_vibe_check: expect.any(Object),
      });
      
      expect(result.data['venue-3']).toEqual({
        recent_count: 0,
        average_busyness: null,
        has_live_activity: false,
        latest_vibe_check: null,
      });
    });
  });

  describe('getUserRecentVibeCheckOptimized', () => {
    it('should check user rate limit efficiently', async () => {
      const recentVibeCheck = {
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      };

      mockSupabaseQuery.select.mockResolvedValue({
        data: [recentVibeCheck],
        error: null,
      });

      const result = await OptimizedQueryService.getUserRecentVibeCheckOptimized('user-1', 'venue-1');

      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('venue_id', 'venue-1');
      expect(mockSupabaseQuery.limit).toHaveBeenCalledWith(1);
      
      expect(result.data.canPost).toBe(false);
      expect(result.data.timeUntilReset).toBeGreaterThan(0);
      expect(result.data.lastVibeCheck).toBeInstanceOf(Date);
    });

    it('should allow posting when no recent vibe check exists', async () => {
      mockSupabaseQuery.select.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await OptimizedQueryService.getUserRecentVibeCheckOptimized('user-1', 'venue-1');

      expect(result.data.canPost).toBe(true);
      expect(result.data.timeUntilReset).toBeUndefined();
    });

    it('should allow posting when rate limit has expired', async () => {
      const oldVibeCheck = {
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      };

      mockSupabaseQuery.select.mockResolvedValue({
        data: [oldVibeCheck],
        error: null,
      });

      const result = await OptimizedQueryService.getUserRecentVibeCheckOptimized('user-1', 'venue-1');

      expect(result.data.canPost).toBe(true);
      expect(result.data.timeUntilReset).toBeUndefined();
    });
  });

  describe('Data Transformation', () => {
    it('should transform raw data to VibeCheckWithDetails format', async () => {
      mockSupabaseQuery.select.mockResolvedValue({
        data: [mockVibeCheckData],
        error: null,
      });

      const result = await OptimizedQueryService.getVenueVibeChecksOptimized('venue-1', 4);
      const transformedData = result.data[0];

      expect(transformedData).toHaveProperty('id', '1');
      expect(transformedData).toHaveProperty('venue_id', 'venue-1');
      expect(transformedData).toHaveProperty('user_id', 'user-1');
      expect(transformedData).toHaveProperty('time_ago');
      expect(transformedData).toHaveProperty('is_recent');
      expect(transformedData.user).toEqual({
        id: 'user-1',
        name: 'Test User',
        avatar_url: null,
      });
      expect(transformedData.venue).toEqual({
        id: 'venue-1',
        name: 'Test Venue',
        address: '123 Test St',
      });
    });

    it('should generate optimized time ago strings', async () => {
      const testCases = [
        { minutesAgo: 0, expected: 'Just now' },
        { minutesAgo: 30, expected: '30m ago' },
        { minutesAgo: 90, expected: '1h ago' },
        { minutesAgo: 1500, expected: '1d ago' },
      ];

      for (const testCase of testCases) {
        const vibeCheckData = {
          ...mockVibeCheckData,
          created_at: new Date(Date.now() - testCase.minutesAgo * 60 * 1000).toISOString(),
        };

        mockSupabaseQuery.select.mockResolvedValue({
          data: [vibeCheckData],
          error: null,
        });

        const result = await OptimizedQueryService.getVenueVibeChecksOptimized('venue-1', 4);
        expect(result.data[0].time_ago).toBe(testCase.expected);
      }
    });
  });
});