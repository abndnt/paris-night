import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg';
  color?: 'blue' | 'white' | 'gray';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = 'blue',
  className = ''
}) => {
  // Normalize size to handle both formats
  const normalizedSize = size === 'sm' ? 'small' : size === 'md' ? 'medium' : size === 'lg' ? 'large' : size;
  
  // Determine size class
  const sizeClass = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  }[normalizedSize];

  // Determine color classes
  const colorClass = {
    blue: 'text-blue-500',
    white: 'text-white',
    gray: 'text-gray-500',
  }[color];

  return (
    <div className={`flex justify-center items-center ${className}`} data-testid="loading-spinner">
      <svg 
        className={`animate-spin ${sizeClass} ${colorClass}`} 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        ></circle>
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );
};

export default LoadingSpinner;