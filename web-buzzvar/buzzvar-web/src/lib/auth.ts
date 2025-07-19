import { createServerSupabaseClient } from './supabase'
import { UserWithRole, UserRole } from './types'

// Admin email configuration - will be moved to environment variables
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || []

export async function getUserRole(userId: string, email: string): Promise<UserWithRole> {
  // Check if user is admin
  if (ADMIN_EMAILS.includes(email)) {
    return {
      id: userId,
      email,
      name: null,
      role: 'admin'
    }
  }

  const supabase = await createServerSupabaseClient()

  // Check if user owns any venues
  const { data: venueOwnership, error } = await supabase
    .from('venue_owners')
    .select(`
      id,
      venue_id,
      role,
      venue:venues(*)
    `)
    .eq('user_id', userId)

  if (error) {
    console.error('Error fetching venue ownership:', error)
  }

  if (venueOwnership && venueOwnership.length > 0) {
    return {
      id: userId,
      email,
      name: null,
      role: 'venue_owner',
      venues: venueOwnership as any
    }
  }

  return {
    id: userId,
    email,
    name: null,
    role: 'user'
  }
}

export async function getCurrentUser(): Promise<UserWithRole | null> {
  const supabase = await createServerSupabaseClient()
  
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session?.user) {
    return null
  }

  const userRole = await getUserRole(session.user.id, session.user.email!)
  
  // Get user profile information
  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', session.user.id)
    .single()

  return {
    ...userRole,
    name: profile?.name || null
  }
}

export function isAdmin(userRole: UserWithRole): boolean {
  return userRole.role === 'admin'
}

export function isVenueOwner(userRole: UserWithRole): boolean {
  return userRole.role === 'venue_owner'
}

export function canAccessVenue(userRole: UserWithRole, venueId: string): boolean {
  if (isAdmin(userRole)) {
    return true
  }
  
  if (isVenueOwner(userRole) && userRole.venues) {
    return userRole.venues.some(venue => venue.venue_id === venueId)
  }
  
  return false
}