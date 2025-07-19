// Database types based on Supabase schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string | null
          email: string
          university: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          email: string
          university?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string
          university?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      venues: {
        Row: {
          id: string
          name: string
          description: string | null
          location: string | null
          contact: string | null
          hours: string | null
          cover_image_url: string | null
          cover_video_url: string | null
          latitude: number | null
          longitude: number | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          location?: string | null
          contact?: string | null
          hours?: string | null
          cover_image_url?: string | null
          cover_video_url?: string | null
          latitude?: number | null
          longitude?: number | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          location?: string | null
          contact?: string | null
          hours?: string | null
          cover_image_url?: string | null
          cover_video_url?: string | null
          latitude?: number | null
          longitude?: number | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      promotions: {
        Row: {
          id: string
          venue_id: string
          title: string
          description: string
          start_date: string
          end_date: string
          days_of_week: number[]
          start_time: string | null
          end_time: string | null
          promotion_type: 'discount' | 'event' | 'special' | 'happy_hour'
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          title: string
          description: string
          start_date: string
          end_date: string
          days_of_week: number[]
          start_time?: string | null
          end_time?: string | null
          promotion_type: 'discount' | 'event' | 'special' | 'happy_hour'
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          venue_id?: string
          title?: string
          description?: string
          start_date?: string
          end_date?: string
          days_of_week?: number[]
          start_time?: string | null
          end_time?: string | null
          promotion_type?: 'discount' | 'event' | 'special' | 'happy_hour'
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      venue_owners: {
        Row: {
          id: string
          user_id: string
          venue_id: string
          role: 'owner' | 'manager' | 'staff'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          venue_id: string
          role?: 'owner' | 'manager' | 'staff'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          venue_id?: string
          role?: 'owner' | 'manager' | 'staff'
          created_at?: string
        }
      }
      vibe_checks: {
        Row: {
          id: string
          venue_id: string
          user_id: string
          busyness_rating: 1 | 2 | 3 | 4 | 5
          comment: string | null
          photo_url: string | null
          user_latitude: number
          user_longitude: number
          created_at: string
        }
        Insert: {
          id?: string
          venue_id: string
          user_id: string
          busyness_rating: 1 | 2 | 3 | 4 | 5
          comment?: string | null
          photo_url?: string | null
          user_latitude: number
          user_longitude: number
          created_at?: string
        }
        Update: {
          id?: string
          venue_id?: string
          user_id?: string
          busyness_rating?: 1 | 2 | 3 | 4 | 5
          comment?: string | null
          photo_url?: string | null
          user_latitude?: number
          user_longitude?: number
          created_at?: string
        }
      }
      user_bookmarks: {
        Row: {
          id: string
          user_id: string
          venue_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          venue_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          venue_id?: string
          created_at?: string
        }
      }
      club_views: {
        Row: {
          id: string
          user_id: string
          club_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          club_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          club_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      venue_analytics: {
        Row: {
          venue_id: string
          venue_name: string
          total_views: number
          total_bookmarks: number
          total_vibe_checks: number
          avg_busyness_rating: number
          recent_vibe_checks: number
          recent_views: number
        }
      }
      platform_analytics: {
        Row: {
          total_users: number
          total_venues: number
          total_vibe_checks: number
          total_promotions: number
          new_users_week: number
          new_venues_week: number
          new_vibe_checks_week: number
        }
      }
    }
  }
}

// Application-specific types
export type UserRole = 'venue_owner' | 'admin' | 'user'

export interface UserWithRole {
  id: string
  email: string
  name: string | null
  role: UserRole
  venues?: VenueOwnership[]
  university?: string | null
  avatar_url?: string | null
}

export interface VenueOwnership {
  id: string
  venue_id: string
  role: 'owner' | 'manager' | 'staff'
  venue: Database['public']['Tables']['venues']['Row']
}

// Form data types
export interface VenueFormData {
  name: string
  description?: string
  address?: string
  latitude?: number
  longitude?: number
  hours?: string
  contact?: string
  cover_image?: File
  cover_video?: File
}

export interface PromotionFormData {
  title: string
  description: string
  start_date: string
  end_date: string
  days_of_week: number[]
  start_time?: string
  end_time?: string
  promotion_type: 'discount' | 'event' | 'special' | 'happy_hour'
  image?: File
}

// Analytics types
export interface VenueAnalytics {
  venue_id: string
  venue_name: string
  total_views: number
  total_bookmarks: number
  total_vibe_checks: number
  avg_busyness_rating: number
  recent_vibe_checks: number
  recent_views: number
  daily_stats?: DailyStats[]
  peak_hours?: HourlyStats[]
}

export interface DailyStats {
  date: string
  views: number
  vibe_checks: number
  avg_busyness: number
}

export interface HourlyStats {
  hour: number
  activity_count: number
  avg_busyness: number
}

export interface PlatformAnalytics {
  total_users: number
  total_venues: number
  total_vibe_checks: number
  total_promotions: number
  new_users_week: number
  new_venues_week: number
  new_vibe_checks_week: number
  user_growth?: GrowthData[]
  venue_growth?: GrowthData[]
  engagement_metrics?: EngagementData[]
}

export interface GrowthData {
  date: string
  count: number
}

export interface EngagementData {
  metric: string
  value: number
  change: number
}

export interface UserManagement {
  id: string
  name: string | null
  email: string
  university: string | null
  created_at: string
  last_active?: string
  total_vibe_checks: number
  total_bookmarks: number
  status: 'active' | 'suspended' | 'deleted'
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
  total_pages: number
}

// Filter types
export interface UserFilters {
  search?: string
  university?: string
  status?: 'active' | 'suspended' | 'deleted'
  created_after?: string
  created_before?: string
}

export interface VenueFilters {
  search?: string
  location?: string
  has_promotions?: boolean
  created_after?: string
  created_before?: string
}

export interface PromotionFilters {
  venue_id?: string
  type?: 'discount' | 'event' | 'special' | 'happy_hour'
  is_active?: boolean
  start_date?: string
  end_date?: string
}