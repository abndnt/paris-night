import React from 'react';
import { AnalyticsDashboardData } from '../../../src/models/Analytics';
import MetricCard from './MetricCard';

interface PerformanceMetricsCardProps {
  metrics: AnalyticsDashboardData['performanceMetrics'];
}

const PerformanceMetricsCard: React.FC<PerformanceMetricsCardProps> = ({ metrics }) => {
  // Determine status colors based on metric values
  const getApiResponseTimeStatus = () => {
    if (metrics.averageApiResponseTime < 100) return 'text-green-500';
    if (metrics.averageApiResponseTime < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getErrorRateStatus = () => {
    if (metrics.errorRate < 0.5) return 'text-green-500';
    if (metrics.errorRate < 2) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSearchLatencyStatus = () => {
    if (metrics.searchLatency < 500) return 'text-green-500';
    if (metrics.searchLatency < 1500) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getUptimeStatus = () => {
    if (metrics.systemUptime > 99.9) return 'text-green-500';
    if (metrics.systemUptime > 99) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <MetricCard title="Performance Metrics" icon="chart-bar">
      <div className="grid grid-cols-2 gap-4">
        <div className="metric-item">
          <div className="text-sm text-gray-500">API Response Time</div>
          <div className={`text-2xl font-bold ${getApiResponseTimeStatus()}`}>
            {metrics.averageApiResponseTime.toFixed(1)} ms
          </div>
        </div>
        <div className="metric-item">
          <div className="text-sm text-gray-500">Error Rate</div>
          <div className={`text-2xl font-bold ${getErrorRateStatus()}`}>
            {metrics.errorRate.toFixed(2)}%
          </div>
        </div>
        <div className="metric-item">
          <div className="text-sm text-gray-500">Search Latency</div>
          <div className={`text-2xl font-bold ${getSearchLatencyStatus()}`}>
            {metrics.searchLatency.toFixed(1)} ms
          </div>
        </div>
        <div className="metric-item">
          <div className="text-sm text-gray-500">System Uptime</div>
          <div className={`text-2xl font-bold ${getUptimeStatus()}`}>
            {metrics.systemUptime.toFixed(2)}%
          </div>
        </div>
      </div>
    </MetricCard>
  );
};

export default PerformanceMetricsCard;