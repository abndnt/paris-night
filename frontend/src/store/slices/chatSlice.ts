import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'error';
  sessionId: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  lastMessageAt: number;
  messages: Message[];
}

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isConnected: boolean;
  isTyping: boolean;
  assistantTyping: boolean;
  connectionError: string | null;
  isLoading: boolean;
}

const initialState: ChatState = {
  sessions: [],
  currentSessionId: null,
  isConnected: false,
  isTyping: false,
  assistantTyping: false,
  connectionError: null,
  isLoading: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Connection management
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
      if (action.payload) {
        state.connectionError = null;
      }
    },
    setConnectionError: (state, action: PayloadAction<string>) => {
      state.connectionError = action.payload;
      state.isConnected = false;
    },
    
    // Session management
    createSession: (state, action: PayloadAction<{ id: string; title: string }>) => {
      const newSession: ChatSession = {
        id: action.payload.id,
        title: action.payload.title,
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        messages: [],
      };
      state.sessions.unshift(newSession);
      state.currentSessionId = action.payload.id;
    },
    
    setCurrentSession: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
    },
    
    loadSessions: (state, action: PayloadAction<ChatSession[]>) => {
      state.sessions = action.payload;
    },
    
    deleteSession: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter(session => session.id !== action.payload);
      if (state.currentSessionId === action.payload) {
        state.currentSessionId = state.sessions.length > 0 ? state.sessions[0].id : null;
      }
    },
    
    // Message management
    addMessage: (state, action: PayloadAction<Message>) => {
      const session = state.sessions.find(s => s.id === action.payload.sessionId);
      if (session) {
        session.messages.push(action.payload);
        session.lastMessageAt = action.payload.timestamp;
        
        // Update session title if it's the first user message
        if (session.messages.length === 1 && action.payload.sender === 'user') {
          session.title = action.payload.content.substring(0, 50) + (action.payload.content.length > 50 ? '...' : '');
        }
      }
    },
    
    updateMessageStatus: (state, action: PayloadAction<{ messageId: string; status: Message['status'] }>) => {
      for (const session of state.sessions) {
        const message = session.messages.find(m => m.id === action.payload.messageId);
        if (message) {
          message.status = action.payload.status;
          break;
        }
      }
    },
    
    // Typing indicators
    setUserTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    
    setAssistantTyping: (state, action: PayloadAction<boolean>) => {
      state.assistantTyping = action.payload;
    },
    
    // Loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Clear all data
    clearChat: (state) => {
      state.sessions = [];
      state.currentSessionId = null;
      state.isTyping = false;
      state.assistantTyping = false;
    },
  },
});

export const {
  setConnected,
  setConnectionError,
  createSession,
  setCurrentSession,
  loadSessions,
  deleteSession,
  addMessage,
  updateMessageStatus,
  setUserTyping,
  setAssistantTyping,
  setLoading,
  clearChat,
} = chatSlice.actions;

export default chatSlice.reducer;