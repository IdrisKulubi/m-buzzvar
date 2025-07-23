import { LocationVerificationService } from '../LocationVerificationService';
import * as Location from 'expo-location';
import { Venue } from '../../lib/types';

// Mock expo-location
jest.mock('expo-location', () => ({
  hasServicesEnabledAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    High: 'high',
  },
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
}));

const mockLocation = Location as jest.Mocked<typeof Location>;

describe('LocationVerificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points accurately', () => {
      // Test case 1: Same location (should be 0)
      const distance1 = LocationVerificationService.calculateDistance(
        40.7128, -74.0060, // New York City
        40.7128, -74.0060  // Same location
      );
      expect(distance1).toBe(0);

      // Test case 2: Known distance between NYC and LA (approximately 3944 km)
      const distance2 = LocationVerificationService.calculateDistance(
        40.7128, -74.0060, // New York City
        34.0522, -118.2437 // Los Angeles
      );
      expect(distance2).toBeCloseTo(3944000, -3); // Within 1000m accuracy

      // Test case 3: Short distance (100m test case)
      // Using coordinates that are approximately 100m apart
      const distance3 = LocationVerificationService.calculateDistance(
        40.7128, -74.0060,
        40.7137, -74.0060  // Roughly 100m north
      );
      expect(distance3).toBeCloseTo(100, 0); // Within 1m accuracy

      // Test case 4: Very short distance (10m test case)
      const distance4 = LocationVerificationService.calculateDistance(
        40.7128, -74.0060,
        40.71289, -74.0060  // Roughly 10m north
      );
      expect(distance4).toBeCloseTo(10, 0); // Within 1m accuracy
    });

    it('should handle edge cases correctly', () => {
      // Test with extreme coordinates
      const distance1 = LocationVerificationService.calculateDistance(
        90, 0,    // North Pole
        -90, 0    // South Pole
      );
      expect(distance1).toBeCloseTo(20015000, -3); // Half Earth's circumference

      // Test with negative coordinates
      const distance2 = LocationVerificationService.calculateDistance(
        -33.8688, 151.2093, // Sydney
        51.5074, -0.1278    // London
      );
      expect(distance2).toBeGreaterThan(17000000); // Should be > 17,000km
    });

    it('should return consistent results regardless of coordinate order', () => {
      const lat1 = 40.7128, lon1 = -74.0060;
      const lat2 = 34.0522, lon2 = -118.2437;

      const distance1 = LocationVerificationService.calculateDistance(lat1, lon1, lat2, lon2);
      const distance2 = LocationVerificationService.calculateDistance(lat2, lon2, lat1, lon1);

      expect(distance1).toBe(distance2);
    });
  });

  describe('requestLocationPermission', () => {
    it('should return granted: true when permissions are granted', async () => {
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      const result = await LocationVerificationService.requestLocationPermission();

      expect(result.granted).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error when location services are disabled', async () => {
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(false);

      const result = await LocationVerificationService.requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.error).toContain('Location services are disabled');
    });

    it('should return error when permission is denied', async () => {
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
        granted: false,
        canAskAgain: true,
        expires: 'never',
      });

      const result = await LocationVerificationService.requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.error).toContain('Location permission denied');
    });

    it('should handle exceptions gracefully', async () => {
      mockLocation.hasServicesEnabledAsync.mockRejectedValue(new Error('Service error'));

      const result = await LocationVerificationService.requestLocationPermission();

      expect(result.granted).toBe(false);
      expect(result.error).toContain('Failed to request location permission');
    });
  });

  describe('getCurrentLocation', () => {
    it('should return location when permissions are granted', async () => {
      const mockLocationObject = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: null,
          accuracy: 5,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };

      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });
      mockLocation.getCurrentPositionAsync.mockResolvedValue(mockLocationObject);

      const result = await LocationVerificationService.getCurrentLocation();

      expect(result.location).toEqual(mockLocationObject);
      expect(result.error).toBeUndefined();
    });

    it('should return error when permissions are not granted', async () => {
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(false);

      const result = await LocationVerificationService.getCurrentLocation();

      expect(result.location).toBeUndefined();
      expect(result.error).toContain('Location services are disabled');
    });

    it('should handle location fetch errors', async () => {
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });
      mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('GPS error'));

      const result = await LocationVerificationService.getCurrentLocation();

      expect(result.location).toBeUndefined();
      expect(result.error).toContain('Failed to get current location');
    });
  });

  describe('verifyUserAtVenue', () => {
    const mockUserLocation = {
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
        altitude: null,
        accuracy: 5,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };

    it('should return valid when user is within 100m of venue', async () => {
      const venue: Venue = {
        id: '1',
        name: 'Test Venue',
        latitude: 40.7137, // ~100m north
        longitude: -74.0060,
        address: 'Test Address',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: null,
        location: null,
        contact: null,
        hours: null,
        cover_image_url: null,
        cover_video_url: null,
      };

      const result = await LocationVerificationService.verifyUserAtVenue(
        mockUserLocation,
        venue
      );

      expect(result.is_valid).toBe(true);
      expect(result.distance_meters).toBeLessThanOrEqual(100);
      expect(result.venue_name).toBe('Test Venue');
    });

    it('should return invalid when user is more than 100m from venue', async () => {
      const venue: Venue = {
        id: '1',
        name: 'Test Venue',
        latitude: 40.7228, // ~1000m north
        longitude: -74.0060,
        address: 'Test Address',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: null,
        location: null,
        contact: null,
        hours: null,
        cover_image_url: null,
        cover_video_url: null,
      };

      const result = await LocationVerificationService.verifyUserAtVenue(
        mockUserLocation,
        venue
      );

      expect(result.is_valid).toBe(false);
      expect(result.distance_meters).toBeGreaterThan(100);
      expect(result.venue_name).toBe('Test Venue');
    });

    it('should handle venue without coordinates', async () => {
      const venue: Venue = {
        id: '1',
        name: 'Test Venue',
        latitude: null,
        longitude: null,
        address: 'Test Address',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: null,
        location: null,
        contact: null,
        hours: null,
        cover_image_url: null,
        cover_video_url: null,
      };

      const result = await LocationVerificationService.verifyUserAtVenue(
        mockUserLocation,
        venue
      );

      expect(result.is_valid).toBe(false);
      expect(result.distance_meters).toBe(Infinity);
      expect(result.venue_name).toBe('Test Venue');
    });

    it('should handle venue with missing name', async () => {
      // Create a venue object with null name by casting
      const venue = {
        id: '1',
        name: null,
        latitude: 40.7128,
        longitude: -74.0060,
        address: 'Test Address',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        description: null,
        location: null,
        contact: null,
        hours: null,
        cover_image_url: null,
        cover_video_url: null,
      } as Venue;

      const result = await LocationVerificationService.verifyUserAtVenue(
        mockUserLocation,
        venue
      );

      expect(result.venue_name).toBe('Unknown Venue');
    });
  });

  describe('verifyLocationForVenue', () => {
    const venue: Venue = {
      id: '1',
      name: 'Test Venue',
      latitude: 40.7137,
      longitude: -74.0060,
      address: 'Test Address',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      description: null,
      location: null,
      contact: null,
      hours: null,
      cover_image_url: null,
      cover_video_url: null,
    };

    it('should return verification result when location is successfully obtained', async () => {
      const mockLocationObject = {
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
          altitude: null,
          accuracy: 5,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };

      mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });
      mockLocation.getCurrentPositionAsync.mockResolvedValue(mockLocationObject);

      const result = await LocationVerificationService.verifyLocationForVenue(venue);

      expect(result.verification).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.verification?.venue_name).toBe('Test Venue');
    });

    it('should return error when location cannot be obtained', async () => {
      mockLocation.hasServicesEnabledAsync.mockResolvedValue(false);

      const result = await LocationVerificationService.verifyLocationForVenue(venue);

      expect(result.verification).toBeUndefined();
      expect(result.error).toContain('Location services are disabled');
    });
  });

  describe('getDistanceDescription', () => {
    it('should return appropriate descriptions for different distances', () => {
      expect(LocationVerificationService.getDistanceDescription(25)).toBe('Very close');
      expect(LocationVerificationService.getDistanceDescription(75)).toBe('Close enough');
      expect(LocationVerificationService.getDistanceDescription(150)).toBe('150m away');
      expect(LocationVerificationService.getDistanceDescription(450)).toBe('450m away');
      expect(LocationVerificationService.getDistanceDescription(750)).toBe('800m away');
      expect(LocationVerificationService.getDistanceDescription(1500)).toBe('1.5km away');
      expect(LocationVerificationService.getDistanceDescription(2750)).toBe('2.8km away');
    });

    it('should handle edge cases', () => {
      expect(LocationVerificationService.getDistanceDescription(0)).toBe('Very close');
      expect(LocationVerificationService.getDistanceDescription(49)).toBe('Very close');
      expect(LocationVerificationService.getDistanceDescription(50)).toBe('Close enough');
      expect(LocationVerificationService.getDistanceDescription(99)).toBe('Close enough');
      expect(LocationVerificationService.getDistanceDescription(100)).toBe('100m away');
      expect(LocationVerificationService.getDistanceDescription(1000)).toBe('1.0km away');
    });
  });

  describe('MAX_DISTANCE_METERS constant', () => {
    it('should be set to 100 meters', () => {
      expect(LocationVerificationService.MAX_DISTANCE_METERS).toBe(100);
    });
  });
});