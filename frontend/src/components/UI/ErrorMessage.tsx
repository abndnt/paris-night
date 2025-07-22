import React, { useState } from 'react';

interface ErrorMessageProps {
  message: string;
  recoverySteps?: string[];
  supportReference?: string;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'info';
  retryable?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  recoverySteps,
  supportReference,
  onDismiss, 
  onRetry,
  className = '',
  variant = 'error',
  retryable = false
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const bgColor = variant === 'error' ? 'bg-red-50' : 
                  variant === 'warning' ? 'bg-yellow-50' : 'bg-blue-50';
  
  const borderColor = variant === 'error' ? 'border-red-200' : 
                      variant === 'warning' ? 'border-yellow-200' : 'border-blue-200';
  
  const textColor = variant === 'error' ? 'text-red-800' : 
                    variant === 'warning' ? 'text-yellow-800' : 'text-blue-800';
                    
  const iconColor = variant === 'error' ? 'text-red-400' : 
                    variant === 'warning' ? 'text-yellow-400' : 'text-blue-400';
                    
  const buttonBgColor = variant === 'error' ? 'bg-red-600 hover:bg-red-700' : 
                        variant === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' : 
                        'bg-blue-600 hover:bg-blue-700';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-md p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {variant === 'error' && (
            <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {variant === 'warning' && (
            <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {variant === 'info' && (
            <svg className={`h-5 w-5 ${iconColor}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${textColor}`}>{message}</p>
          
          {recoverySteps && recoverySteps.length > 0 && (
            <div className="mt-2">
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-gray-600 underline focus:outline-none"
                type="button"
              >
                {showDetails ? 'Hide recovery steps' : 'Show recovery steps'}
              </button>
              
              {showDetails && (
                <ul className="mt-2 text-sm text-gray-600 list-disc pl-5 space-y-1">
                  {recoverySteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          
          {supportReference && (
            <p className="mt-1 text-xs text-gray-500">
              Reference: {supportReference}
            </p>
          )}
          
          {(onRetry && retryable) && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                type="button"
                className={`inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-white ${buttonBgColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
              >
                <svg className="mr-1.5 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          )}
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex ${bgColor} rounded-md p-1.5 ${textColor} hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600`}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;