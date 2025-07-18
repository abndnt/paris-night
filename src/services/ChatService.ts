import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Pool } from 'pg';
import { ChatModel, ChatSession, CreateMessageData } from '../models/Chat';
import { NLPService } from './NLPService';
import { LLMService, ConversationContext } from './LLMService';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface SocketUser {
  id?: string;
  email?: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
  sessionId?: string;
}

export interface ChatResponse {
  message: string;
  intent?: string;
  confidence?: number;
  suggestions?: string[];
}

export class ChatService {
  private io: SocketIOServer;
  private chatModel: ChatModel;
  private nlpService: NLPService;
  private llmService: LLMService;

  constructor(server: HTTPServer, database: Pool) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.chatModel = new ChatModel(database);
    this.nlpService = new NLPService();
    this.llmService = new LLMService();

    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth['token'] || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (token) {
          const decoded = jwt.verify(token, config.jwt.secret as string) as any;
          socket.user = {
            id: decoded.id,
            email: decoded.email
          };
          logger.info(`Authenticated socket connection for user: ${socket.user.email}`);
        } else {
          // Allow anonymous connections
          logger.info('Anonymous socket connection established');
        }
        
        next();
      } catch (error) {
        logger.warn('Socket authentication failed, allowing anonymous connection:', error);
        next(); // Allow connection even if auth fails
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Socket connected: ${socket.id}`);
      
      this.handleConnection(socket);
    });
  }

  private async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    // Send welcome message
    socket.emit('message', {
      type: 'system',
      content: 'Connected to Flight Search Assistant. How can I help you today?',
      timestamp: new Date().toISOString()
    });

    // Handle session creation/joining
    socket.on('join_session', async (data: { sessionId?: string }) => {
      try {
        let session: ChatSession;

        if (data.sessionId) {
          // Join existing session
          const existingSession = await this.chatModel.getSession(data.sessionId);
          if (existingSession) {
            session = existingSession;
            await this.chatModel.updateSessionActivity(session.id);
          } else {
            throw new Error('Session not found');
          }
        } else {
          // Create new session
          session = await this.chatModel.createSession({
            userId: socket.user?.id,
            sessionData: { socketId: socket.id }
          });
        }

        socket.sessionId = session.id;
        socket.join(`session_${session.id}`);

        // Send session info and recent messages
        const recentMessages = await this.chatModel.getRecentMessages(session.id, 10);
        
        socket.emit('session_joined', {
          sessionId: session.id,
          messages: recentMessages.map(msg => ({
            id: msg.id,
            type: msg.messageType,
            content: msg.content,
            metadata: msg.metadata,
            timestamp: msg.createdAt.toISOString()
          }))
        });

        logger.info(`Socket ${socket.id} joined session ${session.id}`);
      } catch (error) {
        logger.error('Error joining session:', error);
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Handle incoming messages
    socket.on('message', async (data: { content: string; metadata?: any }) => {
      try {
        if (!socket.sessionId) {
          socket.emit('error', { message: 'No active session. Please join a session first.' });
          return;
        }

        // Save user message
        const userMessage = await this.chatModel.addMessage({
          sessionId: socket.sessionId,
          messageType: 'user',
          content: data.content,
          metadata: data.metadata
        });

        // Broadcast user message to session
        this.io.to(`session_${socket.sessionId}`).emit('message', {
          id: userMessage.id,
          type: 'user',
          content: userMessage.content,
          metadata: userMessage.metadata,
          timestamp: userMessage.createdAt.toISOString()
        });

        // Process message with enhanced LLM service (with fallback to basic NLP)
        let responseContent: string;
        let intentData: any;
        let processingSource = 'llm';

        try {
          // Build enhanced conversation context
          const recentMessages = await this.chatModel.getRecentMessages(socket.sessionId, 15);
          const context: ConversationContext = {
            sessionId: socket.sessionId,
            userId: socket.user?.id,
            messageHistory: recentMessages.map(msg => ({
              role: msg.messageType === 'user' ? 'user' : 'assistant',
              content: msg.content,
              timestamp: msg.createdAt
            })),
            // TODO: Add user preferences from database when user service is enhanced
            userPreferences: socket.user?.id ? {
              preferredAirlines: [],
              preferredAirports: [],
              loyaltyPrograms: []
            } : undefined
          };

          // Try enhanced LLM service with Requesty integration
          const llmResponse = await this.llmService.generateResponse(data.content, context);
          responseContent = llmResponse.content;
          intentData = {
            intent: llmResponse.intent.intent,
            confidence: llmResponse.intent.confidence,
            entities: llmResponse.intent.entities,
            requiresAction: llmResponse.requiresAction,
            followUpQuestions: llmResponse.intent.followUpQuestions,
            processingModel: this.llmService.getAvailableModels()[0]
          };

          logger.info(`LLM processed message: ${llmResponse.intent.intent} (confidence: ${llmResponse.intent.confidence})`);

        } catch (error) {
          // Enhanced fallback to basic NLP service
          logger.warn('All LLM services failed, using fallback NLP:', error);
          processingSource = 'fallback';
          
          try {
            const intent = await this.nlpService.analyzeMessage(data.content);
            responseContent = this.nlpService.generateResponse(intent);
            intentData = {
              intent: intent.intent,
              confidence: intent.confidence,
              entities: intent.entities,
              fallback: true,
              fallbackReason: 'llm_unavailable'
            };
          } catch (nlpError) {
            // Ultimate fallback - system error response
            logger.error('Both LLM and NLP services failed:', nlpError);
            responseContent = this.nlpService.generateSystemErrorResponse();
            intentData = {
              intent: 'unknown',
              confidence: 0,
              entities: {},
              fallback: true,
              fallbackReason: 'all_services_failed'
            };
            processingSource = 'system_error';
          }
        }
        
        // Save assistant response
        const assistantMessage = await this.chatModel.addMessage({
          sessionId: socket.sessionId,
          messageType: 'assistant',
          content: responseContent,
          metadata: {
            ...intentData,
            processingSource
          }
        });

        // Send assistant response
        this.io.to(`session_${socket.sessionId}`).emit('message', {
          id: assistantMessage.id,
          type: 'assistant',
          content: assistantMessage.content,
          metadata: assistantMessage.metadata,
          timestamp: assistantMessage.createdAt.toISOString()
        });

        // Send typing indicator off
        socket.emit('typing', { isTyping: false });

      } catch (error) {
        logger.error('Error processing message:', error);
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data: { isTyping: boolean }) => {
      if (socket.sessionId) {
        socket.to(`session_${socket.sessionId}`).emit('typing', {
          userId: socket.user?.id,
          isTyping: data.isTyping
        });
      }
    });

    // Handle message history requests
    socket.on('get_history', async (data: { limit?: number; offset?: number }) => {
      try {
        if (!socket.sessionId) {
          socket.emit('error', { message: 'No active session' });
          return;
        }

        const messages = await this.chatModel.getMessages(
          socket.sessionId,
          data.limit || 50,
          data.offset || 0
        );

        socket.emit('history', {
          messages: messages.map(msg => ({
            id: msg.id,
            type: msg.messageType,
            content: msg.content,
            metadata: msg.metadata,
            timestamp: msg.createdAt.toISOString()
          }))
        });
      } catch (error) {
        logger.error('Error fetching history:', error);
        socket.emit('error', { message: 'Failed to fetch message history' });
      }
    });

    // Handle user sessions list (for authenticated users)
    socket.on('get_sessions', async () => {
      try {
        if (!socket.user?.id) {
          socket.emit('error', { message: 'Authentication required' });
          return;
        }

        const sessions = await this.chatModel.getUserSessions(socket.user.id);
        
        socket.emit('sessions', {
          sessions: sessions.map(session => ({
            id: session.id,
            lastActivity: session.lastActivity.toISOString(),
            createdAt: session.createdAt.toISOString()
          }))
        });
      } catch (error) {
        logger.error('Error fetching sessions:', error);
        socket.emit('error', { message: 'Failed to fetch sessions' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
      
      if (socket.sessionId) {
        // Update session activity on disconnect
        this.chatModel.updateSessionActivity(socket.sessionId).catch(error => {
          logger.error('Error updating session activity on disconnect:', error);
        });
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  }

  /**
   * Send a message to a specific session
   */
  async sendMessageToSession(sessionId: string, message: CreateMessageData): Promise<void> {
    try {
      const savedMessage = await this.chatModel.addMessage(message);
      
      this.io.to(`session_${sessionId}`).emit('message', {
        id: savedMessage.id,
        type: savedMessage.messageType,
        content: savedMessage.content,
        metadata: savedMessage.metadata,
        timestamp: savedMessage.createdAt.toISOString()
      });
    } catch (error) {
      logger.error('Error sending message to session:', error);
      throw error;
    }
  }

  /**
   * Get connected sockets count
   */
  getConnectedSocketsCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get Socket.IO server instance
   */
  getIO(): SocketIOServer {
    return this.io;
  }
}