import { createServerSupabaseClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const next = searchParams.get('next') ?? '/'

  console.log('Auth callback received:', { code: !!code, error, origin }) // Debug log

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}`)
  }

  if (code) {
    try {
      const supabase = await createServerSupabaseClient()
      
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(exchangeError.message)}`)
      }

      if (data.session) {
        console.log('Successfully authenticated user:', data.user?.email)
        
        // Create the redirect response
        const redirectUrl = `${origin}${next}`
        console.log('Redirecting to:', redirectUrl)
        
        return NextResponse.redirect(redirectUrl)
      }
    } catch (err) {
      console.error('Unexpected error in auth callback:', err)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=unexpected_error`)
    }
  }

  // No code provided
  console.error('No authorization code provided')
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code`)
}