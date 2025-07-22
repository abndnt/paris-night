import React from 'react';
import { render, screen } from '@testing-library/react';
import OfflineIndicator from '../OfflineIndicator';

describe('OfflineIndicator', () => {
  it('renders the offline message', () => {
    render(<OfflineIndicator />);
    
    expect(screen.getByText('You are offline. Some features may be limited.')).toBeInTheDocument();
  });
  
  it('has the correct styling', () => {
    const { container } = render(<OfflineIndicator />);
    
    const indicator = container.firstChild as HTMLElement;
    expect(indicator).toHaveClass('fixed');
    expect(indicator).toHaveClass('bg-yellow-500');
    expect(indicator).toHaveClass('z-50');
  });
});