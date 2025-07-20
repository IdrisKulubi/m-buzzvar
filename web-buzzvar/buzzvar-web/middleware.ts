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
  const venueOwnerRoutes = ['/venues/manage']

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route))
  const isVenueOwnerRoute = venueOwnerRoutes.some(route => pathname.startsWith(route))
  
  // Check if it's a general dashboard route (not admin-specific)
  const isGeneralDashboard = pathname === '/dashboard' || (pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/admin'))

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
          const roleData = await roleResponse.json()
          const { role } = roleData
          
          console.log(`Middleware role check for ${pathname}:`, {
            role,
            isAdminRoute,
            isVenueOwnerRoute,
            isGeneralDashboard,
            roleData
          })
          
          if (isAdminRoute && !['admin', 'super_admin'].includes(role)) {
            console.log(`Access denied to admin route ${pathname} for role: ${role}`)
            return NextResponse.redirect(new URL('/unauthorized', request.url))
          }
          
          if (isVenueOwnerRoute && !['venue_owner', 'admin', 'super_admin'].includes(role)) {
            console.log(`Access denied to venue owner route ${pathname} for role: ${role}`)
            return NextResponse.redirect(new URL('/unauthorized', request.url))
          }
          
          console.log(`Access granted to ${pathname} for role: ${role}`)
        } else {
          console.log(`Role API failed with status: ${roleResponse.status}`)
          return NextResponse.redirect(new URL('/login', request.url))
        }
      } catch (roleError) {
        console.error('Role check error:', roleError)
        // Allow access but log the error - role will be checked again in the component
      }
    }
    
    // General dashboard routes are accessible to all authenticated users
    // No additional role check needed for /dashboard (but not /dashboard/admin)
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
