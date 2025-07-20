import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { 
  DailyStatsChart, 
  BusynessChart, 
  PeakHoursChart, 
  MetricCard,
  GrowthChart,
  EngagementMetricsChart,
  HourlyBusynessRadar
} from '@/components/analytics/Charts'
import { DailyStats, HourlyStats, GrowthData, EngagementData } from '@/lib/types'

// Mock Recharts components to avoid canvas rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  RadarChart: ({ children }: any) => <div data-testid="radar-chart">{children}</div>,
  Radar: () => <div data-testid="radar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: () => <div data-testid="polar-angle-axis" />,
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />
}))

describe('Analytics Charts', () => {
  const mockDailyStats: DailyStats[] = [
    { date: '2024-01-01', views: 10, vibe_checks: 5, avg_busyness: 3.5 },
    { date: '2024-01-02', views: 15, vibe_checks: 8, avg_busyness: 4.0 },
    { date: '2024-01-03', views: 12, vibe_checks: 6, avg_busyness: 3.2 }
  ]

  const mockHourlyStats: HourlyStats[] = [
    { hour: 9, activity_count: 5, avg_busyness: 2.5 },
    { hour: 12, activity_count: 15, avg_busyness: 4.0 },
    { hour: 18, activity_count: 20, avg_busyness: 4.5 },
    { hour: 22, activity_count: 10, avg_busyness: 3.0 }
  ]

  const mockGrowthData: GrowthData[] = [
    { date: '2024-01-01', count: 5 },
    { date: '2024-01-02', count: 8 },
    { date: '2024-01-03', count: 12 }
  ]

  const mockEngagementData: EngagementData[] = [
    { metric: 'Vibe Checks', value: 150, change: 12.5 },
    { metric: 'Venue Views', value: 300, change: 8.1 }
  ]

  describe('DailyStatsChart', () => {
    it('should render daily stats chart with correct title', () => {
      render(<DailyStatsChart data={mockDailyStats} title="Test Daily Stats" />)
      
      expect(screen.getByText('Test Daily Stats')).toBeInTheDocument()
      expect(screen.getByText('Views and vibe checks over time')).toBeInTheDocument()
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('should render with default title when not provided', () => {
      render(<DailyStatsChart data={mockDailyStats} />)
      
      expect(screen.getByText('Daily Activity')).toBeInTheDocument()
    })
  })

  describe('BusynessChart', () => {
    it('should render busyness chart with correct elements', () => {
      render(<BusynessChart data={mockDailyStats} title="Test Busyness" />)
      
      expect(screen.getByText('Test Busyness')).toBeInTheDocument()
      expect(screen.getByText('Average busyness rating over time')).toBeInTheDocument()
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })
  })

  describe('PeakHoursChart', () => {
    it('should render peak hours chart with correct elements', () => {
      render(<PeakHoursChart data={mockHourlyStats} title="Test Peak Hours" />)
      
      expect(screen.getByText('Test Peak Hours')).toBeInTheDocument()
      expect(screen.getByText('Activity levels throughout the day')).toBeInTheDocument()
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  describe('GrowthChart', () => {
    it('should render growth chart with custom color', () => {
      render(<GrowthChart data={mockGrowthData} title="User Growth" color="#ff0000" />)
      
      expect(screen.getByText('User Growth')).toBeInTheDocument()
      expect(screen.getByText('Growth trend over the last 30 days')).toBeInTheDocument()
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })
  })

  describe('EngagementMetricsChart', () => {
    it('should render engagement metrics pie chart', () => {
      render(<EngagementMetricsChart data={mockEngagementData} />)
      
      expect(screen.getByText('Engagement Metrics')).toBeInTheDocument()
      expect(screen.getByText('Current engagement levels')).toBeInTheDocument()
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })
  })

  describe('HourlyBusynessRadar', () => {
    it('should render hourly busyness radar chart', () => {
      render(<HourlyBusynessRadar data={mockHourlyStats} />)
      
      expect(screen.getByText('Hourly Busyness Pattern')).toBeInTheDocument()
      expect(screen.getByText('Busyness patterns throughout the day')).toBeInTheDocument()
      expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
    })
  })

  describe('MetricCard', () => {
    it('should render metric card with all props', () => {
      render(
        <MetricCard
          title="Test Metric"
          value="1,234"
          change={15.5}
          description="Test description"
          icon={<div data-testid="test-icon" />}
        />
      )
      
      expect(screen.getByText('Test Metric')).toBeInTheDocument()
      expect(screen.getByText('1,234')).toBeInTheDocument()
      expect(screen.getByText('15.5% from last period')).toBeInTheDocument()
      expect(screen.getByText('Test description')).toBeInTheDocument()
      expect(screen.getByTestId('test-icon')).toBeInTheDocument()
    })

    it('should show positive change indicator', () => {
      render(<MetricCard title="Test" value="100" change={10.5} />)
      
      expect(screen.getByText('↗')).toBeInTheDocument()
      expect(screen.getByText('10.5% from last period')).toBeInTheDocument()
    })

    it('should show negative change indicator', () => {
      render(<MetricCard title="Test" value="100" change={-5.2} />)
      
      expect(screen.getByText('↘')).toBeInTheDocument()
      expect(screen.getByText('5.2% from last period')).toBeInTheDocument()
    })

    it('should render without change when not provided', () => {
      render(<MetricCard title="Test" value="100" />)
      
      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.queryByText(/% from last period/)).not.toBeInTheDocument()
    })
  })
})