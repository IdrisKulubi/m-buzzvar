import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key)
  },
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Database types (will be generated from Supabase)
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
      party_groups: {
        Row: {
          id: string
          name: string
          venue_id: string
          date: string
          time: string
          max_size: number
          creator_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          venue_id: string
          date: string
          time: string
          max_size: number
          creator_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          venue_id?: string
          date?: string
          time?: string
          max_size?: number
          creator_id?: string
          created_at?: string
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          approved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          approved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          approved?: boolean
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          group_id: string
          sender_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          sender_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          sender_id?: string
          content?: string
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
    }
  }
} 