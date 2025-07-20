import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for auth routes and static files
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next()
  }

  // Protected routes that require authentication
  const protectedRoutes = ['/admin', '/dashboard', '/venues/manage']
  const adminRoutes = ['/admin', '/dashboard/admin']
  const venueOwnerRoutes = ['/venues/manage', '/dashboard']

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
  const isVenueOwnerRoute = venueOwnerRoutes.some(route => pathname.startsWith(route))

  // Get session cookie using Better Auth helper
  const sessionCookie = getSessionCookie(request)

  // Check authentication for protected routes
  if (isProtectedRoute) {
    if (!sessionCookie) {
      // No valid session, redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // For role-based routes, we still need to check roles via API
    // since getSessionCookie only checks cookie existence
    if (isAdminRoute || isVenueOwnerRoute) {
      try {
        const roleResponse = await fetch(`${request.nextUrl.origin}/api/auth/role`, {
          headers: {
            Cookie: request.headers.get('cookie') || '',
          },
        })

        if (roleResponse.ok) {
          const { role } = await roleResponse.json()
          
          if (isAdminRoute && !['admin', 'super_admin'].includes(role)) {
            return NextResponse.redirect(new URL('/unauthorized', request.url))
          }
          
          if (isVenueOwnerRoute && !['venue_owner', 'admin', 'super_admin'].includes(role)) {
            return NextResponse.redirect(new URL('/unauthorized', request.url))
          }
        } else {
          return NextResponse.redirect(new URL('/login', request.url))
        }
      } catch (roleError) {
        console.error('Role check error:', roleError)
        // Allow access but log the error - role will be checked again in the component
      }
    }
  }

  // Handle auth page redirects and root redirect
  const hasSession = !!sessionCookie

  // Redirect authenticated users away from auth pages
  if (hasSession && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect root to dashboard if authenticated, otherwise to login
  if (pathname === '/') {
    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}
