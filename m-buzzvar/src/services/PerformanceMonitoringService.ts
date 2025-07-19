import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  totalRequests: number;
  averageResponseTime: number;
  slowestRequest: PerformanceMetric | null;
  fastestRequest: PerformanceMetric | null;
  errorRate: number;
  cacheHitRate: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
}

/**
 * Performance monitoring service for tracking app performance metrics
 */
export class PerformanceMonitoringService {
  private static metrics: PerformanceMetric[] = [];
  private static cacheMetrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
  };
  private static readonly MAX_METRICS = 1000;
  private static readonly STORAGE_KEY = 'performance_metrics';

  /**
   * Start timing a performance metric
   * @param name Name of the operation being timed
   * @param metadata Optional metadata to include
   * @returns Timer function to call when operation completes
   */
  static startTimer(name: string, metadata?: Record<string, any>): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata,
      });
    };
  }

  /**
   * Record a performance metric
   * @param metric Performance metric to record
   */
  static recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Persist metrics periodically
    if (this.metrics.length % 50 === 0) {
      this.persistMetrics();
    }
  }

  /**
   * Record cache hit
   * @param operation Name of the cache operation
   */
  static recordCacheHit(operation: string): void {
    this.cacheMetrics.hits++;
    this.cacheMetrics.totalRequests++;
    this.updateCacheHitRate();
    
    this.recordMetric({
      name: `cache_hit_${operation}`,
      duration: 0,
      timestamp: Date.now(),
      metadata: { type: 'cache_hit' },
    });
  }

  /**
   * Record cache miss
   * @param operation Name of the cache operation
   */
  static recordCacheMiss(operation: string): void {
    this.cacheMetrics.misses++;
    this.cacheMetrics.totalRequests++;
    this.updateCacheHitRate();
    
    this.recordMetric({
      name: `cache_miss_${operation}`,
      duration: 0,
      timestamp: Date.now(),
      metadata: { type: 'cache_miss' },
    });
  }

  /**
   * Get performance statistics
   * @param timeWindow Time window in milliseconds (default: last hour)
   * @returns Performance statistics
   */
  static getPerformanceStats(timeWindow: number = 60 * 60 * 1000): PerformanceStats {
    const cutoffTime = Date.now() - timeWindow;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    
    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowestRequest: null,
        fastestRequest: null,
        errorRate: 0,
        cacheHitRate: this.cacheMetrics.hitRate,
      };
    }

    const durations = recentMetrics.map(m => m.duration);
    const averageResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    
    const slowestRequest = recentMetrics.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest
    );
    
    const fastestRequest = recentMetrics.reduce((fastest, current) => 
      current.duration < fastest.duration ? current : fastest
    );

    const errorMetrics = recentMetrics.filter(m => 
      m.metadata?.error || m.name.includes('error')
    );
    const errorRate = errorMetrics.length / recentMetrics.length;

    return {
      totalRequests: recentMetrics.length,
      averageResponseTime,
      slowestRequest,
      fastestRequest,
      errorRate,
      cacheHitRate: this.cacheMetrics.hitRate,
    };
  }

  /**
   * Get cache metrics
   * @returns Cache performance metrics
   */
  static getCacheMetrics(): CacheMetrics {
    return { ...this.cacheMetrics };
  }

  /**
   * Get metrics by operation name
   * @param operationName Name of the operation
   * @param timeWindow Time window in milliseconds
   * @returns Array of metrics for the operation
   */
  static getMetricsByOperation(
    operationName: string, 
    timeWindow: number = 60 * 60 * 1000
  ): PerformanceMetric[] {
    const cutoffTime = Date.now() - timeWindow;
    return this.metrics.filter(m => 
      m.name === operationName && m.timestamp > cutoffTime
    );
  }

  /**
   * Get slow operations (above threshold)
   * @param threshold Duration threshold in milliseconds
   * @param timeWindow Time window in milliseconds
   * @returns Array of slow operations
   */
  static getSlowOperations(
    threshold: number = 1000,
    timeWindow: number = 60 * 60 * 1000
  ): PerformanceMetric[] {
    const cutoffTime = Date.now() - timeWindow;
    return this.metrics.filter(m => 
      m.duration > threshold && m.timestamp > cutoffTime
    ).sort((a, b) => b.duration - a.duration);
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
    this.cacheMetrics = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
    };
  }

  /**
   * Export metrics for analysis
   * @param timeWindow Time window in milliseconds
   * @returns Exported metrics data
   */
  static exportMetrics(timeWindow?: number): {
    metrics: PerformanceMetric[];
    stats: PerformanceStats;
    cacheMetrics: CacheMetrics;
    exportedAt: number;
  } {
    const cutoffTime = timeWindow ? Date.now() - timeWindow : 0;
    const filteredMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    
    return {
      metrics: filteredMetrics,
      stats: this.getPerformanceStats(timeWindow),
      cacheMetrics: this.getCacheMetrics(),
      exportedAt: Date.now(),
    };
  }

  /**
   * Generate performance report
   * @param timeWindow Time window in milliseconds
   * @returns Human-readable performance report
   */
  static generateReport(timeWindow: number = 60 * 60 * 1000): string {
    const stats = this.getPerformanceStats(timeWindow);
    const slowOps = this.getSlowOperations(1000, timeWindow);
    
    let report = `Performance Report (Last ${timeWindow / 1000 / 60} minutes)\n`;
    report += `==========================================\n`;
    report += `Total Requests: ${stats.totalRequests}\n`;
    report += `Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms\n`;
    report += `Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%\n`;
    report += `Error Rate: ${(stats.errorRate * 100).toFixed(1)}%\n`;
    
    if (stats.slowestRequest) {
      report += `Slowest Request: ${stats.slowestRequest.name} (${stats.slowestRequest.duration.toFixed(2)}ms)\n`;
    }
    
    if (stats.fastestRequest) {
      report += `Fastest Request: ${stats.fastestRequest.name} (${stats.fastestRequest.duration.toFixed(2)}ms)\n`;
    }
    
    if (slowOps.length > 0) {
      report += `\nSlow Operations (>1s):\n`;
      slowOps.slice(0, 5).forEach(op => {
        report += `- ${op.name}: ${op.duration.toFixed(2)}ms\n`;
      });
    }
    
    return report;
  }

  /**
   * Persist metrics to storage
   */
  private static async persistMetrics(): Promise<void> {
    try {
      const data = {
        metrics: this.metrics.slice(-100), // Keep only last 100 metrics
        cacheMetrics: this.cacheMetrics,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist performance metrics:', error);
    }
  }

  /**
   * Load metrics from storage
   */
  static async loadMetrics(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.metrics = parsed.metrics || [];
        this.cacheMetrics = parsed.cacheMetrics || {
          hits: 0,
          misses: 0,
          totalRequests: 0,
          hitRate: 0,
        };
      }
    } catch (error) {
      console.warn('Failed to load performance metrics:', error);
    }
  }

  /**
   * Update cache hit rate
   */
  private static updateCacheHitRate(): void {
    if (this.cacheMetrics.totalRequests > 0) {
      this.cacheMetrics.hitRate = this.cacheMetrics.hits / this.cacheMetrics.totalRequests;
    }
  }

  /**
   * Monitor function execution time
   * @param fn Function to monitor
   * @param name Name for the metric
   * @param metadata Optional metadata
   * @returns Wrapped function with performance monitoring
   */
  static monitor<T extends (...args: any[]) => any>(
    fn: T,
    name: string,
    metadata?: Record<string, any>
  ): T {
    return ((...args: any[]) => {
      const timer = this.startTimer(name, metadata);
      
      try {
        const result = fn(...args);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          return result
            .then((value: any) => {
              timer();
              return value;
            })
            .catch((error: any) => {
              timer();
              this.recordMetric({
                name: `${name}_error`,
                duration: 0,
                timestamp: Date.now(),
                metadata: { ...metadata, error: error.message },
              });
              throw error;
            });
        }
        
        timer();
        return result;
      } catch (error) {
        timer();
        this.recordMetric({
          name: `${name}_error`,
          duration: 0,
          timestamp: Date.now(),
          metadata: { ...metadata, error: (error as Error).message },
        });
        throw error;
      }
    }) as T;
  }
}

/**
 * Decorator for monitoring method performance
 */
export function MonitorPerformance(name?: string, metadata?: Record<string, any>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = PerformanceMonitoringService.monitor(
      originalMethod,
      metricName,
      metadata
    );
    
    return descriptor;
  };
}