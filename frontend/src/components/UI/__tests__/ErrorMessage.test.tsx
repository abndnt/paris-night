import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorMessage from '../ErrorMessage';

describe('ErrorMessage Component', () => {
  test('renders error message correctly', () => {
    render(<ErrorMessage message="An error occurred" />);
    
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  test('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage message="An error occurred" onDismiss={onDismiss} />);
    
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('shows recovery steps when button is clicked', () => {
    const recoverySteps = [
      'Check your internet connection',
      'Try again later',
      'Contact support if the problem persists'
    ];
    
    render(
      <ErrorMessage 
        message="An error occurred" 
        recoverySteps={recoverySteps} 
      />
    );
    
    // Initially recovery steps should not be visible
    expect(screen.queryByText(recoverySteps[0])).not.toBeInTheDocument();
    
    // Click to show recovery steps
    fireEvent.click(screen.getByText('Show recovery steps'));
    
    // Now recovery steps should be visible
    expect(screen.getByText(recoverySteps[0])).toBeInTheDocument();
    expect(screen.getByText(recoverySteps[1])).toBeInTheDocument();
    expect(screen.getByText(recoverySteps[2])).toBeInTheDocument();
    
    // Click to hide recovery steps
    fireEvent.click(screen.getByText('Hide recovery steps'));
    
    // Recovery steps should be hidden again
    expect(screen.queryByText(recoverySteps[0])).not.toBeInTheDocument();
  });

  test('shows support reference when provided', () => {
    render(
      <ErrorMessage 
        message="An error occurred" 
        supportReference="ERR-123-ABC" 
      />
    );
    
    expect(screen.getByText('Reference: ERR-123-ABC')).toBeInTheDocument();
  });

  test('shows retry button when retryable and onRetry provided', () => {
    const onRetry = jest.fn();
    render(
      <ErrorMessage 
        message="An error occurred" 
        retryable={true}
        onRetry={onRetry}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('does not show retry button when not retryable', () => {
    const onRetry = jest.fn();
    render(
      <ErrorMessage 
        message="An error occurred" 
        retryable={false}
        onRetry={onRetry}
      />
    );
    
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  test('renders with warning variant', () => {
    render(<ErrorMessage message="Warning message" variant="warning" />);
    
    // Check for warning icon (this is a simplified check)
    const warningIcon = document.querySelector('.text-yellow-400');
    expect(warningIcon).toBeInTheDocument();
  });

  test('renders with info variant', () => {
    render(<ErrorMessage message="Info message" variant="info" />);
    
    // Check for info icon (this is a simplified check)
    const infoIcon = document.querySelector('.text-blue-400');
    expect(infoIcon).toBeInTheDocument();
  });
});