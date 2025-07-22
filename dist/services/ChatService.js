"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
const socket_io_1 = require("socket.io");
const Chat_1 = require("../models/Chat");
const NLPService_1 = require("./NLPService");
const LLMService_1 = require("./LLMService");
const logger_1 = require("../utils/logger");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
class ChatService {
    constructor(server, database) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: config_1.config.cors.origin,
                methods: ['GET', 'POST'],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });
        this.chatModel = new Chat_1.ChatModel(database);
        this.nlpService = new NLPService_1.NLPService();
        this.llmService = new LLMService_1.LLMService();
        this.setupSocketHandlers();
    }
    setupSocketHandlers() {
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth['token'] || socket.handshake.headers.authorization?.replace('Bearer ', '');
                if (token) {
                    const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
                    socket.user = {
                        id: decoded.id,
                        email: decoded.email
                    };
                    logger_1.logger.info(`Authenticated socket connection for user: ${socket.user.email}`);
                }
                else {
                    logger_1.logger.info('Anonymous socket connection established');
                }
                next();
            }
            catch (error) {
                logger_1.logger.warn('Socket authentication failed, allowing anonymous connection:', error);
                next();
            }
        });
        this.io.on('connection', (socket) => {
            logger_1.logger.info(`Socket connected: ${socket.id}`);
            this.handleConnection(socket);
        });
    }
    async handleConnection(socket) {
        socket.emit('message', {
            type: 'system',
            content: 'Connected to Flight Search Assistant. How can I help you today?',
            timestamp: new Date().toISOString()
        });
        socket.on('join_session', async (data) => {
            try {
                let session;
                if (data.sessionId) {
                    const existingSession = await this.chatModel.getSession(data.sessionId);
                    if (existingSession) {
                        session = existingSession;
                        await this.chatModel.updateSessionActivity(session.id);
                    }
                    else {
                        throw new Error('Session not found');
                    }
                }
                else {
                    session = await this.chatModel.createSession({
                        userId: socket.user?.id,
                        sessionData: { socketId: socket.id }
                    });
                }
                socket.sessionId = session.id;
                socket.join(`session_${session.id}`);
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
                logger_1.logger.info(`Socket ${socket.id} joined session ${session.id}`);
            }
            catch (error) {
                logger_1.logger.error('Error joining session:', error);
                socket.emit('error', { message: 'Failed to join session' });
            }
        });
        socket.on('message', async (data) => {
            try {
                if (!socket.sessionId) {
                    socket.emit('error', { message: 'No active session. Please join a session first.' });
                    return;
                }
                const userMessage = await this.chatModel.addMessage({
                    sessionId: socket.sessionId,
                    messageType: 'user',
                    content: data.content,
                    metadata: data.metadata
                });
                this.io.to(`session_${socket.sessionId}`).emit('message', {
                    id: userMessage.id,
                    type: 'user',
                    content: userMessage.content,
                    metadata: userMessage.metadata,
                    timestamp: userMessage.createdAt.toISOString()
                });
                let responseContent;
                let intentData;
                let processingSource = 'llm';
                try {
                    const recentMessages = await this.chatModel.getRecentMessages(socket.sessionId, 15);
                    const context = {
                        sessionId: socket.sessionId,
                        userId: socket.user?.id,
                        messageHistory: recentMessages.map(msg => ({
                            role: msg.messageType === 'user' ? 'user' : 'assistant',
                            content: msg.content,
                            timestamp: msg.createdAt
                        })),
                        userPreferences: socket.user?.id ? {
                            preferredAirlines: [],
                            preferredAirports: [],
                            loyaltyPrograms: []
                        } : undefined
                    };
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
                    logger_1.logger.info(`LLM processed message: ${llmResponse.intent.intent} (confidence: ${llmResponse.intent.confidence})`);
                }
                catch (error) {
                    logger_1.logger.warn('All LLM services failed, using fallback NLP:', error);
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
                    }
                    catch (nlpError) {
                        logger_1.logger.error('Both LLM and NLP services failed:', nlpError);
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
                const assistantMessage = await this.chatModel.addMessage({
                    sessionId: socket.sessionId,
                    messageType: 'assistant',
                    content: responseContent,
                    metadata: {
                        ...intentData,
                        processingSource
                    }
                });
                this.io.to(`session_${socket.sessionId}`).emit('message', {
                    id: assistantMessage.id,
                    type: 'assistant',
                    content: assistantMessage.content,
                    metadata: assistantMessage.metadata,
                    timestamp: assistantMessage.createdAt.toISOString()
                });
                socket.emit('typing', { isTyping: false });
            }
            catch (error) {
                logger_1.logger.error('Error processing message:', error);
                socket.emit('error', { message: 'Failed to process message' });
            }
        });
        socket.on('typing', (data) => {
            if (socket.sessionId) {
                socket.to(`session_${socket.sessionId}`).emit('typing', {
                    userId: socket.user?.id,
                    isTyping: data.isTyping
                });
            }
        });
        socket.on('get_history', async (data) => {
            try {
                if (!socket.sessionId) {
                    socket.emit('error', { message: 'No active session' });
                    return;
                }
                const messages = await this.chatModel.getMessages(socket.sessionId, data.limit || 50, data.offset || 0);
                socket.emit('history', {
                    messages: messages.map(msg => ({
                        id: msg.id,
                        type: msg.messageType,
                        content: msg.content,
                        metadata: msg.metadata,
                        timestamp: msg.createdAt.toISOString()
                    }))
                });
            }
            catch (error) {
                logger_1.logger.error('Error fetching history:', error);
                socket.emit('error', { message: 'Failed to fetch message history' });
            }
        });
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
            }
            catch (error) {
                logger_1.logger.error('Error fetching sessions:', error);
                socket.emit('error', { message: 'Failed to fetch sessions' });
            }
        });
        socket.on('disconnect', (reason) => {
            logger_1.logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
            if (socket.sessionId) {
                this.chatModel.updateSessionActivity(socket.sessionId).catch(error => {
                    logger_1.logger.error('Error updating session activity on disconnect:', error);
                });
            }
        });
        socket.on('error', (error) => {
            logger_1.logger.error('Socket error:', error);
        });
    }
    async sendMessageToSession(sessionId, message) {
        try {
            const savedMessage = await this.chatModel.addMessage(message);
            this.io.to(`session_${sessionId}`).emit('message', {
                id: savedMessage.id,
                type: savedMessage.messageType,
                content: savedMessage.content,
                metadata: savedMessage.metadata,
                timestamp: savedMessage.createdAt.toISOString()
            });
        }
        catch (error) {
            logger_1.logger.error('Error sending message to session:', error);
            throw error;
        }
    }
    getConnectedSocketsCount() {
        return this.io.sockets.sockets.size;
    }
    getIO() {
        return this.io;
    }
}
exports.ChatService = ChatService;
//# sourceMappingURL=ChatService.js.map