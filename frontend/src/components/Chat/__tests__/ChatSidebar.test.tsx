import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatSidebar from '../ChatSidebar';
import { ChatSession } from '../../../store/slices/chatSlice';

const createMockSession = (overrides: Partial<ChatSession> = {}): ChatSession => ({
  id: `session-${Date.now()}-${Math.random()}`,
  title: 'Test Session',
  createdAt: Date.now(),
  lastMessageAt: Date.now(),
  messages: [],
  ...overrides,
});

describe('ChatSidebar', () => {
  const mockOnSessionSelect = jest.fn();
  const mockOnNewChat = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with empty sessions', () => {
    render(
      <ChatSidebar
        sessions={[]}
        currentSessionId={null}
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search conversations/i)).toBeInTheDocument();
    expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
  });

  it('renders sessions list correctly', () => {
    const sessions = [
      createMockSession({ title: 'Flight to Paris', id: 'session-1' }),
      createMockSession({ title: 'Hotel booking', id: 'session-2' }),
    ];
    
    render(
      <ChatSidebar
        sessions={sessions}
        currentSessionId={null}
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    expect(screen.getByText('Flight to Paris')).toBeInTheDocument();
    expect(screen.getByText('Hotel booking')).toBeInTheDocument();
  });

  it('highlights current session', () => {
    const sessions = [
      createMockSession({ title: 'Flight to Paris', id: 'session-1' }),
      createMockSession({ title: 'Hotel booking', id: 'session-2' }),
    ];
    
    render(
      <ChatSidebar
        sessions={sessions}
        currentSessionId="session-1"
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    const currentSessionButton = screen.getByText('Flight to Paris').closest('button');
    expect(currentSessionButton).toHaveClass('bg-blue-100', 'border-l-4', 'border-blue-600');
  });

  it('calls onNewChat when new chat button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ChatSidebar
        sessions={[]}
        currentSessionId={null}
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    await user.click(screen.getByText('New Chat'));
    expect(mockOnNewChat).toHaveBeenCalledTimes(1);
  });

  it('calls onSessionSelect when session is clicked', async () => {
    const user = userEvent.setup();
    const sessions = [
      createMockSession({ title: 'Flight to Paris', id: 'session-1' }),
    ];
    
    render(
      <ChatSidebar
        sessions={sessions}
        currentSessionId={null}
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    await user.click(screen.getByText('Flight to Paris'));
    expect(mockOnSessionSelect).toHaveBeenCalledWith('session-1');
  });

  it('filters sessions based on search term', async () => {
    const user = userEvent.setup();
    const sessions = [
      createMockSession({ title: 'Flight to Paris', id: 'session-1' }),
      createMockSession({ title: 'Hotel booking', id: 'session-2' }),
      createMockSession({ title: 'Car rental', id: 'session-3' }),
    ];
    
    render(
      <ChatSidebar
        sessions={sessions}
        currentSessionId={null}
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    const searchInput = screen.getByPlaceholderText(/search conversations/i);
    await user.type(searchInput, 'flight');
    
    expect(screen.getByText('Flight to Paris')).toBeInTheDocument();
    expect(screen.queryByText('Hotel booking')).not.toBeInTheDocument();
    expect(screen.queryByText('Car rental')).not.toBeInTheDocument();
  });

  it('shows no results message when search yields no matches', async () => {
    const user = userEvent.setup();
    const sessions = [
      createMockSession({ title: 'Flight to Paris', id: 'session-1' }),
    ];
    
    render(
      <ChatSidebar
        sessions={sessions}
        currentSessionId={null}
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    const searchInput = screen.getByPlaceholderText(/search conversations/i);
    await user.type(searchInput, 'nonexistent');
    
    expect(screen.getByText(/no conversations found/i)).toBeInTheDocument();
  });

  it('displays session metadata correctly', () => {
    const now = Date.now();
    const sessions = [
      createMockSession({ 
        title: 'Flight to Paris',
        lastMessageAt: now,
        messages: [
          {
            id: 'msg-1',
            content: 'Looking for flights to Paris',
            sender: 'user',
            timestamp: now,
            status: 'delivered',
            sessionId: 'session-1'
          }
        ]
      }),
    ];
    
    render(
      <ChatSidebar
        sessions={sessions}
        currentSessionId={null}
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    expect(screen.getByText('Looking for flights to Paris')).toBeInTheDocument();
    expect(screen.getByText('1 msg')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('truncates long session titles', () => {
    const longTitle = 'This is a very long session title that should be truncated when displayed in the sidebar';
    const sessions = [
      createMockSession({ title: longTitle }),
    ];
    
    render(
      <ChatSidebar
        sessions={sessions}
        currentSessionId={null}
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    const titleElement = screen.getByText(longTitle);
    expect(titleElement).toHaveClass('truncate');
  });

  it('truncates long last messages', () => {
    const longMessage = 'This is a very long message that should be truncated when displayed as the last message preview in the sidebar';
    const sessions = [
      createMockSession({ 
        messages: [{
          id: 'msg-1',
          content: longMessage,
          sender: 'user',
          timestamp: Date.now(),
          status: 'delivered',
          sessionId: 'session-1'
        }]
      }),
    ];
    
    render(
      <ChatSidebar
        sessions={sessions}
        currentSessionId={null}
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    // Should show truncated version
    expect(screen.getByText(/This is a very long message that should be truncated/)).toBeInTheDocument();
    expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    const yesterday = Date.now() - (24 * 60 * 60 * 1000);
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const sessions = [
      createMockSession({ lastMessageAt: Date.now(), id: 'today' }),
      createMockSession({ lastMessageAt: yesterday, id: 'yesterday' }),
      createMockSession({ lastMessageAt: weekAgo, id: 'week-ago' }),
    ];
    
    render(
      <ChatSidebar
        sessions={sessions}
        currentSessionId={null}
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
  });

  it('shows message count correctly', () => {
    const sessions = [
      createMockSession({ 
        messages: [],
        id: 'empty'
      }),
      createMockSession({ 
        messages: [
          {
            id: 'msg-1',
            content: 'Single message',
            sender: 'user',
            timestamp: Date.now(),
            status: 'delivered',
            sessionId: 'single'
          }
        ],
        id: 'single'
      }),
      createMockSession({ 
        messages: [
          {
            id: 'msg-1',
            content: 'First message',
            sender: 'user',
            timestamp: Date.now(),
            status: 'delivered',
            sessionId: 'multiple'
          },
          {
            id: 'msg-2',
            content: 'Second message',
            sender: 'assistant',
            timestamp: Date.now(),
            status: 'delivered',
            sessionId: 'multiple'
          }
        ],
        id: 'multiple'
      }),
    ];
    
    render(
      <ChatSidebar
        sessions={sessions}
        currentSessionId={null}
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    expect(screen.getByText('0 msgs')).toBeInTheDocument();
    expect(screen.getByText('1 msg')).toBeInTheDocument();
    expect(screen.getByText('2 msgs')).toBeInTheDocument();
  });

  it('shows no messages placeholder for empty sessions', () => {
    const sessions = [
      createMockSession({ messages: [] }),
    ];
    
    render(
      <ChatSidebar
        sessions={sessions}
        currentSessionId={null}
        onSessionSelect={mockOnSessionSelect}
        onNewChat={mockOnNewChat}
      />
    );
    
    expect(screen.getByText('No messages')).toBeInTheDocument();
  });
});