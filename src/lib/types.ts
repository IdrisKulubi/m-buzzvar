import { Database } from './supabase'

// Base types from database
export type User = Database['public']['Tables']['users']['Row']
export type Venue = Database['public']['Tables']['venues']['Row']
export type VibeCheck = Database['public']['Tables']['vibe_checks']['Row']

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