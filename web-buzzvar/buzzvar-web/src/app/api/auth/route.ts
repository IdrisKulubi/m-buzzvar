import { createServerSupabaseClient } from '@/lib/supabase'
import { getUserRole } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// Get current user session and role
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const userWithRole = await getUserRole(session.user.email!)
    
    // Get user profile information
    const { data: profile } = await supabase
      .from('users')
      .select('name, university, avatar_url')
      .eq('id', session.user.id)
      .single()

    const user = {
      ...userWithRole,
      name: profile?.name || session.user.user_metadata?.name || null,
      university: profile?.university || null,
      avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url || null
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error getting user session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Sign out user
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Signed out successfully' })
  } catch (error) {
    console.error('Error signing out:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}