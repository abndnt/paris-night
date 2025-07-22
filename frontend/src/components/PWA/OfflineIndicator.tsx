import React from 'react';

/**
 * Component that displays when the user is offline
 */
const OfflineIndicator: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-1 z-50">
      <div className="flex items-center justify-center space-x-2">
        <svg 
          className="w-4 h-4" 
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
        <span className="text-sm font-medium">You are offline. Some features may be limited.</span>
      </div>
    </div>
  );
};

export default OfflineIndicator;