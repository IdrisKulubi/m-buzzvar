// Database services using direct PostgreSQL connections via Drizzle ORM
// These services replace Supabase client calls with type-safe database operations

export { PromotionService, promotionService } from './promotion-service'
export { VenueService, venueService } from './venue-service'
export { AnalyticsService, analyticsService } from './analytics-service'
export { AdminService, adminService } from './admin-service'

// Re-export types for convenience
export type {
  PromotionFormData,
  PromotionFilters,
  PromotionWithStatus
} from './promotion-service'

export type {
  VenueFormData,
  VenueFilters,
  VenueWithAnalytics
} from './venue-service'

export type {
  DailyStats,
  HourlyStats,
  PlatformAnalytics,
  VenueAnalyticsData
} from './analytics-service'

export type {
  UserFilters,
  VenueFilters as AdminVenueFilters,
  UserManagement,
  GrowthData,
  EngagementData
} from './admin-service'