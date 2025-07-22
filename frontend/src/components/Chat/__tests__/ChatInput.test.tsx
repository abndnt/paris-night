import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import ChatInput from '../ChatInput';
import chatReducer from '../../../store/slices/chatSlice';
import authReducer from '../../../store/slices/authSlice';
import chatWebSocketService from '../../../services/chatWebSocketService';

// Mock the WebSocket service
jest.mock('../../../services/chatWebSocketService', () => ({
  sendMessage: jest.fn(),
  sendTyping: jest.fn(),
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

describe('ChatInput', () => {
  const mockSessionId = 'test-session-id';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    renderWithProvider(<ChatInput sessionId={mockSessionId} />);
    
    expect(screen.getByPlaceholderText(/ask about flights/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('shows connecting placeholder when disabled', () => {
    renderWithProvider(<ChatInput sessionId={mockSessionId} disabled />);
    
    expect(screen.getByPlaceholderText(/connecting/i)).toBeInTheDocument();
  });

  it('handles text input correctly', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatInput sessionId={mockSessionId} />);
    
    const textarea = screen.getByPlaceholderText(/ask about flights/i);
    await user.type(textarea, 'Hello world');
    
    expect(textarea).toHaveValue('Hello world');
  });

  it('sends typing indicator when user types', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatInput sessionId={mockSessionId} />);
    
    const textarea = screen.getByPlaceholderText(/ask about flights/i);
    await user.type(textarea, 'H');
    
    expect(mockChatWebSocketService.sendTyping).toHaveBeenCalledWith(mockSessionId, true);
  });

  it('stops typing indicator after timeout', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    
    renderWithProvider(<ChatInput sessionId={mockSessionId} />);
    
    const textarea = screen.getByPlaceholderText(/ask about flights/i);
    await user.type(textarea, 'Hello');
    
    // Fast-forward time
    jest.advanceTimersByTime(1000);
    
    expect(mockChatWebSocketService.sendTyping).toHaveBeenCalledWith(mockSessionId, false);
    
    jest.useRealTimers();
  });

  it('sends message on form submit', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatInput sessionId={mockSessionId} />);
    
    const textarea = screen.getByPlaceholderText(/ask about flights/i);
    const submitButton = screen.getByRole('button', { name: /send message/i });
    
    await user.type(textarea, 'Test message');
    await user.click(submitButton);
    
    expect(mockChatWebSocketService.sendMessage).toHaveBeenCalledWith({
      content: 'Test message',
      sender: 'user',
      sessionId: mockSessionId,
    });
  });

  it('sends message on Enter key press', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatInput sessionId={mockSessionId} />);
    
    const textarea = screen.getByPlaceholderText(/ask about flights/i);
    
    await user.type(textarea, 'Test message');
    await user.keyboard('{Enter}');
    
    expect(mockChatWebSocketService.sendMessage).toHaveBeenCalledWith({
      content: 'Test message',
      sender: 'user',
      sessionId: mockSessionId,
    });
  });

  it('does not send message on Shift+Enter', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatInput sessionId={mockSessionId} />);
    
    const textarea = screen.getByPlaceholderText(/ask about flights/i);
    
    await user.type(textarea, 'Test message');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    
    expect(mockChatWebSocketService.sendMessage).not.toHaveBeenCalled();
  });

  it('clears input after sending message', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatInput sessionId={mockSessionId} />);
    
    const textarea = screen.getByPlaceholderText(/ask about flights/i);
    const submitButton = screen.getByRole('button', { name: /send message/i });
    
    await user.type(textarea, 'Test message');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });

  it('does not send empty messages', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatInput sessionId={mockSessionId} />);
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    
    await user.click(submitButton);
    
    expect(mockChatWebSocketService.sendMessage).not.toHaveBeenCalled();
  });

  it('does not send messages when disabled', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatInput sessionId={mockSessionId} disabled />);
    
    const textarea = screen.getByPlaceholderText(/connecting/i);
    const submitButton = screen.getByRole('button', { name: /send message/i });
    
    await user.type(textarea, 'Test message');
    await user.click(submitButton);
    
    expect(mockChatWebSocketService.sendMessage).not.toHaveBeenCalled();
  });

  it('shows character count when approaching limit', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatInput sessionId={mockSessionId} />);
    
    const textarea = screen.getByPlaceholderText(/ask about flights/i);
    const longMessage = 'a'.repeat(501);
    
    await user.type(textarea, longMessage);
    
    await waitFor(() => {
      expect(screen.getByText(/501\/1000/)).toBeInTheDocument();
    });
  }, 10000);

  it('shows loading state when submitting', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatInput sessionId={mockSessionId} />);
    
    const textarea = screen.getByPlaceholderText(/ask about flights/i);
    const submitButton = screen.getByRole('button', { name: /send message/i });
    
    await user.type(textarea, 'Test message');
    
    // Mock a slow response
    mockChatWebSocketService.sendMessage.mockImplementation(() => 'mock-id');
    
    await user.click(submitButton);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows typing indicator when user is typing', () => {
    renderWithProvider(
      <ChatInput sessionId={mockSessionId} />,
      { chat: { isTyping: true } }
    );
    
    expect(screen.getByText(/you are typing/i)).toBeInTheDocument();
  });

  it('auto-resizes textarea based on content', async () => {
    const user = userEvent.setup();
    renderWithProvider(<ChatInput sessionId={mockSessionId} />);
    
    const textarea = screen.getByPlaceholderText(/ask about flights/i) as HTMLTextAreaElement;
    const multilineMessage = 'Line 1\nLine 2\nLine 3';
    
    await user.type(textarea, multilineMessage);
    
    // The textarea should have adjusted its height
    expect(textarea.style.height).not.toBe('auto');
  });
});