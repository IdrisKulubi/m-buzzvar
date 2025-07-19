import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import {
  CustomLineChart,
  CustomAreaChart,
  CustomBarChart,
  CustomPieChart,
  MultiLineChart,
  MetricCard,
  ChartGrid,
} from '@/components/ui/analytics-charts'

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}))

const mockData = [
  { date: '2024-01-01', value: 100, views: 50, clicks: 25 },
  { date: '2024-01-02', value: 150, views: 75, clicks: 40 },
  { date: '2024-01-03', value: 120, views: 60, clicks: 30 },
]

describe('CustomLineChart', () => {
  it('renders line chart with title and description', () => {
    render(
      <CustomLineChart
        data={mockData}
        title="Test Line Chart"
        description="Chart description"
        xKey="date"
        yKey="value"
      />
    )
    
    expect(screen.getByText('Test Line Chart')).toBeInTheDocument()
    expect(screen.getByText('Chart description')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('line')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <CustomLineChart
        data={[]}
        xKey="date"
        yKey="value"
        loading={true}
      />
    )
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin')
  })

  it('shows error state', () => {
    render(
      <CustomLineChart
        data={[]}
        xKey="date"
        yKey="value"
        error="Failed to load data"
      />
    )
    
    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
  })

  it('shows grid when showGrid is true', () => {
    render(
      <CustomLineChart
        data={mockData}
        xKey="date"
        yKey="value"
        showGrid={true}
      />
    )
    
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
  })

  it('shows legend when showLegend is true', () => {
    render(
      <CustomLineChart
        data={mockData}
        xKey="date"
        yKey="value"
        showLegend={true}
      />
    )
    
    expect(screen.getByTestId('legend')).toBeInTheDocument()
  })
})

describe('CustomAreaChart', () => {
  it('renders area chart', () => {
    render(
      <CustomAreaChart
        data={mockData}
        title="Test Area Chart"
        xKey="date"
        yKey="value"
      />
    )
    
    expect(screen.getByText('Test Area Chart')).toBeInTheDocument()
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    expect(screen.getByTestId('area')).toBeInTheDocument()
  })

  it('renders without gradient when gradient is false', () => {
    render(
      <CustomAreaChart
        data={mockData}
        xKey="date"
        yKey="value"
        gradient={false}
      />
    )
    
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })
})

describe('CustomBarChart', () => {
  it('renders bar chart', () => {
    render(
      <CustomBarChart
        data={mockData}
        title="Test Bar Chart"
        xKey="date"
        yKey="value"
      />
    )
    
    expect(screen.getByText('Test Bar Chart')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('bar')).toBeInTheDocument()
  })

  it('renders horizontal bar chart', () => {
    render(
      <CustomBarChart
        data={mockData}
        xKey="date"
        yKey="value"
        horizontal={true}
      />
    )
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })
})

describe('CustomPieChart', () => {
  const pieData = [
    { name: 'Category A', value: 400 },
    { name: 'Category B', value: 300 },
    { name: 'Category C', value: 200 },
  ]

  it('renders pie chart', () => {
    render(
      <CustomPieChart
        data={pieData}
        title="Test Pie Chart"
        dataKey="value"
        nameKey="name"
      />
    )
    
    expect(screen.getByText('Test Pie Chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    expect(screen.getByTestId('pie')).toBeInTheDocument()
  })

  it('renders donut chart with inner radius', () => {
    render(
      <CustomPieChart
        data={pieData}
        dataKey="value"
        nameKey="name"
        innerRadius={40}
      />
    )
    
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
  })

  it('shows legend when showLegend is true', () => {
    render(
      <CustomPieChart
        data={pieData}
        dataKey="value"
        nameKey="name"
        showLegend={true}
      />
    )
    
    expect(screen.getByTestId('legend')).toBeInTheDocument()
  })
})

describe('MultiLineChart', () => {
  const lines = [
    { key: 'views', color: '#8884d8', name: 'Views' },
    { key: 'clicks', color: '#82ca9d', name: 'Clicks' },
  ]

  it('renders multi-line chart', () => {
    render(
      <MultiLineChart
        data={mockData}
        title="Multi-Line Chart"
        xKey="date"
        lines={lines}
      />
    )
    
    expect(screen.getByText('Multi-Line Chart')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getAllByTestId('line')).toHaveLength(2)
  })

  it('shows legend when showLegend is true', () => {
    render(
      <MultiLineChart
        data={mockData}
        xKey="date"
        lines={lines}
        showLegend={true}
      />
    )
    
    expect(screen.getByTestId('legend')).toBeInTheDocument()
  })
})

describe('MetricCard', () => {
  it('renders metric card with title and value', () => {
    render(
      <MetricCard
        title="Total Users"
        value="1,234"
      />
    )
    
    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('shows change indicator', () => {
    render(
      <MetricCard
        title="Revenue"
        value="$5,000"
        change={{
          value: 12.5,
          type: 'increase',
          period: 'last month'
        }}
      />
    )
    
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$5,000')).toBeInTheDocument()
    expect(screen.getByText('+12.5% from last month')).toBeInTheDocument()
  })

  it('shows decrease change', () => {
    render(
      <MetricCard
        title="Bounce Rate"
        value="25%"
        change={{
          value: 5,
          type: 'decrease',
          period: 'last week'
        }}
      />
    )
    
    expect(screen.getByText('-5% from last week')).toBeInTheDocument()
  })

  it('renders with icon', () => {
    const icon = <div data-testid="metric-icon">Icon</div>
    render(
      <MetricCard
        title="Active Users"
        value="500"
        icon={icon}
      />
    )
    
    expect(screen.getByTestId('metric-icon')).toBeInTheDocument()
  })
})

describe('ChartGrid', () => {
  it('renders children in grid layout', () => {
    render(
      <ChartGrid columns={2}>
        <div data-testid="chart-1">Chart 1</div>
        <div data-testid="chart-2">Chart 2</div>
      </ChartGrid>
    )
    
    expect(screen.getByTestId('chart-1')).toBeInTheDocument()
    expect(screen.getByTestId('chart-2')).toBeInTheDocument()
  })

  it('applies correct grid classes for different column counts', () => {
    const { rerender } = render(
      <ChartGrid columns={1}>
        <div>Chart</div>
      </ChartGrid>
    )
    
    let gridContainer = screen.getByText('Chart').parentElement
    expect(gridContainer).toHaveClass('grid-cols-1')
    
    rerender(
      <ChartGrid columns={3}>
        <div>Chart</div>
      </ChartGrid>
    )
    
    gridContainer = screen.getByText('Chart').parentElement
    expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
  })

  it('applies custom className', () => {
    render(
      <ChartGrid className="custom-class">
        <div>Chart</div>
      </ChartGrid>
    )
    
    const gridContainer = screen.getByText('Chart').parentElement
    expect(gridContainer).toHaveClass('custom-class')
  })
})