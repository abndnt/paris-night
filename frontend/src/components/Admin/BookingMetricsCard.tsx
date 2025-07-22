import React from 'react';
import { AnalyticsDashboardData } from '../../../src/models/Analytics';
import MetricCard from './MetricCard';

interface BookingMetricsCardProps {
  metrics: AnalyticsDashboardData['bookingMetrics'];
}

const BookingMetricsCard: React.FC<BookingMetricsCardProps> = ({ metrics }) => {
  return (
    <MetricCard title="Booking Metrics" icon="ticket">
      <div className="grid grid-cols-2 gap-4">
        <div className="metric-item">
          <div className="text-sm text-gray-500">Total Bookings</div>
          <div className="text-2xl font-bold">{metrics.totalBookings.toLocaleString()}</div>
        </div>
        <div className="metric-item">
          <div className="text-sm text-gray-500">Total Revenue</div>
          <div className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="metric-item">
          <div className="text-sm text-gray-500">Avg Booking Value</div>
          <div className="text-2xl font-bold">${metrics.averageBookingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div className="metric-item">
          <div className="text-sm text-gray-500">Points Redemptions</div>
          <div className="text-2xl font-bold">{metrics.pointsRedemptions.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="metric-item">
          <div className="text-sm text-gray-500">Conversion Rate</div>
          <div className="flex items-end">
            <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
            <div className="ml-2 text-xs text-gray-500 mb-1">of attempts</div>
          </div>
        </div>
        <div className="metric-item">
          <div className="text-sm text-gray-500">Abandonment Rate</div>
          <div className="flex items-end">
            <div className="text-2xl font-bold">{metrics.abandonmentRate.toFixed(1)}%</div>
            <div className="ml-2 text-xs text-gray-500 mb-1">of attempts</div>
          </div>
        </div>
      </div>
    </MetricCard>
  );
};

export default BookingMetricsCard;