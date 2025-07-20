'use client'

import { useAuth } from '@/hooks/useAuth'
import { VenueAnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return <AnalyticsPageSkeleton />
  }

  if (!user) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>
            Please log in to view analytics.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // For venue owners, show their venue analytics
  if (user.role === 'venue_owner' && user.venues && user.venues.length > 0) {
    const primaryVenue = user.venues[0] // Show analytics for the first venue
    
    return (
      <div className="p-6">
        <VenueAnalyticsDashboard 
          venueId={primaryVenue.venue_id} 
          venueName={primaryVenue.venue.name}
        />
      </div>
    )
  }

  // For admins, show platform analytics (will be implemented in task 7.2)
  if (user.role === 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Analytics</CardTitle>
            <CardDescription>
              Platform-wide analytics will be available here
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

  // For regular users, show message that analytics are not available
  return (
    <div className="p-6">
      <Alert>
        <AlertDescription>
          Analytics are only available for venue owners and administrators.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function AnalyticsPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}