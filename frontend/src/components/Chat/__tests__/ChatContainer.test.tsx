import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import ChatContainer from '../ChatContainer';
import chatReducer from '../../../store/slices/chatSlice';
import authReducer from '../../../store/slices/authSlice';
import chatWebSocketService from '../../../services/chatWebSocketService';

// Mock the WebSocket service
jest.mock('../../../services/chatWebSocketService', () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  joinSession: jest.fn(),
}));

const mockChatWebSocketService = chatWebSocketService as jest.Mocked<typeof chatWebSocketService>;

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
  auth?: Partial<{
    isAuthenticated: boolean;
    user: any;
    token: string | null;
    isLoading: boolean;
    error: string | null;
  }>;
}

const createMockStore = (initialState: MockState = {}) => {
  return configureStore({
    reducer: {
      chat: chatReducer,
      auth: authReducer,
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
      auth: {
        isAuthenticated: true,
        user: null,
        token: 'mock-token',
        isLoading: false,
        error: null,
        ...initialState.auth,
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

describe('ChatContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows login prompt when user is not authenticated', () => {
    renderWithProvider(
      <ChatContainer />,
      { auth: { isAuthenticated: false, token: null } }
    );

    expect(screen.getByText(/please log in to start chatting/i)).toBeInTheDocument();
  });

  it('connects to WebSocket when authenticated', () => {
    renderWithProvider(<ChatContainer />);

    expect(mockChatWebSocketService.connect).toHaveBeenCalledWith('mock-token');
  });

  it('disconnects WebSocket on unmount', () => {
    const { unmount } = renderWithProvider(<ChatContainer />);

    unmount();

    expect(mockChatWebSocketService.disconnect).toHaveBeenCalled();
  });

  it('creates initial session when none exists', async () => {
    renderWithProvider(<ChatContainer />);

    await waitFor(() => {
      expect(screen.getByText(/new chat/i)).toBeInTheDocument();
    });
  });

  it('shows welcome message when no session is selected', () => {
    renderWithProvider(
      <ChatContainer />,
      {
        chat: {
          sessions: [
            {
              id: 'session-1',
              title: 'Test Session',
              createdAt: Date.now(),
              lastMessageAt: Date.now(),
              messages: []
            }
          ],
          currentSessionId: null
        }
      }
    );

    expect(screen.getByText(/welcome to flight search chat/i)).toBeInTheDocument();
    expect(screen.getByText(/start a new conversation/i)).toBeInTheDocument();
  });

  it('renders chat interface when session is selected', () => {
    const mockSession = {
      id: 'session-1',
      title: 'Test Session',
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      messages: []
    };

    renderWithProvider(
      <ChatContainer />,
      {
        chat: {
          sessions: [mockSession],
          currentSessionId: 'session-1'
        }
      }
    );

    expect(screen.getByText('Test Session')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask about flights/i)).toBeInTheDocument();
  });

  it('handles new chat button click', async () => {
    const user = userEvent.setup();

    renderWithProvider(
      <ChatContainer />,
      {
        chat: {
          sessions: [],
          currentSessionId: null
        }
      }
    );

    const newChatButton = screen.getByText(/start new chat/i);
    await user.click(newChatButton);

    // Should create a new session
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask about flights/i)).toBeInTheDocument();
    });
  });

  it('handles session selection', async () => {
    const user = userEvent.setup();
    const mockSessions = [
      {
        id: 'session-1',
        title: 'First Session',
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        messages: []
      },
      {
        id: 'session-2',
        title: 'Second Session',
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        messages: []
      }
    ];

    renderWithProvider(
      <ChatContainer />,
      {
        chat: {
          sessions: mockSessions,
          currentSessionId: 'session-1'
        }
      }
    );

    await user.click(screen.getByText('Second Session'));

    expect(mockChatWebSocketService.joinSession).toHaveBeenCalledWith('session-2');
  });

  it('shows connection status in header', () => {
    renderWithProvider(
      <ChatContainer />,
      {
        chat: {
          sessions: [{
            id: 'session-1',
            title: 'Test Session',
            createdAt: Date.now(),
            lastMessageAt: Date.now(),
            messages: []
          }],
          currentSessionId: 'session-1',
          isConnected: true
        }
      }
    );

    expect(screen.getByText(/connected/i)).toBeInTheDocument();
  });

  it('shows connection error in header', () => {
    renderWithProvider(
      <ChatContainer />,
      {
        chat: {
          sessions: [{
            id: 'session-1',
            title: 'Test Session',
            createdAt: Date.now(),
            lastMessageAt: Date.now(),
            messages: []
          }],
          currentSessionId: 'session-1',
          connectionError: 'Connection failed'
        }
      }
    );

    expect(screen.getByText(/connection error/i)).toBeInTheDocument();
  });

  it('disables input when not connected', () => {
    renderWithProvider(
      <ChatContainer />,
      {
        chat: {
          sessions: [{
            id: 'session-1',
            title: 'Test Session',
            createdAt: Date.now(),
            lastMessageAt: Date.now(),
            messages: []
          }],
          currentSessionId: 'session-1',
          isConnected: false
        }
      }
    );

    const input = screen.getByPlaceholderText(/connecting/i);
    expect(input).toBeDisabled();
  });

  it('renders sidebar with sessions', () => {
    const mockSessions = [
      {
        id: 'session-1',
        title: 'Flight to Paris',
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        messages: []
      },
      {
        id: 'session-2',
        title: 'Hotel booking',
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        messages: []
      }
    ];

    renderWithProvider(
      <ChatContainer />,
      {
        chat: {
          sessions: mockSessions,
          currentSessionId: 'session-1'
        }
      }
    );

    expect(screen.getByText('Flight to Paris')).toBeInTheDocument();
    expect(screen.getByText('Hotel booking')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProvider(
      <ChatContainer className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles WebSocket reconnection', () => {
    renderWithProvider(
      <ChatContainer />,
      {
        auth: {
          isAuthenticated: true,
          token: 'new-token'
        }
      }
    );

    expect(mockChatWebSocketService.connect).toHaveBeenCalledWith('new-token');
  });

  it('shows message count in session list', () => {
    const mockSession = {
      id: 'session-1',
      title: 'Test Session',
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      messages: [
        {
          id: 'msg-1',
          content: 'Test message',
          sender: 'user' as const,
          timestamp: Date.now(),
          status: 'delivered' as const,
          sessionId: 'session-1'
        }
      ]
    };

    renderWithProvider(
      <ChatContainer />,
      {
        chat: {
          sessions: [mockSession],
          currentSessionId: 'session-1'
        }
      }
    );

    expect(screen.getByText('1 message')).toBeInTheDocument();
  });

  it('handles empty sessions gracefully', () => {
    renderWithProvider(
      <ChatContainer />,
      {
        chat: {
          sessions: [],
          currentSessionId: null
        }
      }
    );

    // Should show welcome message or create initial session
    expect(screen.getByText(/welcome to flight search chat/i)).toBeInTheDocument();
  });
});