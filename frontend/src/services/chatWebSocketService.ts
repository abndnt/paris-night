import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';
import {
  setConnected,
  setConnectionError,
  addMessage,
  updateMessageStatus,
  setAssistantTyping,
  Message,
} from '../store/slices/chatSlice';

class ChatWebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token?: string): void {
    if (this.socket?.connected) {
      return;
    }

    const serverUrl = process.env.REACT_APP_WS_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      auth: {
        token: token || localStorage.getItem('token'),
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    store.dispatch(setConnected(false));
  }

  sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'status'>): string {
    if (!this.socket?.connected) {
      throw new Error('WebSocket not connected');
    }

    const messageId = this.generateMessageId();
    const fullMessage: Message = {
      ...message,
      id: messageId,
      timestamp: Date.now(),
      status: 'sending',
    };

    // Add message to store immediately
    store.dispatch(addMessage(fullMessage));

    // Send to server
    this.socket.emit('chat:message', {
      id: messageId,
      content: message.content,
      sessionId: message.sessionId,
    });

    return messageId;
  }

  joinSession(sessionId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:join', { sessionId });
    }
  }

  leaveSession(sessionId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:leave', { sessionId });
    }
  }

  sendTyping(sessionId: string, isTyping: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('chat:typing', { sessionId, isTyping });
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      store.dispatch(setConnected(true));
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      store.dispatch(setConnected(false));
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        return;
      }
      
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      store.dispatch(setConnectionError(error.message));
      this.handleReconnect();
    });

    // Chat-specific events
    this.socket.on('chat:message', (data: {
      id: string;
      content: string;
      sender: 'assistant';
      sessionId: string;
      timestamp: number;
    }) => {
      const message: Message = {
        ...data,
        status: 'delivered',
      };
      store.dispatch(addMessage(message));
    });

    this.socket.on('chat:message:status', (data: {
      messageId: string;
      status: Message['status'];
    }) => {
      store.dispatch(updateMessageStatus(data));
    });

    this.socket.on('chat:typing', (data: {
      sessionId: string;
      isTyping: boolean;
    }) => {
      store.dispatch(setAssistantTyping(data.isTyping));
    });

    this.socket.on('chat:error', (data: { error: string }) => {
      console.error('Chat error:', data.error);
      store.dispatch(setConnectionError(data.error));
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      store.dispatch(setConnectionError('Failed to reconnect after multiple attempts'));
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const chatWebSocketService = new ChatWebSocketService();
export default chatWebSocketService;