import React from 'react';
import { AnalyticsDashboardData } from '../../../src/models/Analytics';
import MetricCard from './MetricCard';

interface UserMetricsCardProps {
  metrics: AnalyticsDashboardData['userMetrics'];
}

const UserMetricsCard: React.FC<UserMetricsCardProps> = ({ metrics }) => {
  return (
    <MetricCard title="User Metrics" icon="users">
      <div className="grid grid-cols-2 gap-4">
        <div className="metric-item">
          <div className="text-sm text-gray-500">Total Users</div>
          <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
        </div>
        <div className="metric-item">
          <div className="text-sm text-gray-500">Active Users</div>
          <div className="text-2xl font-bold">{metrics.activeUsers.toLocaleString()}</div>
        </div>
        <div className="metric-item">
          <div className="text-sm text-gray-500">New Users</div>
          <div className="text-2xl font-bold">{metrics.newUsers.toLocaleString()}</div>
        </div>
        <div className="metric-item">
          <div className="text-sm text-gray-500">Retention Rate</div>
          <div className="text-2xl font-bold">{metrics.retentionRate.toFixed(1)}%</div>
        </div>
      </div>
    </MetricCard>
  );
};

export default UserMetricsCard;