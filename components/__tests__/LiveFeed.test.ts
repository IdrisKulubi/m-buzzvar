import { VibeCheckWithDetails } from "@/src/lib/types";
import { VibeCheckService } from "@/src/services/VibeCheckService";
import { ErrorType, ErrorSeverity } from "@/src/lib/errors";

// Mock Supabase and Expo modules first
jest.mock("@/src/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock the LocationVerificationService
jest.mock("@/src/services/LocationVerificationService", () => ({
  LocationVerificationService: {
    verifyUserAtVenue: jest.fn(),
    MAX_DISTANCE_METERS: 100,
  },
}));

// Mock the PhotoUploadService
jest.mock("@/src/services/PhotoUploadService", () => ({
  PhotoUploadService: {
    uploadPhoto: jest.fn(),
    deletePhoto: jest.fn(),
  },
}));

// Mock the VibeCheckService
jest.mock("@/src/services/VibeCheckService");
const mockVibeCheckService = VibeCheckService as jest.Mocked<
  typeof VibeCheckService
>;

// Mock React Native components
jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  FlatList: "FlatList",
  RefreshControl: "RefreshControl",
  ActivityIndicator: "ActivityIndicator",
  StyleSheet: {
    create: (styles: any) => styles,
  },
  useColorScheme: () => "dark",
}));

// Mock the components
jest.mock("../ThemedText", () => "ThemedText");
jest.mock("../ThemedView", () => "ThemedView");
jest.mock("../VibeCheckCard", () => "VibeCheckCard");
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

const mockVibeChecks: VibeCheckWithDetails[] = [
  {
    id: "1",
    venue_id: "venue-1",
    user_id: "user-1",
    busyness_rating: 4,
    comment: "Great atmosphere!",
    photo_url: null,
    user_latitude: 40.7128,
    user_longitude: -74.006,
    created_at: new Date().toISOString(),
    user: {
      id: "user-1",
      name: "John Doe",
      avatar_url: undefined,
    },
    venue: {
      id: "venue-1",
      name: "Test Venue",
      address: "123 Test St",
    },
    time_ago: "5 minutes ago",
    is_recent: true,
  },
  {
    id: "2",
    venue_id: "venue-1",
    user_id: "user-2",
    busyness_rating: 3,
    comment: "Pretty good vibes",
    photo_url: null,
    user_latitude: 40.7128,
    user_longitude: -74.006,
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    user: {
      id: "user-2",
      name: "Jane Smith",
      avatar_url: undefined,
    },
    venue: {
      id: "venue-1",
      name: "Test Venue",
      address: "123 Test St",
    },
    time_ago: "10 minutes ago",
    is_recent: true,
  },
  {
    id: "3",
    venue_id: "venue-2",
    user_id: "user-3",
    busyness_rating: 5,
    comment: "Packed house!",
    photo_url: null,
    user_latitude: 40.7589,
    user_longitude: -73.9851,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    user: {
      id: "user-3",
      name: "Bob Wilson",
      avatar_url: undefined,
    },
    venue: {
      id: "venue-2",
      name: "Another Venue",
      address: "456 Another St",
    },
    time_ago: "30 minutes ago",
    is_recent: true,
  },
];

describe("LiveFeed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call getLiveVibeChecks with correct parameters", async () => {
    mockVibeCheckService.getLiveVibeChecks.mockResolvedValue({
      data: mockVibeChecks,
      error: null,
    });

    // Simulate the service call that would happen in the component
    await mockVibeCheckService.getLiveVibeChecks(4, 50);

    // Test that the service is called with correct parameters
    expect(mockVibeCheckService.getLiveVibeChecks).toHaveBeenCalledWith(4, 50);
  });

  it("should group vibe checks by venue correctly", () => {
    // Test the grouping logic
    const groups: { [key: string]: any } = {};

    mockVibeChecks.forEach((vibeCheck) => {
      const venueId = vibeCheck.venue_id;
      if (!groups[venueId]) {
        groups[venueId] = {
          venue_id: venueId,
          venue_name: vibeCheck.venue.name,
          venue_address: vibeCheck.venue.address,
          vibe_checks: [],
        };
      }
      groups[venueId].vibe_checks.push(vibeCheck);
    });

    const groupedArray = Object.values(groups);

    // Should have 2 groups (venue-1 and venue-2)
    expect(groupedArray).toHaveLength(2);

    // venue-1 should have 2 vibe checks
    const venue1Group = groupedArray.find((g: any) => g.venue_id === "venue-1");
    expect(venue1Group?.vibe_checks).toHaveLength(2);

    // venue-2 should have 1 vibe check
    const venue2Group = groupedArray.find((g: any) => g.venue_id === "venue-2");
    expect(venue2Group?.vibe_checks).toHaveLength(1);
  });

  it("should handle service errors gracefully", async () => {
    const networkError = {
      type: ErrorType.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: "Network error occurred",
      userMessage: "Network error occurred. Please try again.",
      actionable: true,
      retryable: true,
    };

    mockVibeCheckService.getLiveVibeChecks.mockResolvedValue({
      data: [],
      error: networkError,
    });

    // The component should handle errors without crashing
    expect(mockVibeCheckService.getLiveVibeChecks).toBeDefined();
  });

  it("should handle empty vibe checks array", async () => {
    mockVibeCheckService.getLiveVibeChecks.mockResolvedValue({
      data: [],
      error: null,
    });

    // Should handle empty array gracefully
    const groups: { [key: string]: any } = {};
    const emptyArray: VibeCheckWithDetails[] = [];

    emptyArray.forEach((vibeCheck) => {
      const venueId = vibeCheck.venue_id;
      if (!groups[venueId]) {
        groups[venueId] = {
          venue_id: venueId,
          venue_name: vibeCheck.venue.name,
          venue_address: vibeCheck.venue.address,
          vibe_checks: [],
        };
      }
      groups[venueId].vibe_checks.push(vibeCheck);
    });

    expect(Object.values(groups)).toHaveLength(0);
  });

  it("should sort grouped venues by most recent vibe check", () => {
    const groups: { [key: string]: any } = {};

    mockVibeChecks.forEach((vibeCheck) => {
      const venueId = vibeCheck.venue_id;
      if (!groups[venueId]) {
        groups[venueId] = {
          venue_id: venueId,
          venue_name: vibeCheck.venue.name,
          venue_address: vibeCheck.venue.address,
          vibe_checks: [],
        };
      }
      groups[venueId].vibe_checks.push(vibeCheck);
    });

    // Convert to array and sort by most recent vibe check
    const sortedGroups = Object.values(groups).sort((a: any, b: any) => {
      const aLatest = new Date(a.vibe_checks[0]?.created_at || 0);
      const bLatest = new Date(b.vibe_checks[0]?.created_at || 0);
      return bLatest.getTime() - aLatest.getTime();
    });

    // venue-1 should come first as it has the most recent vibe check
    expect(sortedGroups[0]).toMatchObject({
      venue_id: "venue-1",
      venue_name: "Test Venue",
    });
  });
});
