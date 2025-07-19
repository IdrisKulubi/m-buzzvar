"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ChartData {
  [key: string]: any
}

interface BaseChartProps {
  data: ChartData[]
  title?: string
  description?: string
  className?: string
  height?: number
  loading?: boolean
  error?: string
}

interface LineChartProps extends BaseChartProps {
  xKey: string
  yKey: string
  color?: string
  showGrid?: boolean
  showLegend?: boolean
}

interface AreaChartProps extends BaseChartProps {
  xKey: string
  yKey: string
  color?: string
  showGrid?: boolean
  gradient?: boolean
}

interface BarChartProps extends BaseChartProps {
  xKey: string
  yKey: string
  color?: string
  showGrid?: boolean
  horizontal?: boolean
}

interface PieChartProps extends BaseChartProps {
  dataKey: string
  nameKey: string
  colors?: string[]
  showLegend?: boolean
  innerRadius?: number
}

interface MultiLineChartProps extends BaseChartProps {
  xKey: string
  lines: Array<{
    key: string
    color: string
    name: string
  }>
  showGrid?: boolean
  showLegend?: boolean
}

const ChartWrapper: React.FC<{
  title?: string
  description?: string
  className?: string
  children: React.ReactNode
  loading?: boolean
  error?: string
}> = ({ title, description, className, children, loading, error }) => {
  return (
    <Card className={cn("w-full", className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>{error}</p>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

export const CustomLineChart: React.FC<LineChartProps> = ({
  data,
  title,
  description,
  className,
  height = 300,
  xKey,
  yKey,
  color = "#8884d8",
  showGrid = true,
  showLegend = false,
  loading,
  error,
}) => {
  return (
    <ChartWrapper
      title={title}
      description={description}
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          {showLegend && <Legend />}
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

export const CustomAreaChart: React.FC<AreaChartProps> = ({
  data,
  title,
  description,
  className,
  height = 300,
  xKey,
  yKey,
  color = "#8884d8",
  showGrid = true,
  gradient = true,
  loading,
  error,
}) => {
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`

  return (
    <ChartWrapper
      title={title}
      description={description}
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          {gradient && (
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
          )}
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={color}
            fillOpacity={1}
            fill={gradient ? `url(#${gradientId})` : color}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

export const CustomBarChart: React.FC<BarChartProps> = ({
  data,
  title,
  description,
  className,
  height = 300,
  xKey,
  yKey,
  color = "#8884d8",
  showGrid = true,
  horizontal = false,
  loading,
  error,
}) => {
  return (
    <ChartWrapper
      title={title}
      description={description}
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={horizontal ? "horizontal" : "vertical"}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          {horizontal ? (
            <>
              <XAxis type="number" />
              <YAxis type="category" dataKey={xKey} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} />
              <YAxis />
            </>
          )}
          <Tooltip />
          <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

export const CustomPieChart: React.FC<PieChartProps> = ({
  data,
  title,
  description,
  className,
  height = 300,
  dataKey,
  nameKey,
  colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00"],
  showLegend = true,
  innerRadius = 0,
  loading,
  error,
}) => {
  return (
    <ChartWrapper
      title={title}
      description={description}
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={80}
            paddingAngle={5}
            dataKey={dataKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

export const MultiLineChart: React.FC<MultiLineChartProps> = ({
  data,
  title,
  description,
  className,
  height = 300,
  xKey,
  lines,
  showGrid = true,
  showLegend = true,
  loading,
  error,
}) => {
  return (
    <ChartWrapper
      title={title}
      description={description}
      className={className}
      loading={loading}
      error={error}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" />}
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          {showLegend && <Legend />}
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={2}
              name={line.name}
              dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// Metric card component for displaying key statistics
interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    type: "increase" | "decrease"
    period: string
  }
  icon?: React.ReactNode
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon,
  className,
}) => {
  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <p className={cn(
              "text-xs",
              change.type === "increase" ? "text-green-600" : "text-red-600"
            )}>
              {change.type === "increase" ? "+" : "-"}{Math.abs(change.value)}% from {change.period}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

// Chart container for responsive grid layouts
interface ChartGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export const ChartGrid: React.FC<ChartGridProps> = ({
  children,
  columns = 2,
  className,
}) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  )
}