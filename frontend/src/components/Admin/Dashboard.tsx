import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchDashboardData, 
  selectDashboardData, 
  selectAdminLoading, 
  selectAdminErrors,
  selectDateRange,
  setDateRange
} from '../../store/slices/adminSlice';
import { AppDispatch } from '../../store/store';
import UserMetricsCard from './UserMetricsCard';
import SearchMetricsCard from './SearchMetricsCard';
import BookingMetricsCard from './BookingMetricsCard';
import PerformanceMetricsCard from './PerformanceMetricsCard';
import DateRangePicker from './DateRangePicker';
import LoadingSpinner from '../UI/LoadingSpinner';
import ErrorMessage from '../UI/ErrorMessage';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const dashboardData = useSelector(selectDashboardData);
  const loading = useSelector(selectAdminLoading);
  const errors = useSelector(selectAdminErrors);
  const dateRange = useSelector(selectDateRange);
  const [refreshInterval, setRefreshInterval] = useState<number>(0);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  // Fetch dashboard data on component mount and when date range changes
  useEffect(() => {
    dispatch(fetchDashboardData(dateRange));
  }, [dispatch, dateRange]);

  // Set up auto-refresh interval
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (autoRefresh && refreshInterval > 0) {
      intervalId = setInterval(() => {
        dispatch(fetchDashboardData(dateRange));
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, dispatch, dateRange]);

  // Handle date range change
  const handleDateRangeChange = (newDateRange: { startDate: string; endDate: string }) => {
    dispatch(setDateRange(newDateRange));
  };

  // Handle refresh interval change
  const handleRefreshIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    setRefreshInterval(value);
    setAutoRefresh(value > 0);
  };

  // Handle manual refresh
  const handleManualRefresh = () => {
    dispatch(fetchDashboardData(dateRange));
  };

  if (loading.dashboard && !dashboardData) {
    return <LoadingSpinner />;
  }

  if (errors.dashboard && !dashboardData) {
    return <ErrorMessage message={errors.dashboard} />;
  }

  return (
    <div className="admin-dashboard">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center space-x-4">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={handleDateRangeChange}
          />
          <div className="flex items-center">
            <label htmlFor="refresh-interval" className="mr-2 text-sm">
              Auto-refresh:
            </label>
            <select
              id="refresh-interval"
              value={refreshInterval}
              onChange={handleRefreshIntervalChange}
              className="border rounded p-1 text-sm"
            >
              <option value="0">Off</option>
              <option value="30">30s</option>
              <option value="60">1m</option>
              <option value="300">5m</option>
              <option value="600">10m</option>
            </select>
          </div>
          <button
            onClick={handleManualRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center"
            disabled={loading.dashboard}
          >
            {loading.dashboard ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UserMetricsCard metrics={dashboardData.userMetrics} />
          <SearchMetricsCard metrics={dashboardData.searchMetrics} />
          <BookingMetricsCard metrics={dashboardData.bookingMetrics} />
          <PerformanceMetricsCard metrics={dashboardData.performanceMetrics} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;