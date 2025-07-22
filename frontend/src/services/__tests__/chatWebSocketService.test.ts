import { io } from 'socket.io-client';
import { store } from '../../store/store';
import chatWebSocketService from '../chatWebSocketService';
import {
  setConnected,
  setConnectionError,
  addMessage,
  updateMessageStatus,
  setAssistantTyping,
} from '../../store/slices/chatSlice';

// Mock socket.io-client
jest.mock('socket.io-client');
const mockIo = io as jest.MockedFunction<typeof io>;

// Mock the store
jest.mock('../../store/store', () => ({
  store: {
    dispatch: jest.fn(),
  },
}));

const mockStore = store as jest.Mocked<typeof store>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('ChatWebSocketService', () => {
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Create mock socket
    mockSocket = {
      connected: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };
    
    mockIo.mockReturnValue(mockSocket);
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('connect', () => {
    it('creates socket connection with correct configuration', () => {
      chatWebSocketService.connect('test-token');
      
      expect(mockIo).toHaveBeenCalledWith('http://localhost:3001', {
        auth: {
          token: 'test-token',
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
      });
    });

    it('uses token from localStorage if not provided', () => {
      chatWebSocketService.connect();
      
      expect(mockIo).toHaveBeenCalledWith('http://localhost:3001', {
        auth: {
          token: 'mock-token',
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
      });
    });

    it('does not create new connection if already connected', () => {
      mockSocket.connected = true;
      
      chatWebSocketService.connect('test-token');
      
      expect(mockIo).not.toHaveBeenCalled();
    });

    it('sets up event listeners', () => {
      chatWebSocketService.connect('test-token');
      
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('chat:message', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('chat:message:status', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('chat:typing', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('chat:error', expect.any(Function));
    });
  });

  describe('disconnect', () => {
    it('disconnects socket and updates store', () => {
      chatWebSocketService.connect('test-token');
      chatWebSocketService.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalledWith(setConnected(false));
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      chatWebSocketService.connect('test-token');
      mockSocket.connected = true;
    });

    it('sends message and adds to store', () => {
      const messageData = {
        content: 'Test message',
        sender: 'user' as const,
        sessionId: 'test-session',
      };
      
      const messageId = chatWebSocketService.sendMessage(messageData);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('chat:message', {
        id: messageId,
        content: 'Test message',
        sessionId: 'test-session',
      });
      
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        addMessage({
          ...messageData,
          id: messageId,
          timestamp: expect.any(Number),
          status: 'sending',
        })
      );
    });

    it('throws error when not connected', () => {
      mockSocket.connected = false;
      
      expect(() => {
        chatWebSocketService.sendMessage({
          content: 'Test',
          sender: 'user',
          sessionId: 'test',
        });
      }).toThrow('WebSocket not connected');
    });

    it('generates unique message IDs', () => {
      const id1 = chatWebSocketService.sendMessage({
        content: 'Message 1',
        sender: 'user',
        sessionId: 'test',
      });
      
      const id2 = chatWebSocketService.sendMessage({
        content: 'Message 2',
        sender: 'user',
        sessionId: 'test',
      });
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('joinSession', () => {
    it('emits join event when connected', () => {
      chatWebSocketService.connect('test-token');
      mockSocket.connected = true;
      
      chatWebSocketService.joinSession('test-session');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('chat:join', {
        sessionId: 'test-session',
      });
    });

    it('does not emit when not connected', () => {
      chatWebSocketService.connect('test-token');
      mockSocket.connected = false;
      
      chatWebSocketService.joinSession('test-session');
      
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('leaveSession', () => {
    it('emits leave event when connected', () => {
      chatWebSocketService.connect('test-token');
      mockSocket.connected = true;
      
      chatWebSocketService.leaveSession('test-session');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('chat:leave', {
        sessionId: 'test-session',
      });
    });
  });

  describe('sendTyping', () => {
    it('emits typing event when connected', () => {
      chatWebSocketService.connect('test-token');
      mockSocket.connected = true;
      
      chatWebSocketService.sendTyping('test-session', true);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('chat:typing', {
        sessionId: 'test-session',
        isTyping: true,
      });
    });
  });

  describe('event handlers', () => {
    let eventHandlers: { [key: string]: Function };

    beforeEach(() => {
      eventHandlers = {};
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      });
      
      chatWebSocketService.connect('test-token');
    });

    it('handles connect event', () => {
      eventHandlers['connect']();
      
      expect(mockStore.dispatch).toHaveBeenCalledWith(setConnected(true));
    });

    it('handles disconnect event', () => {
      eventHandlers['disconnect']('io server disconnect');
      
      expect(mockStore.dispatch).toHaveBeenCalledWith(setConnected(false));
    });

    it('handles connect_error event', () => {
      const error = new Error('Connection failed');
      eventHandlers['connect_error'](error);
      
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        setConnectionError('Connection failed')
      );
    });

    it('handles chat:message event', () => {
      const messageData = {
        id: 'msg-123',
        content: 'Assistant response',
        sender: 'assistant',
        sessionId: 'test-session',
        timestamp: Date.now(),
      };
      
      eventHandlers['chat:message'](messageData);
      
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        addMessage({
          ...messageData,
          status: 'delivered',
        })
      );
    });

    it('handles chat:message:status event', () => {
      const statusData = {
        messageId: 'msg-123',
        status: 'sent' as const,
      };
      
      eventHandlers['chat:message:status'](statusData);
      
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        updateMessageStatus(statusData)
      );
    });

    it('handles chat:typing event', () => {
      const typingData = {
        sessionId: 'test-session',
        isTyping: true,
      };
      
      eventHandlers['chat:typing'](typingData);
      
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        setAssistantTyping(true)
      );
    });

    it('handles chat:error event', () => {
      const errorData = {
        error: 'Chat service error',
      };
      
      eventHandlers['chat:error'](errorData);
      
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        setConnectionError('Chat service error')
      );
    });
  });

  describe('reconnection logic', () => {
    let eventHandlers: { [key: string]: Function };

    beforeEach(() => {
      eventHandlers = {};
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      });
      
      chatWebSocketService.connect('test-token');
    });

    it('attempts reconnection on disconnect', () => {
      const connectSpy = jest.spyOn(chatWebSocketService, 'connect');
      
      eventHandlers['disconnect']('transport close');
      
      jest.advanceTimersByTime(1000);
      
      expect(connectSpy).toHaveBeenCalled();
    });

    it('does not reconnect on server disconnect', () => {
      const connectSpy = jest.spyOn(chatWebSocketService, 'connect');
      
      eventHandlers['disconnect']('io server disconnect');
      
      jest.advanceTimersByTime(5000);
      
      expect(connectSpy).not.toHaveBeenCalled();
    });

    it('uses exponential backoff for reconnection', () => {
      const connectSpy = jest.spyOn(chatWebSocketService, 'connect');
      
      // First reconnection attempt
      eventHandlers['connect_error'](new Error('Failed'));
      jest.advanceTimersByTime(1000);
      expect(connectSpy).toHaveBeenCalledTimes(1);
      
      // Second reconnection attempt (should wait longer)
      eventHandlers['connect_error'](new Error('Failed'));
      jest.advanceTimersByTime(2000);
      expect(connectSpy).toHaveBeenCalledTimes(2);
    });

    it('stops reconnecting after max attempts', () => {
      const connectSpy = jest.spyOn(chatWebSocketService, 'connect');
      
      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        eventHandlers['connect_error'](new Error('Failed'));
        jest.advanceTimersByTime(10000);
      }
      
      // Should have attempted 5 times
      expect(connectSpy).toHaveBeenCalledTimes(5);
      
      // One more failure should not trigger reconnection
      eventHandlers['connect_error'](new Error('Failed'));
      jest.advanceTimersByTime(10000);
      
      expect(connectSpy).toHaveBeenCalledTimes(5);
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        setConnectionError('Failed to reconnect after multiple attempts')
      );
    });
  });

  describe('isConnected', () => {
    it('returns connection status', () => {
      chatWebSocketService.connect('test-token');
      
      mockSocket.connected = true;
      expect(chatWebSocketService.isConnected()).toBe(true);
      
      mockSocket.connected = false;
      expect(chatWebSocketService.isConnected()).toBe(false);
    });

    it('returns false when no socket', () => {
      expect(chatWebSocketService.isConnected()).toBe(false);
    });
  });
});