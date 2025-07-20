import { venueService, analyticsService, type VenueFormData, type VenueFilters, type VenueWithAnalytics } from '@/lib/database/services'
import type { Venue } from '@/lib/database/schema'

export class VenueService {
  static async getVenues(filters?: VenueFilters, limit: number = 50, offset: number = 0): Promise<VenueWithAnalytics[]> {
    return await venueService.getVenues(filters, limit, offset)
  }

  static async getVenueById(id: string): Promise<VenueWithAnalytics | null> {
    return await venueService.getVenueById(id)
  }

  static async getVenueBySlug(slug: string): Promise<VenueWithAnalytics | null> {
    return await venueService.getVenueBySlug(slug)
  }

  static async createVenue(data: VenueFormData): Promise<Venue> {
    return await venueService.createVenue(data)
  }

  static async updateVenue(id: string, data: Partial<VenueFormData>): Promise<Venue> {
    return await venueService.updateVenue(id, data)
  }

  static async deleteVenue(id: string): Promise<void> {
    return await venueService.deleteVenue(id)
  }

  static async getVenuesByOwner(ownerId: string): Promise<Venue[]> {
    return await venueService.getVenuesByOwner(ownerId)
  }

  static async searchVenuesNearby(
    latitude: number, 
    longitude: number, 
    radiusKm: number = 10,
    filters?: VenueFilters,
    limit: number = 50
  ): Promise<VenueWithAnalytics[]> {
    return await venueService.searchVenuesNearby(latitude, longitude, radiusKm, filters, limit)
  }

  static async getVenueAnalytics(id: string, days: number = 30) {
    return await venueService.getVenueAnalytics(id, days)
  }

  static async incrementVenueView(venueId: string, isUnique: boolean = false): Promise<void> {
    return await venueService.incrementVenueView(venueId, isUnique)
  }

  static async getVenueStats(venueId: string) {
    return await venueService.getVenueStats(venueId)
  }

  static async toggleVenueVerification(venueId: string, isVerified: boolean): Promise<Venue> {
    return await venueService.toggleVenueVerification(venueId, isVerified)
  }

  static async getVenueTypes(): Promise<string[]> {
    return await venueService.getVenueTypes()
  }

  static async getVenueCities(): Promise<string[]> {
    return await venueService.getVenueCities()
  }

  static async uploadVenueMedia(
    venueId: string,
    file: File,
    type: "image" | "video"
  ): Promise<string> {
    const { FileUploadService } = await import('@/lib/services/file-upload-service')
    
    // Upload file to R2 with venue prefix
    const result = await FileUploadService.uploadFile(
      file,
      venueId, // Use venueId as userId for organization
      'venues', // Prefix for venue files
      {
        maxSizeMB: type === 'video' ? 50 : 10, // Larger limit for videos
        allowedTypes: type === 'video' 
          ? ['video/mp4', 'video/webm', 'video/quicktime']
          : ['image/jpeg', 'image/png', 'image/webp'],
        quality: 0.8,
      }
    )

    if (!result.success || !result.url) {
      throw new Error(result.error || 'Failed to upload media')
    }

    return result.url
  }
}