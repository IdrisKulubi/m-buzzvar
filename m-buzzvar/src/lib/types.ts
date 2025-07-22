// Base types from standalone database
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'user' | 'venue_owner' | 'admin' | 'super_admin';
  university?: string;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  owner_id: string;
  cover_image_url?: string;
  hours?: string;
  contact?: string;
  average_rating?: number;
  review_count?: number;
  promotions?: Promotion[];
  created_at: string;
  updated_at: string;
}

export interface VibeCheck {
  id: string;
  user_id: string;
  venue_id: string;
  rating: number;
  comment?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id: string;
  venue_id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Core vibe check interface
export interface VibeCheckWithDetails extends VibeCheck {
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  venue: {
    id: string;
    name: string;
    address?: string;
  };
  time_ago: string; // "2 minutes ago"
  is_recent: boolean; // within last 2 hours
}

// Venue with vibe check summary
export interface VenueWithVibeCheck extends Venue {
  latest_vibe_check?: VibeCheckWithDetails;
  recent_vibe_count: number;
  average_recent_busyness?: number;
  has_live_activity: boolean;
}

// Form data for creating vibe checks
export interface VibeCheckFormData {
  venue_id: string;
  busyness_rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  photo?: {
    uri: string;
    type: string;
    name: string;
  };
}

// Location verification result
export interface LocationVerification {
  is_valid: boolean;
  distance_meters: number;
  venue_name: string;
}

// Busyness rating labels
export const BUSYNESS_LABELS = {
  1: 'Dead',
  2: 'Quiet', 
  3: 'Moderate',
  4: 'Busy',
  5: 'Packed'
} as const;

export type BusynessRating = keyof typeof BUSYNESS_LABELS;

// Real-time subscription types
export interface RealtimeVibeCheckEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  vibeCheck?: VibeCheckWithDetails;
  vibeCheckId?: string;
}

export interface RealtimeSubscriptionCallbacks {
  onVibeCheckInsert?: (vibeCheck: VibeCheckWithDetails) => void;
  onVibeCheckUpdate?: (vibeCheck: VibeCheckWithDetails) => void;
  onVibeCheckDelete?: (vibeCheckId: string) => void;
  onError?: (error: any) => void;
}