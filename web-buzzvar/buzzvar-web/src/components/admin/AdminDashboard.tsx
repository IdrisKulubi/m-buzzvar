'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  Users, 
  Building2, 
  MessageSquare, 
  Megaphone, 
  TrendingUp, 
  TrendingDown,
  Download,
  RefreshCw,
  Activity,
  Database,
  Server,
  HardDrive,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { PlatformAnalytics, EngagementData } from '@/lib/types'
import { toast } from 'sonner'

interface SystemHealth {
  database: {
    status: 'healthy' | 'slow' | 'error'
    response_time: number
    active_connections: number
  }
  api: {
    status: 'healthy' | 'degraded' | 'error'
    error_rate: number
    uptime: number
  }
  storage: {
    status: 'healthy' | 'warning' | 'error'
    usage_percent: number
    total_size: string
  }
}

interface RealTimeMetrics {
  vibe_checks_last_hour: number
  views_last_hour: number
  new_users_last_hour: number
  timestamp: string
}

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics?type=platform')
      if (!response.ok) throw new Error('Failed to fetch analytics')
      const result = await response.json()
      setAnalytics(result.data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load platform analytics')
    }
  }

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/analytics?type=system-health')
      if (!response.ok) throw new Error('Failed to fetch system health')
      const result = await response.json()
      setSystemHealth(result.data)
    } catch (error) {
      console.error('Error fetching system health:', error)
      toast.error('Failed to load system health metrics')
    }
  }

  const fetchRealTimeMetrics = async () => {
    try {
      const response = await fetch('/api/analytics?type=real-time')
      if (!response.ok) throw new Error('Failed to fetch real-time metrics')
      const result = await response.json()
      setRealTimeMetrics(result.data)
    } catch (error) {
      console.error('Error fetching real-time metrics:', error)
    }
  }

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const response = await fetch(`/api/analytics/export?type=platform&format=${format}`)
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `platform-analytics-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Analytics exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export analytics')
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchAnalytics(),
      fetchSystemHealth(),
      fetchRealTimeMetrics()
    ])
    setRefreshing(false)
    toast.success('Dashboard refreshed')
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchAnalytics(),
        fetchSystemHealth(),
        fetchRealTimeMetrics()
      ])
      setLoading(false)
    }

    loadData()

    // Set up real-time updates every 30 seconds
    const interval = setInterval(fetchRealTimeMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': case 'slow': case 'degraded': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': case 'slow': case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const formatChange = (change: number) => {
    const isPositive = change >= 0
    return (
      <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
        {Math.abs(change).toFixed(1)}%
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of platform performance and user engagement
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('json')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      {realTimeMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Live Activity (Last Hour)
            </CardTitle>
            <CardDescription>
              Updated: {new Date(realTimeMetrics.timestamp).toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {realTimeMetrics.vibe_checks_last_hour}
                </div>
                <div className="text-sm text-muted-foreground">Vibe Checks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {realTimeMetrics.views_last_hour}
                </div>
                <div className="text-sm text-muted-foreground">Venue Views</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {realTimeMetrics.new_users_last_hour}
                </div>
                <div className="text-sm text-muted-foreground">New Users</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="growth">Growth Trends</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics Cards */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.total_users.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    +{analytics.new_users_week} this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Venues</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.total_venues.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    +{analytics.new_venues_week} this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vibe Checks</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.total_vibe_checks.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    +{analytics.new_vibe_checks_week} this week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Promotions</CardTitle>
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.total_promotions.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Platform-wide promotions
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="growth" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Growth Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>User Growth (Last 90 Days)</CardTitle>
                  <CardDescription>Daily new user registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.user_growth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Venue Growth Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Venue Growth (Last 90 Days)</CardTitle>
                  <CardDescription>Daily new venue registrations</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.venue_growth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          {analytics?.engagement_metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {analytics.engagement_metrics.map((metric) => (
                <Card key={metric.metric}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{metric.metric}</CardTitle>
                    {formatChange(metric.change)}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.value.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Last 7 days vs previous 7 days
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          {systemHealth && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Database Health */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Database</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <div className="flex items-center">
                      {getStatusIcon(systemHealth.database.status)}
                      <span className={`ml-2 text-sm capitalize ${getStatusColor(systemHealth.database.status)}`}>
                        {systemHealth.database.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Response Time</span>
                    <span className="text-sm font-medium">{systemHealth.database.response_time}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Connections</span>
                    <span className="text-sm font-medium">{systemHealth.database.active_connections}</span>
                  </div>
                </CardContent>
              </Card>

              {/* API Health */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">API</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <div className="flex items-center">
                      {getStatusIcon(systemHealth.api.status)}
                      <span className={`ml-2 text-sm capitalize ${getStatusColor(systemHealth.api.status)}`}>
                        {systemHealth.api.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Rate</span>
                    <span className="text-sm font-medium">{systemHealth.api.error_rate.toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Uptime</span>
                    <span className="text-sm font-medium">{systemHealth.api.uptime}%</span>
                  </div>
                </CardContent>
              </Card>

              {/* Storage Health */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Storage</CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <div className="flex items-center">
                      {getStatusIcon(systemHealth.storage.status)}
                      <span className={`ml-2 text-sm capitalize ${getStatusColor(systemHealth.storage.status)}`}>
                        {systemHealth.storage.status}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Usage</span>
                      <span className="text-sm font-medium">{systemHealth.storage.usage_percent}%</span>
                    </div>
                    <Progress value={systemHealth.storage.usage_percent} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Size</span>
                    <span className="text-sm font-medium">{systemHealth.storage.total_size}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}