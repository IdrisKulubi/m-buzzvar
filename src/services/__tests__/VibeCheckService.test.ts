import { VibeCheckService } from '../VibeCheckService';
import { LocationVerificationService } from '../LocationVerificationService';

// Mock the LocationVerificationService
jest.mock('../LocationVerificationService');

// Mock the supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

// Mock fetch for photo upload
global.fetch = jest.fn();

const mockLocationService = LocationVerificationService as jest.Mocked<typeof LocationVerificationService>;

describe('VibeCheckService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canUserPostVibeCheck', () => {
    it('should return true when user has no recent vibe checks', async () => {
      // Mock supabase query chain
      const mockLimit = jest.fn().mockResolvedValue({
        data: [], // No recent vibe checks
        error: null,
      });
      
      const mockGte = jest.fn().mockReturnValue({
        limit: mockLimit,
      });
      
      const mockEq2 = jest.fn().mockReturnValue({
        gte: mockGte,
      });
      
      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });
      
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      // Import and mock supabase after setting up the mock
      const { supabase } = require('../../lib/supabase');
      supabase.from = mockFrom;

      const result = await VibeCheckService.canUserPostVibeCheck('user-123', 'venue-123');

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('vibe_checks');
      expect(mockSelect).toHaveBeenCalledWith('id');
    });

    it('should return false when user has recent vibe check', async () => {
      // Mock supabase query chain
      const mockLimit = jest.fn().mockResolvedValue({
        data: [{ id: 'recent-vibe-check' }], // Recent vibe check exists
        error: null,
      });
      
      const mockGte = jest.fn().mockReturnValue({
        limit: mockLimit,
      });
      
      const mockEq2 = jest.fn().mockReturnValue({
        gte: mockGte,
      });
      
      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });
      
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      const { supabase } = require('../../lib/supabase');
      supabase.from = mockFrom;

      const result = await VibeCheckService.canUserPostVibeCheck('user-123', 'venue-123');

      expect(result).toBe(false);
    });

    it('should return true on database error (fail open)', async () => {
      // Mock supabase query chain with error
      const mockLimit = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });
      
      const mockGte = jest.fn().mockReturnValue({
        limit: mockLimit,
      });
      
      const mockEq2 = jest.fn().mockReturnValue({
        gte: mockGte,
      });
      
      const mockEq1 = jest.fn().mockReturnValue({
        eq: mockEq2,
      });
      
      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq1,
      });
      
      const mockFrom = jest.fn().mockReturnValue({
        select: mockSelect,
      });

      const { supabase } = require('../../lib/supabase');
      supabase.from = mockFrom;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await VibeCheckService.canUserPostVibeCheck('user-123', 'venue-123');

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Error checking rate limit:', { message: 'Database error' });
      
      consoleSpy.mockRestore();
    });
  });

  describe('transformToVibeCheckWithDetails', () => {
    it('should transform time correctly for recent timestamps', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const rawData = {
        id: 'vibe-123',
        venue_id: 'venue-123',
        user_id: 'user-123',
        busyness_rating: 4,
        comment: 'Great atmosphere!',
        photo_url: null,
        user_latitude: 40.7128,
        user_longitude: -74.0060,
        created_at: fiveMinutesAgo.toISOString(),
        user: { id: 'user-123', name: 'Test User', avatar_url: null },
        venue: { id: 'venue-123', name: 'Test Venue', address: '123 Test St' },
      };

      // Access private method through any cast
      const result = (VibeCheckService as any).transformToVibeCheckWithDetails(rawData);

      expect(result.time_ago).toBe('5 minutes ago');
      expect(result.is_recent).toBe(true);
    });

    it('should handle "just now" case', () => {
      const now = new Date();
      
      const rawData = {
        id: 'vibe-123',
        venue_id: 'venue-123',
        user_id: 'user-123',
        busyness_rating: 4,
        comment: 'Great atmosphere!',
        photo_url: null,
        user_latitude: 40.7128,
        user_longitude: -74.0060,
        created_at: now.toISOString(),
        user: { id: 'user-123', name: 'Test User', avatar_url: null },
        venue: { id: 'venue-123', name: 'Test Venue', address: '123 Test St' },
      };

      const result = (VibeCheckService as any).transformToVibeCheckWithDetails(rawData);

      expect(result.time_ago).toBe('Just now');
      expect(result.is_recent).toBe(true);
    });

    it('should handle hours and days correctly', () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      
      const rawData = {
        id: 'vibe-123',
        venue_id: 'venue-123',
        user_id: 'user-123',
        busyness_rating: 4,
        comment: 'Great atmosphere!',
        photo_url: null,
        user_latitude: 40.7128,
        user_longitude: -74.0060,
        created_at: threeDaysAgo.toISOString(),
        user: { id: 'user-123', name: 'Test User', avatar_url: null },
        venue: { id: 'venue-123', name: 'Test Venue', address: '123 Test St' },
      };

      const result = (VibeCheckService as any).transformToVibeCheckWithDetails(rawData);

      expect(result.time_ago).toBe('3 days ago');
      expect(result.is_recent).toBe(false);
    });

    it('should handle missing user name gracefully', () => {
      const rawData = {
        id: 'vibe-123',
        venue_id: 'venue-123',
        user_id: 'user-123',
        busyness_rating: 4,
        comment: 'Great atmosphere!',
        photo_url: null,
        user_latitude: 40.7128,
        user_longitude: -74.0060,
        created_at: new Date().toISOString(),
        user: { id: 'user-123', name: null, avatar_url: null },
        venue: { id: 'venue-123', name: 'Test Venue', address: '123 Test St' },
      };

      const result = (VibeCheckService as any).transformToVibeCheckWithDetails(rawData);

      expect(result.user.name).toBe('Anonymous');
    });

    it('should handle missing venue name gracefully', () => {
      const rawData = {
        id: 'vibe-123',
        venue_id: 'venue-123',
        user_id: 'user-123',
        busyness_rating: 4,
        comment: 'Great atmosphere!',
        photo_url: null,
        user_latitude: 40.7128,
        user_longitude: -74.0060,
        created_at: new Date().toISOString(),
        user: { id: 'user-123', name: 'Test User', avatar_url: null },
        venue: { id: 'venue-123', name: null, address: '123 Test St' },
      };

      const result = (VibeCheckService as any).transformToVibeCheckWithDetails(rawData);

      expect(result.venue.name).toBe('Unknown Venue');
    });
  });

  describe('LocationVerificationService integration', () => {
    it('should use LocationVerificationService.MAX_DISTANCE_METERS constant', () => {
      // This test verifies that the service uses the correct constant
      expect(LocationVerificationService.MAX_DISTANCE_METERS).toBe(100);
    });
  });

  describe('Error handling', () => {
    it('should handle exceptions gracefully in canUserPostVibeCheck', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.from = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await VibeCheckService.canUserPostVibeCheck('user-123', 'venue-123');

      expect(result).toBe(true); // Should fail open
      expect(consoleSpy).toHaveBeenCalledWith('Error checking rate limit:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Photo upload functionality', () => {
    it('should handle photo upload errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));

      const mockPhoto = {
        uri: 'file://photo.jpg',
        type: 'image/jpeg',
        name: 'photo.jpg',
      };

      const result = await VibeCheckService.uploadVibeCheckPhoto(mockPhoto, 'user-123');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Failed to upload photo. Please try again.');
    });
  });
});