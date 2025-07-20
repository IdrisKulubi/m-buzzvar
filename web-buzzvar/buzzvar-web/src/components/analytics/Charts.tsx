'use client'

import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DailyStats, HourlyStats, GrowthData, EngagementData } from '@/lib/types'

interface DailyStatsChartProps {
  data: DailyStats[]
  title?: string
}

export function DailyStatsChart({ data, title = "Daily Activity" }: DailyStatsChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Views and vibe checks over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value, name) => [value, name === 'views' ? 'Views' : 'Vibe Checks']}
            />
            <Line 
              type="monotone" 
              dataKey="views" 
              stroke="#8884d8" 
              strokeWidth={2}
              dot={{ fill: '#8884d8' }}
            />
            <Line 
              type="monotone" 
              dataKey="vibe_checks" 
              stroke="#82ca9d" 
              strokeWidth={2}
              dot={{ fill: '#82ca9d' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface BusynessChartProps {
  data: DailyStats[]
  title?: string
}

export function BusynessChart({ data, title = "Average Busyness" }: BusynessChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Average busyness rating over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis domain={[0, 5]} />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value) => [Number(value).toFixed(1), 'Average Busyness']}
            />
            <Area 
              type="monotone" 
              dataKey="avg_busyness" 
              stroke="#ffc658" 
              fill="#ffc658" 
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface PeakHoursChartProps {
  data: HourlyStats[]
  title?: string
}

export function PeakHoursChart({ data, title = "Peak Hours Analysis" }: PeakHoursChartProps) {
  const formattedData = data.map(item => ({
    ...item,
    hour_label: `${item.hour}:00`
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Activity levels throughout the day</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour_label" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => [
                value, 
                name === 'activity_count' ? 'Activity Count' : 'Avg Busyness'
              ]}
            />
            <Bar dataKey="activity_count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface GrowthChartProps {
  data: GrowthData[]
  title?: string
  color?: string
}

export function GrowthChart({ data, title = "Growth Over Time", color = "#8884d8" }: GrowthChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Growth trend over the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value) => [value, 'Count']}
            />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke={color} 
              fill={color} 
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface EngagementMetricsProps {
  data: EngagementData[]
  title?: string
}

export function EngagementMetricsChart({ data, title = "Engagement Metrics" }: EngagementMetricsProps) {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Current engagement levels</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ metric, value }) => `${metric}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface HourlyBusynessRadarProps {
  data: HourlyStats[]
  title?: string
}

export function HourlyBusynessRadar({ data, title = "Hourly Busyness Pattern" }: HourlyBusynessRadarProps) {
  const radarData = data.map(item => ({
    hour: `${item.hour}:00`,
    busyness: item.avg_busyness,
    activity: item.activity_count
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Busyness patterns throughout the day</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="hour" />
            <PolarRadiusAxis domain={[0, 5]} />
            <Radar
              name="Average Busyness"
              dataKey="busyness"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface MetricCardProps {
  title: string
  value: number | string
  change?: number
  description?: string
  icon?: React.ReactNode
}

export function MetricCard({ title, value, change, description, icon }: MetricCardProps) {
  const changeColor = change && change > 0 ? 'text-green-600' : change && change < 0 ? 'text-red-600' : 'text-gray-600'
  const changeIcon = change && change > 0 ? '↗' : change && change < 0 ? '↘' : '→'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={`text-xs ${changeColor} flex items-center gap-1`}>
            <span>{changeIcon}</span>
            {Math.abs(change).toFixed(1)}% from last period
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}