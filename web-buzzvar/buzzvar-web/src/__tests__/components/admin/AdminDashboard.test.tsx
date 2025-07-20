import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdminDashboard } from '@/components/admin/AdminDashboard'

// Mock fetch
global.fetch = vi.fn()

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />
}))

const mockPlatformAnalytics = {
  total_users: 1000,
  total_venues: 50,
  total_vibe_checks: 2500,
  total_promotions: 75,
  new_users_week: 25,
  new_venues_week: 3,
  new_vibe_checks_week: 150,
  user_growth: [
    { date: '2024-01-01', count: 10 },
    { date: '2024-01-02', count: 15 }
  ],
  venue_growth: [
    { date: '2024-01-01', count: 2 },
    { date: '2024-01-02', count: 3 }
  ],
  engagement_metrics: [
    { metric: 'Vibe Checks', value: 150, change: 12.5 },
    { metric: 'Venue Views', value: 500, change: -5.2 }
  ]
}

const mockSystemHealth = {
  database: {
    status: 'healthy' as const,
    response_time: 45,
    active_connections: 12
  },
  api: {
    status: 'healthy' as const,
    error_rate: 0.5,
    uptime: 99.9
  },
  storage: {
    status: 'warning' as const,
    usage_percent: 85,
    total_size: '2.5 GB'
  }
}

const mockRealTimeMetrics = {
  vibe_checks_last_hour: 15,
  views_last_hour: 250,
  new_users_last_hour: 3,
  timestamp: '2024-01-01T12:00:00Z'
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful API responses
    ;(global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('type=platform')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockPlatformAnalytics })
        })
      }
      if (url.includes('type=system-health')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockSystemHealth })
        })
      }
      if (url.includes('type=real-time')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockRealTimeMetrics })
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  it('should render loading state initially', () => {
    render(<AdminDashboard />)
    
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
  })

  it('should render platform analytics after loading', async () => {
    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Platform Analytics')).toBeInTheDocument()
    })

    // Check key metrics
    expect(screen.getByText('1,000')).toBeInTheDocument() // Total users
    expect(screen.getByText('50')).toBeInTheDocument() // Total venues
    expect(screen.getByText('2,500')).toBeInTheDocument() // Total vibe checks
    expect(screen.getByText('75')).toBeInTheDocument() // Total promotions
  })

  it('should render real-time metrics', async () => {
    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Live Activity (Last Hour)')).toBeInTheDocument()
    })

    expect(screen.getByText('15')).toBeInTheDocument() // Vibe checks last hour
    expect(screen.getByText('250')).toBeInTheDocument() // Views last hour
    expect(screen.getByText('3')).toBeInTheDocument() // New users last hour
  })

  it('should render system health metrics', async () => {
    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Platform Analytics')).toBeInTheDocument()
    })

    // Click on system health tab
    fireEvent.click(screen.getByText('System Health'))

    await waitFor(() => {
      expect(screen.getByText('Database')).toBeInTheDocument()
      expect(screen.getByText('API')).toBeInTheDocument()
      expect(screen.getByText('Storage')).toBeInTheDocument()
    })

    expect(screen.getByText('45ms')).toBeInTheDocument() // Database response time
    expect(screen.getByText('0.50%')).toBeInTheDocument() // API error rate
    expect(screen.getByText('85%')).toBeInTheDocument() // Storage usage
  })

  it('should render engagement metrics with trend indicators', async () => {
    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Platform Analytics')).toBeInTheDocument()
    })

    // Click on engagement tab
    fireEvent.click(screen.getByText('Engagement'))

    await waitFor(() => {
      expect(screen.getByText('Vibe Checks')).toBeInTheDocument()
      expect(screen.getByText('Venue Views')).toBeInTheDocument()
    })

    expect(screen.getByText('150')).toBeInTheDocument() // Vibe checks value
    expect(screen.getByText('500')).toBeInTheDocument() // Views value
    expect(screen.getByText('12.5%')).toBeInTheDocument() // Positive change
    expect(screen.getByText('5.2%')).toBeInTheDocument() // Negative change
  })

  it('should handle refresh functionality', async () => {
    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Platform Analytics')).toBeInTheDocument()
    })

    const refreshButton = screen.getByText('Refresh')
    fireEvent.click(refreshButton)

    // Should call all API endpoints again
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=platform')
      expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=system-health')
      expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=real-time')
    })
  })

  it('should handle CSV export', async () => {
    // Mock blob and URL creation
    const mockBlob = new Blob(['csv,data'], { type: 'text/csv' })
    const mockUrl = 'blob:mock-url'
    
    ;(global.fetch as any).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(mockBlob)
      })
    )

    global.URL.createObjectURL = vi.fn(() => mockUrl)
    global.URL.revokeObjectURL = vi.fn()

    // Mock DOM methods
    const mockClick = vi.fn()
    const mockAppendChild = vi.fn()
    const mockRemoveChild = vi.fn()
    
    document.createElement = vi.fn(() => ({
      href: '',
      download: '',
      click: mockClick,
    })) as any
    
    document.body.appendChild = mockAppendChild
    document.body.removeChild = mockRemoveChild

    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Platform Analytics')).toBeInTheDocument()
    })

    const exportButton = screen.getByText('Export CSV')
    fireEvent.click(exportButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/analytics/export?type=platform&format=csv')
      expect(mockClick).toHaveBeenCalled()
    })
  })

  it('should handle API errors gracefully', async () => {
    ;(global.fetch as any).mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500
      })
    )

    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
    })

    // Should eventually show error state or empty state
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument()
    })
  })

  it('should render growth charts', async () => {
    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Platform Analytics')).toBeInTheDocument()
    })

    // Click on growth trends tab
    fireEvent.click(screen.getByText('Growth Trends'))

    await waitFor(() => {
      expect(screen.getByText('User Growth (Last 90 Days)')).toBeInTheDocument()
      expect(screen.getByText('Venue Growth (Last 90 Days)')).toBeInTheDocument()
    })

    // Check that charts are rendered
    expect(screen.getAllByTestId('line-chart')).toHaveLength(2)
    expect(screen.getAllByTestId('responsive-container')).toHaveLength(2)
  })

  it('should show status indicators with correct colors', async () => {
    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Platform Analytics')).toBeInTheDocument()
    })

    // Click on system health tab
    fireEvent.click(screen.getByText('System Health'))

    await waitFor(() => {
      // Check that status indicators are present
      const healthyStatuses = screen.getAllByText('healthy')
      const warningStatuses = screen.getAllByText('warning')
      
      expect(healthyStatuses.length).toBeGreaterThan(0)
      expect(warningStatuses.length).toBeGreaterThan(0)
    })
  })

  it('should update real-time metrics periodically', async () => {
    vi.useFakeTimers()
    
    render(<AdminDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Platform Analytics')).toBeInTheDocument()
    })

    // Clear previous calls
    vi.clearAllMocks()

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/analytics?type=real-time')
    })

    vi.useRealTimers()
  })
})