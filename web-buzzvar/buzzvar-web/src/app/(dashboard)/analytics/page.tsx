import { redirect } from 'next/navigation'
import { auth, getUserRole, isVenueOwner, isAdmin } from '@/lib/auth/better-auth-server'
import { headers } from 'next/headers'
import { VenueAnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { promotionService } from '@/lib/database/services'

export default async function AnalyticsPage() {
  // Get session on server side
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect('/login')
  }

  const userRole = await getUserRole(session.user.id)
  const userIsAdmin = await isAdmin(session.user.id)
  const userIsVenueOwner = await isVenueOwner(session.user.id)

  // For venue owners, show their venue analytics
  if (userIsVenueOwner && !userIsAdmin) {
    const venues = await promotionService.getUserVenues(session.user.id)
    
    if (venues.length > 0) {
      const primaryVenue = venues[0] // Show analytics for the first venue
      
      return (
        <div className="p-6">
          <VenueAnalyticsDashboard 
            venueId={primaryVenue.id} 
            venueName={primaryVenue.name}
          />
        </div>
      )
    }
  }

  // For admins, show platform analytics
  if (userIsAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Analytics</CardTitle>
            <CardDescription>
              Platform-wide analytics dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Platform analytics dashboard will be implemented in the next phase.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // For regular users or venue owners without venues
  return (
    <div className="p-6">
      <Alert>
        <AlertDescription>
          {userIsVenueOwner 
            ? 'No venues found. Please register your venue first to view analytics.'
            : 'Analytics are only available for venue owners and administrators.'
          }
        </AlertDescription>
      </Alert>
    </div>
  )
}

