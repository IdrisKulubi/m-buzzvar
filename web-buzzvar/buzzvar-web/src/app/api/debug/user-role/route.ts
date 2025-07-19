import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getUserRole } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session?.user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        session: null,
        adminEmails: process.env.ADMIN_EMAILS?.split(',') || []
      }, { status: 401 })
    }

    const userWithRole = await getUserRole(session.user.email!)
    
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        role: userWithRole.role
      },
      adminEmails: process.env.ADMIN_EMAILS?.split(',') || [],
      isAdmin: userWithRole.role === 'admin',
      session: {
        expires_at: session.expires_at,
        user_metadata: session.user.user_metadata
      }
    })
  } catch (error) {
    console.error('Error getting user role debug info:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}