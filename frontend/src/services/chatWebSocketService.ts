// Chat WebSocket service for frontend
import { io, Socket } from 'socket.io-client';

class ChatWebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect() {
    if (this.socket) {
      return;
    }

    this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3000');
    
    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to chat WebSocket');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('Disconnected from chat WebSocket');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  sendMessage(messageOrData: string | { content: string; sender: string; sessionId: string }, sessionId?: string) {
    if (this.socket && this.isConnected) {
      if (typeof messageOrData === 'string' && sessionId) {
        this.socket.emit('chat_message', { message: messageOrData, sessionId });
      } else if (typeof messageOrData === 'object') {
        this.socket.emit('chat_message', messageOrData);
      }
    }
  }

  onMessage(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('chat_response', callback);
    }
  }

  onTyping(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  setTyping(sessionId: string, isTyping: boolean) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', { sessionId, isTyping });
    }
  }

  sendTyping(sessionId: string, isTyping: boolean) {
    return this.setTyping(sessionId, isTyping);
  }

  joinSession(sessionId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_session', { sessionId });
    }
  }

  leaveSession(sessionId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_session', { sessionId });
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

const chatWebSocketService = new ChatWebSocketService();
export default chatWebSocketService;