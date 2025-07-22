import React from 'react';

interface ErrorFallbackProps {
  error: Error | null;
  resetErrorBoundary: () => void;
}

/**
 * Default error fallback UI component
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg mx-auto my-8 border-l-4 border-red-500">
      <div className="flex items-center mb-4">
        <svg 
          className="w-8 h-8 text-red-500 mr-3" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
        <h2 className="text-xl font-semibold text-gray-800">Something went wrong</h2>
      </div>
      
      <div className="mb-4">
        <p className="text-gray-600 mb-2">
          We're sorry, but an error occurred while rendering this component.
        </p>
        {error && (
          <div className="bg-red-50 p-3 rounded border border-red-100 text-sm font-mono text-red-800 overflow-auto max-h-32">
            {error.message}
          </div>
        )}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
        >
          Reload page
        </button>
      </div>
    </div>
  );
};

export default ErrorFallback;