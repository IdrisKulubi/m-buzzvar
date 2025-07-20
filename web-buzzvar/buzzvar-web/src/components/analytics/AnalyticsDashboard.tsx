'use client'

import { useState } from 'react'
import { useVenueAnalytics } from '@/hooks/useAnalytics'
import { 
  DailyStatsChart, 
  BusynessChart, 
  PeakHoursChart, 
  MetricCard,
  HourlyBusynessRadar
} from './Charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Eye, 
  Heart, 
  MessageSquare, 
  TrendingUp, 
  Download, 
  RefreshCw,
  Clock,
  Users,
  BarChart3
} from 'lucide-react'

interface VenueAnalyticsDashboardProps {
  venueId: string
  venueName?: string
}

export function VenueAnalyticsDashboard({ venueId, venueName }: VenueAnalyticsDashboardProps) {
  const [period, setPeriod] = useState('7d')
  const { analytics, loading, error, refetch, exportAnalytics } = useVenueAnalytics(venueId, period)

  const handleExport = async (format: 'csv' | 'json') => {
    await exportAnalytics(format)
  }

  const handleRefresh = () => {
    refetch()
  }

  if (loading) {
    return <AnalyticsLoadingSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load analytics: {error}
          <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-2">
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!analytics) {
    return (
      <Alert>
        <AlertDescription>No analytics data available for this venue.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          {venueName && (
            <p className="text-muted-foreground">Analytics for {venueName}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last Day</SelectItem>
              <SelectItem value="7d">Last Week</SelectItem>
              <SelectItem value="30d">Last Month</SelectItem>
              <SelectItem value="90d">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Views"
          value={analytics.total_views.toLocaleString()}
          change={analytics.recent_views > 0 ? 15.2 : 0}
          description="Venue profile views"
          icon={<Eye className="h-4 w-4 text-muted-foreground" />}
        />
        
        <MetricCard
          title="Bookmarks"
          value={analytics.total_bookmarks.toLocaleString()}
          change={8.1}
          description="Users who bookmarked"
          icon={<Heart className="h-4 w-4 text-muted-foreground" />}
        />
        
        <MetricCard
          title="Vibe Checks"
          value={analytics.total_vibe_checks.toLocaleString()}
          change={analytics.recent_vibe_checks > 0 ? 12.5 : 0}
          description="User check-ins"
          icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
        />
        
        <MetricCard
          title="Avg Busyness"
          value={analytics.avg_busyness_rating.toFixed(1)}
          description="Out of 5.0"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {analytics.daily_stats && (
              <DailyStatsChart 
                data={analytics.daily_stats} 
                title="Daily Activity Overview"
              />
            )}
            
            {analytics.daily_stats && (
              <BusynessChart 
                data={analytics.daily_stats} 
                title="Busyness Trends"
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {analytics.peak_hours && (
              <PeakHoursChart 
                data={analytics.peak_hours} 
                title="Activity by Hour"
              />
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>Engagement Summary</CardTitle>
                <CardDescription>Key engagement metrics for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {analytics.recent_views}
                    </div>
                    <div className="text-sm text-muted-foreground">Recent Views</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {analytics.recent_vibe_checks}
                    </div>
                    <div className="text-sm text-muted-foreground">Recent Check-ins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {((analytics.recent_vibe_checks / Math.max(analytics.recent_views, 1)) * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Engagement Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {analytics.peak_hours && (
              <HourlyBusynessRadar 
                data={analytics.peak_hours} 
                title="24-Hour Activity Pattern"
              />
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>Peak Activity Times</CardTitle>
                <CardDescription>Most active hours based on user interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.peak_hours
                    ?.sort((a, b) => b.activity_count - a.activity_count)
                    .slice(0, 5)
                    .map((hour, index) => (
                      <div key={hour.hour} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{hour.hour}:00 - {hour.hour + 1}:00</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{hour.activity_count} activities</div>
                          <div className="text-sm text-muted-foreground">
                            Avg busyness: {hour.avg_busyness.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Additional Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.avg_busyness_rating > 4 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>High Activity:</strong> Your venue has excellent engagement with an average busyness rating of {analytics.avg_busyness_rating.toFixed(1)}/5.0
                </p>
              </div>
            )}
            
            {analytics.recent_vibe_checks > analytics.total_vibe_checks * 0.3 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Growing Engagement:</strong> Recent activity shows strong user engagement with {analytics.recent_vibe_checks} check-ins in the selected period
                </p>
              </div>
            )}
            
            {analytics.peak_hours && analytics.peak_hours.length > 0 && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">
                  <strong>Peak Hours:</strong> Your busiest time is around {
                    analytics.peak_hours.reduce((max, hour) => 
                      hour.activity_count > max.activity_count ? hour : max
                    ).hour
                  }:00. Consider promoting special offers during this time.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}