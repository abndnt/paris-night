import React from 'react';
import { render, screen } from '@testing-library/react';
import MessageBubble from '../MessageBubble';
import { Message } from '../../../store/slices/chatSlice';

const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'test-message-id',
  content: 'Test message content',
  sender: 'user',
  timestamp: Date.now(),
  status: 'delivered',
  sessionId: 'test-session-id',
  ...overrides,
});

describe('MessageBubble', () => {
  it('renders user message correctly', () => {
    const message = createMockMessage({ sender: 'user' });
    render(<MessageBubble message={message} />);
    
    expect(screen.getByText('Test message content')).toBeInTheDocument();
    expect(screen.getByText('U')).toBeInTheDocument(); // User avatar
  });

  it('renders assistant message correctly', () => {
    const message = createMockMessage({ sender: 'assistant' });
    render(<MessageBubble message={message} />);
    
    expect(screen.getByText('Test message content')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument(); // Assistant avatar
  });

  it('applies correct styling for user messages', () => {
    const message = createMockMessage({ sender: 'user' });
    render(<MessageBubble message={message} />);
    
    const bubble = screen.getByText('Test message content').closest('div');
    expect(bubble).toHaveClass('bg-blue-600', 'text-white');
  });

  it('applies correct styling for assistant messages', () => {
    const message = createMockMessage({ sender: 'assistant' });
    render(<MessageBubble message={message} />);
    
    const bubble = screen.getByText('Test message content').closest('div');
    expect(bubble).toHaveClass('bg-gray-100', 'text-gray-900');
  });

  it('shows sending status icon', () => {
    const message = createMockMessage({ status: 'sending' });
    render(<MessageBubble message={message} />);
    
    const statusIcon = screen.getByRole('img', { hidden: true });
    expect(statusIcon).toHaveClass('animate-spin');
  });

  it('shows sent status icon', () => {
    const message = createMockMessage({ status: 'sent' });
    render(<MessageBubble message={message} />);
    
    // Check for checkmark icon
    const statusIcon = screen.getByRole('img', { hidden: true });
    expect(statusIcon).toHaveClass('text-gray-400');
  });

  it('shows delivered status icon', () => {
    const message = createMockMessage({ status: 'delivered' });
    render(<MessageBubble message={message} />);
    
    // Check for blue checkmark icon
    const statusIcon = screen.getByRole('img', { hidden: true });
    expect(statusIcon).toHaveClass('text-blue-500');
  });

  it('shows error status icon', () => {
    const message = createMockMessage({ status: 'error' });
    render(<MessageBubble message={message} />);
    
    // Check for error icon
    const statusIcon = screen.getByRole('img', { hidden: true });
    expect(statusIcon).toHaveClass('text-red-500');
  });

  it('does not show status icon for assistant messages', () => {
    const message = createMockMessage({ 
      sender: 'assistant',
      status: 'delivered'
    });
    render(<MessageBubble message={message} />);
    
    // Status icons should only appear for user messages
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });

  it('formats multiline content correctly', () => {
    const message = createMockMessage({ 
      content: 'Line 1\nLine 2\nLine 3'
    });
    render(<MessageBubble message={message} />);
    
    const content = screen.getByText(/Line 1/);
    expect(content).toBeInTheDocument();
    expect(screen.getByText(/Line 2/)).toBeInTheDocument();
    expect(screen.getByText(/Line 3/)).toBeInTheDocument();
  });

  it('handles long content with word wrapping', () => {
    const longContent = 'This is a very long message that should wrap properly when displayed in the message bubble component';
    const message = createMockMessage({ content: longContent });
    render(<MessageBubble message={message} />);
    
    const bubble = screen.getByText(longContent).closest('div');
    expect(bubble).toHaveClass('break-words');
  });

  it('preserves whitespace in content', () => {
    const message = createMockMessage({ 
      content: 'Content with    multiple    spaces'
    });
    render(<MessageBubble message={message} />);
    
    const content = screen.getByText(/Content with.*multiple.*spaces/);
    expect(content).toHaveClass('whitespace-pre-wrap');
  });

  it('positions user messages on the right', () => {
    const message = createMockMessage({ sender: 'user' });
    render(<MessageBubble message={message} />);
    
    const container = screen.getByText('Test message content').closest('.flex');
    expect(container).toHaveClass('justify-end');
  });

  it('positions assistant messages on the left', () => {
    const message = createMockMessage({ sender: 'assistant' });
    render(<MessageBubble message={message} />);
    
    const container = screen.getByText('Test message content').closest('.flex');
    expect(container).toHaveClass('justify-start');
  });

  it('limits message width appropriately', () => {
    const message = createMockMessage();
    render(<MessageBubble message={message} />);
    
    const messageContainer = screen.getByText('Test message content').closest('.max-w-xs');
    expect(messageContainer).toHaveClass('max-w-xs', 'lg:max-w-md');
  });

  it('handles empty content gracefully', () => {
    const message = createMockMessage({ content: '' });
    render(<MessageBubble message={message} />);
    
    // Should still render the bubble structure
    expect(screen.getByText('U')).toBeInTheDocument();
  });
});