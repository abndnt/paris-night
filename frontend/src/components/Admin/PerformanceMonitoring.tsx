import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchPerformanceMetrics, 
  selectPerformanceMetrics, 
  selectAdminLoading, 
  selectAdminErrors,
  selectDateRange,
  setDateRange
} from '../../store/slices/adminSlice';
import { AppDispatch } from '../../store/store';
import LoadingSpinner from '../UI/LoadingSpinner';
import ErrorMessage from '../UI/ErrorMessage';
import DateRangePicker from './DateRangePicker';

// This would normally be a chart library like Chart.js or Recharts
// For simplicity, we'll create a basic chart component
const LineChart: React.FC<{ 
  data: Array<{ metricValue: number; createdAt: string }>;
  metricName: string;
  metricUnit: string;
}> = ({ data, metricName, metricUnit }) => {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-gray-500">No data available</div>;
  }

  // Find min and max values for scaling
  const values = data.map(d => d.metricValue);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chart-container h-64 mt-4">
      <div className="flex justify-between items-end h-full relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
          <div>{maxValue.toFixed(1)}{metricUnit}</div>
          <div>{((maxValue + minValue) / 2).toFixed(1)}{metricUnit}</div>
          <div>{minValue.toFixed(1)}{metricUnit}</div>
        </div>
        
        {/* Chart area */}
        <div className="flex-1 h-full ml-12 relative">
          {/* Horizontal grid lines */}
          <div className="absolute left-0 right-0 top-0 bottom-0 flex flex-col justify-between">
            <div className="border-t border-gray-200 h-0"></div>
            <div className="border-t border-gray-200 h-0"></div>
            <div className="border-t border-gray-200 h-0"></div>
          </div>
          
          {/* Data points and lines */}
          <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${data.length - 1} 100`} preserveAspectRatio="none">
            <polyline
              points={data.map((d, i) => {
                const x = i;
                const normalizedValue = range === 0 ? 50 : 100 - ((d.metricValue - minValue) / range * 100);
                return `${x},${normalizedValue}`;
              }).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
            />
            {data.map((d, i) => {
              const x = i;
              const normalizedValue = range === 0 ? 50 : 100 - ((d.metricValue - minValue) / range * 100);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={normalizedValue}
                  r="2"
                  fill="#3b82f6"
                />
              );
            })}
          </svg>
        </div>
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1).map((d, i) => (
          <div key={i}>{formatDate(d.createdAt)}</div>
        ))}
      </div>
    </div>
  );
};

const PerformanceMonitoring: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const performanceMetrics = useSelector(selectPerformanceMetrics);
  const loading = useSelector(selectAdminLoading);
  const errors = useSelector(selectAdminErrors);
  const dateRange = useSelector(selectDateRange);
  const [selectedMetric, setSelectedMetric] = useState('response_time');
  const [selectedComponent, setSelectedComponent] = useState('api');

  // Available metrics and components
  const availableMetrics = [
    { value: 'response_time', label: 'API Response Time' },
    { value: 'search_latency', label: 'Search Latency' },
    { value: 'database_query_time', label: 'Database Query Time' },
    { value: 'llm_response_time', label: 'LLM Response Time' },
    { value: 'memory_usage', label: 'Memory Usage' },
    { value: 'cpu_usage', label: 'CPU Usage' },
  ];

  const availableComponents = [
    { value: 'api', label: 'API Server' },
    { value: 'database', label: 'Database' },
    { value: 'search', label: 'Search Service' },
    { value: 'llm', label: 'LLM Service' },
    { value: 'cache', label: 'Cache' },
    { value: 'websocket', label: 'WebSocket' },
  ];

  // Get metric unit based on selected metric
  const getMetricUnit = (metric: string) => {
    switch (metric) {
      case 'response_time':
      case 'search_latency':
      case 'database_query_time':
      case 'llm_response_time':
        return 'ms';
      case 'memory_usage':
        return 'MB';
      case 'cpu_usage':
        return '%';
      default:
        return '';
    }
  };

  // Fetch performance metrics on component mount and when selection changes
  useEffect(() => {
    dispatch(fetchPerformanceMetrics({
      metricName: selectedMetric,
      component: selectedComponent,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }));
  }, [dispatch, selectedMetric, selectedComponent, dateRange]);

  // Handle date range change
  const handleDateRangeChange = (newDateRange: { startDate: string; endDate: string }) => {
    dispatch(setDateRange(newDateRange));
  };

  // Handle metric selection change
  const handleMetricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMetric(e.target.value);
  };

  // Handle component selection change
  const handleComponentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedComponent(e.target.value);
  };

  return (
    <div className="performance-monitoring">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Performance Monitoring</h1>
        <div className="flex items-center space-x-4">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={handleDateRangeChange}
          />
          <button
            onClick={() => dispatch(fetchPerformanceMetrics({
              metricName: selectedMetric,
              component: selectedComponent,
              startDate: dateRange.startDate,
              endDate: dateRange.endDate,
            }))}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center"
            disabled={loading.performance}
          >
            {loading.performance ? (
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

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center mb-6 space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <label htmlFor="metric-select" className="block text-sm font-medium text-gray-700 mb-1">
              Metric
            </label>
            <select
              id="metric-select"
              value={selectedMetric}
              onChange={handleMetricChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              {availableMetrics.map((metric) => (
                <option key={metric.value} value={metric.value}>
                  {metric.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="component-select" className="block text-sm font-medium text-gray-700 mb-1">
              Component
            </label>
            <select
              id="component-select"
              value={selectedComponent}
              onChange={handleComponentChange}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              {availableComponents.map((component) => (
                <option key={component.value} value={component.value}>
                  {component.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading.performance && !performanceMetrics.length ? (
          <LoadingSpinner />
        ) : errors.performance ? (
          <ErrorMessage message={errors.performance} />
        ) : (
          <div className="chart-wrapper">
            <h3 className="text-lg font-semibold mb-2">
              {availableMetrics.find(m => m.value === selectedMetric)?.label} - {availableComponents.find(c => c.value === selectedComponent)?.label}
            </h3>
            <LineChart 
              data={performanceMetrics} 
              metricName={selectedMetric} 
              metricUnit={getMetricUnit(selectedMetric)} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceMonitoring;