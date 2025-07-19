// Mock expo-location to avoid import issues in tests
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    High: 'high',
  },
}));

// Mock supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn(() => ({
            order: jest.fn(() => ({
              data: [],
              error: null,
            })),
          })),
        })),
        order: jest.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  },
}));

import { getVenues } from '../clubs';
import { supabase } from '../../lib/supabase';

describe('Clubs Actions - Vibe Check Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getVenues', () => {
    it('should fetch venues with vibe check data', async () => {
      const mockVenues = [
        {
          id: 'venue1',
          name: 'Test Venue 1',
          created_at: '2024-01-01T00:00:00Z',
          latitude: 40.7128,
          longitude: -74.0060,
        },
        {
          id: 'venue2',
          name: 'Test Venue 2',
          created_at: '2024-01-02T00:00:00Z',
          latitude: 40.7589,
          longitude: -73.9851,
        },
      ];

      const mockVibeChecks = [
        {
          id: 'vibe1',
          venue_id: 'venue1',
          busyness_rating: 4,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          users: { id: 'user1', name: 'Test User', avatar_url: null },
        },
      ];

      // Mock the venues query
      const mockVenuesQuery = {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            data: mockVenues,
            error: null,
          })),
        })),
      };

      // Mock the vibe checks query
      const mockVibeChecksQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                data: mockVibeChecks,
                error: null,
              })),
            })),
          })),
        })),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockVenuesQuery) // First call for venues
        .mockImplementation((table) => {
          if (table === 'vibe_checks') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn((field, value) => ({
                  gte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      data: value === 'venue1' ? mockVibeChecks : [],
                      error: null,
                    })),
                  })),
                })),
              })),
            };
          }
          return mockVenuesQuery;
        });

      const result = await getVenues();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      
      // Check that vibe check data is included
      const venue1 = result.data.find(v => v.id === 'venue1');
      expect(venue1).toBeDefined();
      expect(venue1?.recent_vibe_count).toBe(1);
      expect(venue1?.average_recent_busyness).toBe(4);
      expect(venue1?.has_live_activity).toBe(true);
      expect(venue1?.latest_vibe_check).toBeDefined();

      const venue2 = result.data.find(v => v.id === 'venue2');
      expect(venue2).toBeDefined();
      expect(venue2?.recent_vibe_count).toBe(0);
      expect(venue2?.average_recent_busyness).toBeNull();
      expect(venue2?.has_live_activity).toBe(false);
      expect(venue2?.latest_vibe_check).toBeNull();
    });

    it('should sort venues with live activity first', async () => {
      const mockVenues = [
        {
          id: 'venue1',
          name: 'No Activity Venue',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'venue2',
          name: 'Live Activity Venue',
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockVibeChecksVenue2 = [
        {
          id: 'vibe1',
          venue_id: 'venue2',
          busyness_rating: 3,
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          users: { id: 'user1', name: 'Test User', avatar_url: null },
        },
      ];

      const mockVenuesQuery = {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            data: mockVenues,
            error: null,
          })),
        })),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockVenuesQuery)
        .mockImplementation((table) => {
          if (table === 'vibe_checks') {
            return {
              select: jest.fn(() => ({
                eq: jest.fn((field, value) => ({
                  gte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      data: value === 'venue2' ? mockVibeChecksVenue2 : [],
                      error: null,
                    })),
                  })),
                })),
              })),
            };
          }
          return mockVenuesQuery;
        });

      const result = await getVenues();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      
      // Venue with live activity should be first
      expect(result.data[0].id).toBe('venue2');
      expect(result.data[0].has_live_activity).toBe(true);
      expect(result.data[1].id).toBe('venue1');
      expect(result.data[1].has_live_activity).toBe(false);
    });

    it('should calculate distance when user location is provided', async () => {
      const mockVenues = [
        {
          id: 'venue1',
          name: 'Close Venue',
          created_at: '2024-01-01T00:00:00Z',
          latitude: 40.7128,
          longitude: -74.0060,
        },
        {
          id: 'venue2',
          name: 'Far Venue',
          created_at: '2024-01-02T00:00:00Z',
          latitude: 41.8781,
          longitude: -87.6298,
        },
      ];

      const mockVenuesQuery = {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            data: mockVenues,
            error: null,
          })),
        })),
      };

      const mockVibeChecksQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                data: [],
                error: null,
              })),
            })),
          })),
        })),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockVenuesQuery)
        .mockReturnValue(mockVibeChecksQuery);

      const userLocation = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      } as any;

      const result = await getVenues(userLocation);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      
      // Check that distances are calculated
      expect(result.data[0].distance).toBeDefined();
      expect(result.data[1].distance).toBeDefined();
      
      // Closer venue should have smaller distance
      expect(result.data[0].distance).toBeLessThan(result.data[1].distance!);
    });

    it('should handle errors gracefully', async () => {
      const mockVenuesQuery = {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            data: null,
            error: new Error('Database error'),
          })),
        })),
      };

      (supabase.from as jest.Mock).mockReturnValue(mockVenuesQuery);

      const result = await getVenues();

      expect(result.data).toEqual([]);
      expect(result.error).toBeDefined();
    });

    it('should handle vibe check query errors gracefully', async () => {
      const mockVenues = [
        {
          id: 'venue1',
          name: 'Test Venue',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockVenuesQuery = {
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            data: mockVenues,
            error: null,
          })),
        })),
      };

      const mockVibeChecksQuery = {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                data: null,
                error: new Error('Vibe check query error'),
              })),
            })),
          })),
        })),
      };

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(mockVenuesQuery)
        .mockReturnValue(mockVibeChecksQuery);

      const result = await getVenues();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      
      // Should have default vibe check values when query fails
      const venue = result.data[0];
      expect(venue.recent_vibe_count).toBe(0);
      expect(venue.average_recent_busyness).toBeNull();
      expect(venue.has_live_activity).toBe(false);
      expect(venue.latest_vibe_check).toBeNull();
    });
  });
});