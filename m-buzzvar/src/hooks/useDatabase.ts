import { useState, useEffect, useCallback } from "react";
import {
  getVenues,
  getVenueById,
  getPromotions,
  checkDatabaseHealth,
  getUserProfile,
  updateUserProfile,
  createUserProfile,
  searchVenues,
  getNearbyVenues,
} from "../actions/standalone-actions";
import type { Venue, Promotion, User } from "../lib/types";

// Venues hook
function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchVenues = useCallback(
    async (limit: number = 50, offset: number = 0) => {
      setLoading(true);
      setError(null);

      try {
        const result = await getVenues(limit, offset);
        if (result.error) {
          throw result.error;
        }
        setVenues(result.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  return {
    venues,
    loading,
    error,
    fetchVenues,
    refetch: fetchVenues,
  };
}

// Single venue hook
function useVenue(venueId: string | null) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchVenue = useCallback(async () => {
    if (!venueId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getVenueById(venueId);
      if (result.error) {
        throw result.error;
      }
      setVenue(result.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchVenue();
  }, [fetchVenue]);

  return {
    venue,
    loading,
    error,
    refetch: fetchVenue,
  };
}

// Promotions hook
function usePromotions(venueId?: string) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPromotions = useCallback(
    async (limit: number = 50, offset: number = 0) => {
      setLoading(true);
      setError(null);

      try {
        const result = await getPromotions(venueId, limit, offset);
        if (result.error) {
          throw result.error;
        }
        setPromotions(result.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [venueId]
  );

  return {
    promotions,
    loading,
    error,
    fetchPromotions,
    refetch: fetchPromotions,
  };
}

// Database health monitoring hook
function useDatabaseHealth() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await checkDatabaseHealth();
      if (result.error) {
        throw result.error;
      }
      setHealth(result.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();

    // Set up periodic health checks
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    health,
    loading,
    error,
    checkHealth,
  };
}

// Venue search hook
function useVenueSearch() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (query: string, limit: number = 20) => {
    if (!query.trim()) {
      setVenues([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await searchVenues(query, limit);
      if (result.error) {
        throw result.error;
      }
      setVenues(result.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    venues,
    loading,
    error,
    search,
  };
}

// Nearby venues hook
function useNearbyVenues() {
  const [venues, setVenues] = useState<(Venue & { distance: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchNearbyVenues = useCallback(
    async (
      latitude: number,
      longitude: number,
      radiusKm: number = 10,
      limit: number = 20
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await getNearbyVenues(
          latitude,
          longitude,
          radiusKm,
          limit
        );
        if (result.error) {
          throw result.error;
        }
        setVenues(result.data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    venues,
    loading,
    error,
    fetchNearbyVenues,
  };
}

// User profile management hook
function useUserProfile() {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getUserProfile(userId);
      if (result.error) {
        throw result.error;
      }
      setProfile(result.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (
      userId: string,
      updates: Partial<Omit<User, "id" | "created_at">>
    ) => {
      setLoading(true);
      setError(null);

      try {
        const result = await updateUserProfile(userId, updates);
        if (result.error) {
          throw result.error;
        }
        setProfile(result.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createProfile = useCallback(
    async (profileData: Omit<User, "id" | "created_at" | "updated_at">) => {
      setLoading(true);
      setError(null);

      try {
        const result = await createUserProfile(profileData);
        if (result.error) {
          throw result.error;
        }
        setProfile(result.data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    createProfile,
  };
}

// Export all hooks
export {
  useVenues,
  useVenue,
  usePromotions,
  useDatabaseHealth,
  useVenueSearch,
  useNearbyVenues,
  useUserProfile,
};
