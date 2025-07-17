import * as Location from 'expo-location';
import { LocationVerification, Venue } from '../lib/types';

export class LocationVerificationService {
  static readonly MAX_DISTANCE_METERS = 100;

  /**
   * Request location permissions from the user
   * @returns Promise with permission status and error handling
   */
  static async requestLocationPermission(): Promise<{
    granted: boolean;
    error?: string;
  }> {
    try {
      // Check if location services are enabled
      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        return {
          granted: false,
          error: 'Location services are disabled. Please enable location services in your device settings.',
        };
      }

      // Request foreground permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        return {
          granted: false,
          error: 'Location permission denied. Please allow location access to post vibe checks.',
        };
      }

      return { granted: true };
    } catch (error) {
      return {
        granted: false,
        error: 'Failed to request location permission. Please try again.',
      };
    }
  }

  /**
   * Get the user's current location
   * @returns Promise with location data or error
   */
  static async getCurrentLocation(): Promise<{
    location?: Location.LocationObject;
    error?: string;
  }> {
    try {
      const permissionResult = await this.requestLocationPermission();
      if (!permissionResult.granted) {
        return { error: permissionResult.error };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 1,
      });

      return { location };
    } catch (error) {
      return {
        error: 'Failed to get current location. Please check your GPS signal and try again.',
      };
    }
  }

  /**
   * Calculate the distance between two geographic points using the Haversine formula
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lon2 Longitude of second point
   * @returns Distance in meters
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    return Math.round(distance);
  }

  /**
   * Verify if the user is within the required distance of a venue
   * @param userLocation User's current location
   * @param venue Venue to check proximity to
   * @returns LocationVerification result
   */
  static async verifyUserAtVenue(
    userLocation: Location.LocationObject,
    venue: Venue
  ): Promise<LocationVerification> {
    if (!venue.latitude || !venue.longitude) {
      return {
        is_valid: false,
        distance_meters: Infinity,
        venue_name: venue.name || 'Unknown Venue',
      };
    }

    const distance = this.calculateDistance(
      userLocation.coords.latitude,
      userLocation.coords.longitude,
      venue.latitude,
      venue.longitude
    );

    return {
      is_valid: distance <= this.MAX_DISTANCE_METERS,
      distance_meters: distance,
      venue_name: venue.name || 'Unknown Venue',
    };
  }

  /**
   * Verify user location against a venue with full error handling
   * @param venue Venue to verify against
   * @returns Promise with verification result and any errors
   */
  static async verifyLocationForVenue(venue: Venue): Promise<{
    verification?: LocationVerification;
    error?: string;
  }> {
    try {
      const locationResult = await this.getCurrentLocation();
      if (locationResult.error || !locationResult.location) {
        return { error: locationResult.error };
      }

      const verification = await this.verifyUserAtVenue(
        locationResult.location,
        venue
      );

      return { verification };
    } catch (error) {
      return {
        error: 'Failed to verify location. Please try again.',
      };
    }
  }

  /**
   * Get user-friendly distance description
   * @param distanceMeters Distance in meters
   * @returns Human-readable distance string
   */
  static getDistanceDescription(distanceMeters: number): string {
    if (distanceMeters < 50) {
      return 'Very close';
    } else if (distanceMeters < 100) {
      return 'Close enough';
    } else if (distanceMeters < 500) {
      return `${distanceMeters}m away`;
    } else if (distanceMeters < 1000) {
      return `${Math.round(distanceMeters / 100) * 100}m away`;
    } else {
      const km = (distanceMeters / 1000).toFixed(1);
      return `${km}km away`;
    }
  }
}