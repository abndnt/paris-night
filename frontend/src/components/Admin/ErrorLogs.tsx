import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchErrorLogs, 
  updateErrorResolution,
  selectErrorLogs, 
  selectAdminLoading, 
  selectAdminErrors,
  selectDateRange
} from '../../store/slices/adminSlice';
import { AppDispatch } from '../../store/store';
import LoadingSpinner from '../UI/LoadingSpinner';
import ErrorMessage from '../UI/ErrorMessage';
import DateRangePicker from './DateRangePicker';

const ErrorLogs: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const errorLogs = useSelector(selectErrorLogs);
  const loading = useSelector(selectAdminLoading);
  const errors = useSelector(selectAdminErrors);
  const dateRange = useSelector(selectDateRange);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Fetch error logs on component mount and when date range changes
  useEffect(() => {
    dispatch(fetchErrorLogs({ ...dateRange, page, limit }));
  }, [dispatch, dateRange, page, limit]);

  // Handle date range change
  const handleDateRangeChange = (newDateRange: { startDate: string; endDate: string }) => {
    dispatch(fetchErrorLogs({ ...newDateRange, page, limit }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Handle limit change
  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLimit(parseInt(e.target.value));
    setPage(1); // Reset to first page when changing limit
  };

  // Handle error resolution
  const handleResolveError = (errorId: string) => {
    dispatch(updateErrorResolution({
      errorId,
      resolved: true,
      notes: resolutionNotes
    }));
    setSelectedError(null);
    setResolutionNotes('');
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  // Get severity class based on error type
  const getSeverityClass = (errorType: string) => {
    if (errorType.includes('CRITICAL') || errorType.includes('FATAL')) {
      return 'bg-red-100 text-red-800';
    } else if (errorType.includes('ERROR')) {
      return 'bg-orange-100 text-orange-800';
    } else if (errorType.includes('WARNING')) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading.errors && errorLogs.length === 0) {
    return <LoadingSpinner />;
  }

  if (errors.errors && errorLogs.length === 0) {
    return <ErrorMessage message={errors.errors} />;
  }

  return (
    <div className="error-logs">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Error Logs</h1>
        <div className="flex items-center space-x-4">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={handleDateRangeChange}
          />
          <button
            onClick={() => dispatch(fetchErrorLogs({ ...dateRange, page, limit }))}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center"
            disabled={loading.errors}
          >
            {loading.errors ? (
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

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Path
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {errorLogs.map((error) => (
                <tr key={error.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityClass(error.errorType)}`}>
                      {error.errorType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md truncate" title={error.errorMessage}>
                      {error.errorMessage}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{error.path || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(error.createdAt?.toString() || '')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {error.resolved ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Resolved
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Open
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedError(error.id || '')}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Details
                    </button>
                    {!error.resolved && (
                      <button
                        onClick={() => {
                          setSelectedError(error.id || '');
                          setResolutionNotes('');
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                page === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * limit, errorLogs.length)}</span> of{' '}
                <span className="font-medium">{errorLogs.length}</span> results
              </p>
            </div>
            <div>
              <div className="flex items-center">
                <label htmlFor="limit-select" className="mr-2 text-sm text-gray-600">
                  Show:
                </label>
                <select
                  id="limit-select"
                  value={limit}
                  onChange={handleLimitChange}
                  className="border rounded p-1 text-sm"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    page === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Error Details Modal */}
      {selectedError !== null && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium">Error Details</h3>
            </div>
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              {errorLogs.find(e => e.id === selectedError) && (
                <>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Error Type</h4>
                    <p className="text-sm">{errorLogs.find(e => e.id === selectedError)?.errorType}</p>
                  </div>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Message</h4>
                    <p className="text-sm">{errorLogs.find(e => e.id === selectedError)?.errorMessage}</p>
                  </div>
                  {errorLogs.find(e => e.id === selectedError)?.stackTrace && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Stack Trace</h4>
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                        {errorLogs.find(e => e.id === selectedError)?.stackTrace}
                      </pre>
                    </div>
                  )}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Path</h4>
                    <p className="text-sm">{errorLogs.find(e => e.id === selectedError)?.path || 'N/A'}</p>
                  </div>
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Time</h4>
                    <p className="text-sm">{formatDate(errorLogs.find(e => e.id === selectedError)?.createdAt?.toString() || '')}</p>
                  </div>
                  {errorLogs.find(e => e.id === selectedError)?.requestData && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Request Data</h4>
                      <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                        {JSON.stringify(errorLogs.find(e => e.id === selectedError)?.requestData, null, 2)}
                      </pre>
                    </div>
                  )}
                  {!errorLogs.find(e => e.id === selectedError)?.resolved && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Resolution Notes</h4>
                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        rows={3}
                        placeholder="Enter resolution notes..."
                      />
                    </div>
                  )}
                  {errorLogs.find(e => e.id === selectedError)?.resolved && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Resolution Notes</h4>
                      <p className="text-sm">{errorLogs.find(e => e.id === selectedError)?.resolutionNotes || 'No notes provided'}</p>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              {!errorLogs.find(e => e.id === selectedError)?.resolved && (
                <button
                  onClick={() => handleResolveError(selectedError)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm mr-3"
                >
                  Mark as Resolved
                </button>
              )}
              <button
                onClick={() => setSelectedError(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorLogs;