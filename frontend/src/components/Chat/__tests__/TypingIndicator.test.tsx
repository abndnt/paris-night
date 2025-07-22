import React from 'react';
import { render, screen } from '@testing-library/react';
import TypingIndicator from '../TypingIndicator';

describe('TypingIndicator', () => {
  it('renders correctly', () => {
    render(<TypingIndicator />);
    
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('shows assistant avatar', () => {
    render(<TypingIndicator />);
    
    const avatar = screen.getByText('AI');
    expect(avatar).toHaveClass('bg-gray-600', 'text-white');
  });

  it('displays animated dots', () => {
    render(<TypingIndicator />);
    
    const dots = screen.getAllByRole('generic');
    const animatedDots = dots.filter(dot => 
      dot.className.includes('animate-bounce') && 
      dot.className.includes('bg-gray-400')
    );
    
    expect(animatedDots).toHaveLength(3);
  });

  it('has proper styling for typing bubble', () => {
    render(<TypingIndicator />);
    
    const bubble = screen.getByText('AI').closest('.flex')?.querySelector('.bg-gray-100');
    expect(bubble).toHaveClass('bg-gray-100', 'rounded-lg', 'rounded-bl-sm');
  });

  it('positions correctly on the left side', () => {
    render(<TypingIndicator />);
    
    const container = screen.getByText('AI').closest('.flex');
    expect(container).toHaveClass('max-w-xs', 'lg:max-w-md');
  });

  it('has staggered animation delays for dots', () => {
    render(<TypingIndicator />);
    
    const container = screen.getByText('AI').parentElement?.parentElement;
    const dots = container?.querySelectorAll('.animate-bounce');
    
    expect(dots).toHaveLength(3);
    
    // Check that dots have different animation delays
    if (dots) {
      expect(dots[0]).not.toHaveStyle('animation-delay: 0.1s');
      expect(dots[1]).toHaveStyle('animation-delay: 0.1s');
      expect(dots[2]).toHaveStyle('animation-delay: 0.2s');
    }
  });

  it('maintains consistent sizing with message bubbles', () => {
    render(<TypingIndicator />);
    
    const avatar = screen.getByText('AI');
    expect(avatar).toHaveClass('w-8', 'h-8', 'rounded-full');
  });
});