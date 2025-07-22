import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchSystemHealth, 
  selectSystemHealth, 
  selectAdminLoading, 
  selectAdminErrors 
} from '../../store/slices/adminSlice';
import { AppDispatch } from '../../store/store';
import LoadingSpinner from '../UI/LoadingSpinner';
import ErrorMessage from '../UI/ErrorMessage';

const SystemHealth: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const systemHealth = useSelector(selectSystemHealth);
  const loading = useSelector(selectAdminLoading);
  const errors = useSelector(selectAdminErrors);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Fetch system health on component mount
  useEffect(() => {
    dispatch(fetchSystemHealth());
  }, [dispatch]);

  // Set up auto-refresh interval
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (autoRefresh) {
      intervalId = setInterval(() => {
        dispatch(fetchSystemHealth());
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, dispatch]);

  // Handle refresh interval change
  const handleRefreshIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRefreshInterval(parseInt(e.target.value));
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'down':
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (loading.systemHealth && !systemHealth) {
    return <LoadingSpinner />;
  }

  if (errors.systemHealth && !systemHealth) {
    return <ErrorMessage message={errors.systemHealth} />;
  }

  return (
    <div className="system-health">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Health</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <label htmlFor="auto-refresh" className="mr-2 text-sm">
              Auto-refresh:
            </label>
            <select
              id="auto-refresh"
              value={refreshInterval}
              onChange={handleRefreshIntervalChange}
              disabled={!autoRefresh}
              className="border rounded p-1 text-sm"
            >
              <option value="10">10s</option>
              <option value="30">30s</option>
              <option value="60">1m</option>
              <option value="300">5m</option>
            </select>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="toggle-refresh"
              checked={autoRefresh}
              onChange={() => setAutoRefresh(!autoRefresh)}
              className="mr-2"
            />
            <label htmlFor="toggle-refresh" className="text-sm">
              Enable auto-refresh
            </label>
          </div>
          <button
            onClick={() => dispatch(fetchSystemHealth())}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center"
            disabled={loading.systemHealth}
          >
            {loading.systemHealth ? (
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

      {systemHealth && (
        <div className="grid grid-cols-1 gap-6">
          {/* Overall System Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Overall System Status</h3>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(systemHealth.status)}`}>
                {systemHealth.status.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {formatDate(systemHealth.timestamp)}
            </div>
          </div>

          {/* Database Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Database</h3>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                systemHealth.components.database.healthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {systemHealth.components.database.healthy ? 'HEALTHY' : 'DOWN'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemHealth.components.database.responseTime && (
                <div className="metric-item">
                  <div className="text-sm text-gray-500">Response Time</div>
                  <div className="text-xl font-bold">
                    {systemHealth.components.database.responseTime} ms
                  </div>
                </div>
              )}
              <div className="metric-item">
                <div className="text-sm text-gray-500">Status Message</div>
                <div className="text-sm">
                  {systemHealth.components.database.message || systemHealth.components.database.error || 'No message'}
                </div>
              </div>
            </div>
          </div>

          {/* Cache Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cache (Redis)</h3>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                systemHealth.components.cache.healthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {systemHealth.components.cache.healthy ? 'HEALTHY' : 'DOWN'}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {systemHealth.components.cache.responseTime && (
                <div className="metric-item">
                  <div className="text-sm text-gray-500">Response Time</div>
                  <div className="text-xl font-bold">
                    {systemHealth.components.cache.responseTime} ms
                  </div>
                </div>
              )}
              <div className="metric-item">
                <div className="text-sm text-gray-500">Status Message</div>
                <div className="text-sm">
                  {systemHealth.components.cache.message || systemHealth.components.cache.error || 'No message'}
                </div>
              </div>
            </div>
          </div>

          {/* External APIs Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">External APIs</h3>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                systemHealth.components.externalApis.healthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {systemHealth.components.externalApis.healthy ? 'HEALTHY' : 'ISSUES DETECTED'}
              </span>
            </div>
            {systemHealth.components.externalApis.services && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Response Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {systemHealth.components.externalApis.services.map((service, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {service.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            service.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {service.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {service.responseTime} ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {systemHealth.components.externalApis.error && (
              <div className="text-sm text-red-600 mt-2">
                {systemHealth.components.externalApis.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealth;