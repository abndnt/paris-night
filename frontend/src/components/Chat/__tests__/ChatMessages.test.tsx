import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ChatMessages from '../ChatMessages';
import chatReducer from '../../../store/slices/chatSlice';
import { Message } from '../../../store/slices/chatSlice';

const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: `message-${Date.now()}-${Math.random()}`,
  content: 'Test message content',
  sender: 'user',
  timestamp: Date.now(),
  status: 'delivered',
  sessionId: 'test-session-id',
  ...overrides,
});

interface MockState {
  chat?: Partial<{
    sessions: any[];
    currentSessionId: string | null;
    isConnected: boolean;
    isTyping: boolean;
    assistantTyping: boolean;
    connectionError: string | null;
    isLoading: boolean;
  }>;
}

const createMockStore = (initialState: MockState = {}) => {
  return configureStore({
    reducer: {
      chat: chatReducer,
    },
    preloadedState: {
      chat: {
        sessions: [],
        currentSessionId: null,
        isConnected: true,
        isTyping: false,
        assistantTyping: false,
        connectionError: null,
        isLoading: false,
        ...initialState.chat,
      },
    },
  });
};

const renderWithProvider = (component: React.ReactElement, initialState: MockState = {}) => {
  const store = createMockStore(initialState);
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store,
  };
};

describe('ChatMessages', () => {
  const mockSessionId = 'test-session-id';

  it('renders empty state when no messages', () => {
    renderWithProvider(<ChatMessages messages={[]} sessionId={mockSessionId} />);
    
    expect(screen.getByText(/start your flight search/i)).toBeInTheDocument();
    expect(screen.getByText(/ask me about flights/i)).toBeInTheDocument();
  });

  it('renders messages correctly', () => {
    const messages = [
      createMockMessage({ content: 'First message', sender: 'user' }),
      createMockMessage({ content: 'Second message', sender: 'assistant' }),
    ];
    
    renderWithProvider(<ChatMessages messages={messages} sessionId={mockSessionId} />);
    
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });

  it('shows typing indicator when assistant is typing', () => {
    renderWithProvider(
      <ChatMessages messages={[]} sessionId={mockSessionId} />,
      { chat: { assistantTyping: true } }
    );
    
    // TypingIndicator should be rendered
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('does not show typing indicator when assistant is not typing', () => {
    renderWithProvider(
      <ChatMessages messages={[]} sessionId={mockSessionId} />,
      { chat: { assistantTyping: false } }
    );
    
    // Should not show typing indicator in empty state
    expect(screen.queryByText('AI')).not.toBeInTheDocument();
  });

  it('shows timestamps for messages', () => {
    const now = Date.now();
    const messages = [
      createMockMessage({ timestamp: now }),
    ];
    
    renderWithProvider(<ChatMessages messages={messages} sessionId={mockSessionId} />);
    
    // Should show formatted time
    const timeString = new Date(now).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    expect(screen.getByText(timeString)).toBeInTheDocument();
  });

  it('groups messages by time and sender', () => {
    const baseTime = Date.now();
    const messages = [
      createMockMessage({ 
        timestamp: baseTime, 
        sender: 'user',
        content: 'Message 1'
      }),
      createMockMessage({ 
        timestamp: baseTime + 1000, // 1 second later
        sender: 'user',
        content: 'Message 2'
      }),
      createMockMessage({ 
        timestamp: baseTime + 6 * 60 * 1000, // 6 minutes later
        sender: 'user',
        content: 'Message 3'
      }),
    ];
    
    renderWithProvider(<ChatMessages messages={messages} sessionId={mockSessionId} />);
    
    // Should show timestamps for first and third message (time gap > 5 minutes)
    const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
    expect(timestamps.length).toBeGreaterThan(1);
  });

  it('shows timestamp when sender changes', () => {
    const baseTime = Date.now();
    const messages = [
      createMockMessage({ 
        timestamp: baseTime, 
        sender: 'user',
        content: 'User message'
      }),
      createMockMessage({ 
        timestamp: baseTime + 1000, // 1 second later, different sender
        sender: 'assistant',
        content: 'Assistant message'
      }),
    ];
    
    renderWithProvider(<ChatMessages messages={messages} sessionId={mockSessionId} />);
    
    // Should show timestamps for both messages due to sender change
    const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
    expect(timestamps).toHaveLength(2);
  });

  it('scrolls to bottom when new messages arrive', () => {
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    
    renderWithProvider(
      <ChatMessages messages={[]} sessionId={mockSessionId} />
    );
    
    const newMessages = [createMockMessage()];
    
    renderWithProvider(
      <ChatMessages messages={newMessages} sessionId={mockSessionId} />
    );
    
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('scrolls to bottom when typing indicator appears', () => {
    const scrollIntoViewMock = jest.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    
    renderWithProvider(
      <ChatMessages messages={[]} sessionId={mockSessionId} />,
      { chat: { assistantTyping: true } }
    );
    
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('handles empty message list gracefully', () => {
    renderWithProvider(<ChatMessages messages={[]} sessionId={mockSessionId} />);
    
    expect(screen.getByText(/start your flight search/i)).toBeInTheDocument();
  });

  it('renders messages in correct order', () => {
    const messages = [
      createMockMessage({ content: 'First', timestamp: 1000 }),
      createMockMessage({ content: 'Second', timestamp: 2000 }),
      createMockMessage({ content: 'Third', timestamp: 3000 }),
    ];
    
    renderWithProvider(<ChatMessages messages={messages} sessionId={mockSessionId} />);
    
    const messageElements = screen.getAllByText(/First|Second|Third/);
    expect(messageElements[0]).toHaveTextContent('First');
    expect(messageElements[1]).toHaveTextContent('Second');
    expect(messageElements[2]).toHaveTextContent('Third');
  });

  it('applies correct styling for scrollable container', () => {
    renderWithProvider(<ChatMessages messages={[]} sessionId={mockSessionId} />);
    
    const container = screen.getByText(/start your flight search/i).closest('.flex-1');
    expect(container).toHaveClass('overflow-y-auto');
  });

  it('shows appropriate empty state content', () => {
    renderWithProvider(<ChatMessages messages={[]} sessionId={mockSessionId} />);
    
    expect(screen.getByText(/start your flight search/i)).toBeInTheDocument();
    expect(screen.getByText(/ask me about flights, destinations, or travel planning/i)).toBeInTheDocument();
  });
});