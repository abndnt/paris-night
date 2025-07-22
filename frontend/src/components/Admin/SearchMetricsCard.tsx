import React from 'react';
import { AnalyticsDashboardData } from '../../../src/models/Analytics';
import MetricCard from './MetricCard';

interface SearchMetricsCardProps {
  metrics: AnalyticsDashboardData['searchMetrics'];
}

const SearchMetricsCard: React.FC<SearchMetricsCardProps> = ({ metrics }) => {
  return (
    <MetricCard title="Search Metrics" icon="search">
      <div className="grid grid-cols-2 gap-4">
        <div className="metric-item">
          <div className="text-sm text-gray-500">Total Searches</div>
          <div className="text-2xl font-bold">{metrics.totalSearches.toLocaleString()}</div>
        </div>
        <div className="metric-item">
          <div className="text-sm text-gray-500">Search to Booking Rate</div>
          <div className="text-2xl font-bold">{metrics.searchesToBookingRate.toFixed(1)}%</div>
        </div>
        <div className="metric-item">
          <div className="text-sm text-gray-500">Avg Results Per Search</div>
          <div className="text-2xl font-bold">{metrics.averageResultsPerSearch.toFixed(1)}</div>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">Popular Origins</h4>
        <div className="grid grid-cols-2 gap-2">
          {metrics.popularOrigins.map((item, index) => (
            <div key={`origin-${index}`} className="flex justify-between text-sm">
              <span className="font-medium">{item.origin}</span>
              <span>{item.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">Popular Destinations</h4>
        <div className="grid grid-cols-2 gap-2">
          {metrics.popularDestinations.map((item, index) => (
            <div key={`dest-${index}`} className="flex justify-between text-sm">
              <span className="font-medium">{item.destination}</span>
              <span>{item.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </MetricCard>
  );
};

export default SearchMetricsCard;