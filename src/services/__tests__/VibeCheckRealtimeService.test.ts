import { VibeCheckRealtimeService } from '../VibeCheckRealtimeService';
import { supabase } from '../../lib/supabase';
import { VibeCheckWithDetails } from '../../lib/types';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    removeChannel: jest.fn(),
    from: jest.fn(),
  },
}));

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation(),
};

describe('VibeCheckRealtimeService', () => {
  let mockChannel: any;
  let mockSubscribe: jest.Mock;
  let mockOn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSubscribe = jest.fn();
    mockOn = jest.fn();
    
    mockChannel = {
      on: mockOn.mockReturnThis(),
      subscribe: mockSubscribe,
    };

    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);
    (supabase.removeChannel as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // Clean up all subscriptions after each test
    await VibeCheckRealtimeService.unsubscribeAll();
    // Clear the internal subscriptions map for test isolation
    (VibeCheckRealtimeService as any)._clearSubscriptions();
  });

  afterAll(() => {
    // Restore console methods
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('subscribe', () => {
    it('should create subscription for all venues when no venueId provided', async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      const options = {
        onVibeCheckInsert: jest.fn(),
        onError: jest.fn(),
      };

      const result = await VibeCheckRealtimeService.subscribe('test-sub', options);

      expect(result.success).toBe(true);
      expect(supabase.channel).toHaveBeenCalledWith('vibe-checks-all');
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vibe_checks',
        },
        expect.any(Function)
      );
    });

    it('should create venue-specific subscription when venueId provided', async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      const options = {
        venueId: 'venue-123',
        onVibeCheckInsert: jest.fn(),
      };

      const result = await VibeCheckRealtimeService.subscribe('venue-sub', options);

      expect(result.success).toBe(true);
      expect(supabase.channel).toHaveBeenCalledWith('vibe-checks-venue-venue-123');
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vibe_checks',
          filter: 'venue_id=eq.venue-123',
        },
        expect.any(Function)
      );
    });

    it('should handle subscription errors', async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('CHANNEL_ERROR');
        return Promise.resolve();
      });

      const options = {
        onError: jest.fn(),
      };

      const result = await VibeCheckRealtimeService.subscribe('error-sub', options);

      expect(result.success).toBe(true); // Still returns success as subscription was created
      expect(options.onError).toHaveBeenCalledWith('Failed to establish real-time connection');
    });

    it('should replace existing subscription with same ID', async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      const options = { onVibeCheckInsert: jest.fn() };

      // Create first subscription
      await VibeCheckRealtimeService.subscribe('duplicate-sub', options);
      expect(supabase.removeChannel).not.toHaveBeenCalled();

      // Create second subscription with same ID
      await VibeCheckRealtimeService.subscribe('duplicate-sub', options);
      expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
    });

    it('should handle subscription creation errors', async () => {
      (supabase.channel as jest.Mock).mockImplementation(() => {
        throw new Error('Channel creation failed');
      });

      const result = await VibeCheckRealtimeService.subscribe('error-sub', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Channel creation failed');
    });
  });

  describe('unsubscribe', () => {
    it('should remove existing subscription', async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      // Create subscription first
      await VibeCheckRealtimeService.subscribe('test-unsub', {});
      expect(VibeCheckRealtimeService.isSubscribed('test-unsub')).toBe(true);

      // Unsubscribe
      const result = await VibeCheckRealtimeService.unsubscribe('test-unsub');

      expect(result.success).toBe(true);
      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
      expect(VibeCheckRealtimeService.isSubscribed('test-unsub')).toBe(false);
    });

    it('should handle unsubscribing non-existent subscription', async () => {
      const result = await VibeCheckRealtimeService.unsubscribe('non-existent');

      expect(result.success).toBe(true);
      expect(supabase.removeChannel).not.toHaveBeenCalled();
    });

    it('should handle unsubscribe errors', async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      // Create subscription
      await VibeCheckRealtimeService.subscribe('error-unsub', {});

      // Mock removeChannel to throw error
      (supabase.removeChannel as jest.Mock).mockRejectedValue(new Error('Remove failed'));

      const result = await VibeCheckRealtimeService.unsubscribe('error-unsub');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Remove failed');
    });
  });

  describe('unsubscribeAll', () => {
    it('should remove all active subscriptions', async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      // Create multiple subscriptions
      await VibeCheckRealtimeService.subscribe('sub1', {});
      await VibeCheckRealtimeService.subscribe('sub2', {});
      await VibeCheckRealtimeService.subscribe('sub3', {});

      expect(VibeCheckRealtimeService.getActiveSubscriptions()).toHaveLength(3);

      const result = await VibeCheckRealtimeService.unsubscribeAll();

      expect(result.success).toBe(true);
      expect(VibeCheckRealtimeService.getActiveSubscriptions()).toHaveLength(0);
      expect(supabase.removeChannel).toHaveBeenCalledTimes(3);
    });

    it('should handle errors during bulk unsubscribe', async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      await VibeCheckRealtimeService.subscribe('bulk-error', {});

      (supabase.removeChannel as jest.Mock).mockRejectedValue(new Error('Bulk remove failed'));

      const result = await VibeCheckRealtimeService.unsubscribeAll();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bulk remove failed');
    });
  });

  describe('subscription management', () => {
    beforeEach(async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });
    });

    it('should track active subscriptions', async () => {
      expect(VibeCheckRealtimeService.getActiveSubscriptions()).toHaveLength(0);

      await VibeCheckRealtimeService.subscribe('track1', {});
      await VibeCheckRealtimeService.subscribe('track2', {});

      const active = VibeCheckRealtimeService.getActiveSubscriptions();
      expect(active).toHaveLength(2);
      expect(active).toContain('track1');
      expect(active).toContain('track2');
    });

    it('should check subscription status', async () => {
      expect(VibeCheckRealtimeService.isSubscribed('status-test')).toBe(false);

      await VibeCheckRealtimeService.subscribe('status-test', {});
      expect(VibeCheckRealtimeService.isSubscribed('status-test')).toBe(true);

      await VibeCheckRealtimeService.unsubscribe('status-test');
      expect(VibeCheckRealtimeService.isSubscribed('status-test')).toBe(false);
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      mockSubscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });
    });

    it('should create live feed subscription', async () => {
      const callbacks = {
        onVibeCheckInsert: jest.fn(),
        onError: jest.fn(),
      };

      const result = await VibeCheckRealtimeService.subscribeToLiveFeed('live-feed', callbacks);

      expect(result.success).toBe(true);
      expect(supabase.channel).toHaveBeenCalledWith('vibe-checks-all');
    });

    it('should create venue-specific subscription', async () => {
      const callbacks = {
        onVibeCheckInsert: jest.fn(),
        onError: jest.fn(),
      };

      const result = await VibeCheckRealtimeService.subscribeToVenue('venue-specific', 'venue-456', callbacks);

      expect(result.success).toBe(true);
      expect(supabase.channel).toHaveBeenCalledWith('vibe-checks-venue-venue-456');
    });
  });

  describe('real-time event handling', () => {
    let eventHandler: Function;
    let mockVibeCheckData: any;

    beforeEach(async () => {
      mockSubscribe.mockImplementation((callback) => {
        callback('SUBSCRIBED');
        return Promise.resolve();
      });

      mockVibeCheckData = {
        id: 'vibe-123',
        venue_id: 'venue-123',
        user_id: 'user-123',
        busyness_rating: 4,
        comment: 'Pretty busy!',
        photo_url: null,
        user_latitude: 40.7128,
        user_longitude: -74.0060,
        created_at: new Date().toISOString(),
        user: {
          id: 'user-123',
          name: 'Test User',
          avatar_url: null,
        },
        venue: {
          id: 'venue-123',
          name: 'Test Venue',
          address: '123 Test St',
        },
      };

      // Mock the database query for fetching vibe check details
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockVibeCheckData,
              error: null,
            }),
          }),
        }),
      });

      // Capture the event handler
      mockOn.mockImplementation((event, config, handler) => {
        eventHandler = handler;
        return mockChannel;
      });
    });

    it('should handle INSERT events', async () => {
      const callbacks = {
        onVibeCheckInsert: jest.fn(),
        onError: jest.fn(),
      };

      await VibeCheckRealtimeService.subscribe('insert-test', callbacks);

      // Simulate INSERT event
      await eventHandler({
        eventType: 'INSERT',
        new: { id: 'vibe-123' },
        old: null,
      });

      expect(callbacks.onVibeCheckInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'vibe-123',
          venue_id: 'venue-123',
          user_id: 'user-123',
          busyness_rating: 4,
          time_ago: 'Just now',
          is_recent: true,
        })
      );
    });

    it('should handle UPDATE events', async () => {
      const callbacks = {
        onVibeCheckUpdate: jest.fn(),
        onError: jest.fn(),
      };

      await VibeCheckRealtimeService.subscribe('update-test', callbacks);

      // Simulate UPDATE event
      await eventHandler({
        eventType: 'UPDATE',
        new: { id: 'vibe-123' },
        old: { id: 'vibe-123' },
      });

      expect(callbacks.onVibeCheckUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'vibe-123',
          venue_id: 'venue-123',
        })
      );
    });

    it('should handle DELETE events', async () => {
      const callbacks = {
        onVibeCheckDelete: jest.fn(),
        onError: jest.fn(),
      };

      await VibeCheckRealtimeService.subscribe('delete-test', callbacks);

      // Simulate DELETE event
      await eventHandler({
        eventType: 'DELETE',
        new: null,
        old: { id: 'vibe-123' },
      });

      expect(callbacks.onVibeCheckDelete).toHaveBeenCalledWith('vibe-123');
    });

    it('should handle unknown event types', async () => {
      const callbacks = {
        onError: jest.fn(),
      };

      await VibeCheckRealtimeService.subscribe('unknown-test', callbacks);

      // Simulate unknown event
      await eventHandler({
        eventType: 'UNKNOWN',
        new: null,
        old: null,
      });

      expect(consoleSpy.warn).toHaveBeenCalledWith('Unknown realtime event type:', 'UNKNOWN');
    });

    it('should handle database fetch errors during event processing', async () => {
      const callbacks = {
        onVibeCheckInsert: jest.fn(),
        onError: jest.fn(),
      };

      // Mock database error
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await VibeCheckRealtimeService.subscribe('db-error-test', callbacks);

      // Simulate INSERT event
      await eventHandler({
        eventType: 'INSERT',
        new: { id: 'vibe-123' },
        old: null,
      });

      // Should not call the callback if database fetch fails
      expect(callbacks.onVibeCheckInsert).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error fetching vibe check details:',
        { message: 'Database error' }
      );
    });

    it('should handle event processing errors', async () => {
      const callbacks = {
        onVibeCheckInsert: jest.fn().mockImplementation(() => {
          throw new Error('Callback error');
        }),
        onError: jest.fn(),
      };

      await VibeCheckRealtimeService.subscribe('callback-error-test', callbacks);

      // Simulate INSERT event
      await eventHandler({
        eventType: 'INSERT',
        new: { id: 'vibe-123' },
        old: null,
      });

      expect(callbacks.onError).toHaveBeenCalledWith(expect.any(Error));
      expect(consoleSpy.error).toHaveBeenCalledWith(
        'Error handling realtime event:',
        expect.any(Error)
      );
    });
  });
});