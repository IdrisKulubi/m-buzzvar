import { createMiddlewareClient } from '@/lib/supabase'
import { getUserRole } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { supabase, response } = await createMiddlewareClient(req)

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect dashboard routes
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Admin route protection
    if (req.nextUrl.pathname.startsWith('/dashboard/admin')) {
      try {
        const userRole = await getUserRole(session.user.id, session.user.email!)
        if (userRole.role !== 'admin') {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      } catch (error) {
        console.error('Error checking user role:', error)
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  }

  // Redirect authenticated users away from auth pages
  if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Redirect root to dashboard if authenticated, otherwise to login
  if (req.nextUrl.pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    } else {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/login',
    '/register'
  ]
}