"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Chat_1 = require("../models/Chat");
const NLPService_1 = require("../services/NLPService");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
const chatModel = new Chat_1.ChatModel(database_1.database);
const nlpService = new NLPService_1.NLPService();
const createSessionSchema = joi_1.default.object({
    sessionData: joi_1.default.object().optional()
});
const sendMessageSchema = joi_1.default.object({
    content: joi_1.default.string().required().min(1).max(2000),
    metadata: joi_1.default.object().optional()
});
const getMessagesSchema = joi_1.default.object({
    limit: joi_1.default.number().integer().min(1).max(100).default(50),
    offset: joi_1.default.number().integer().min(0).default(0)
});
router.post('/sessions', auth_1.optionalAuth, async (req, res) => {
    try {
        const { error, value } = createSessionSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                })),
            });
            return;
        }
        const session = await chatModel.createSession({
            userId: req.user?.id,
            sessionData: value.sessionData
        });
        logger_1.logger.info(`Chat session created: ${session.id} for user: ${req.user?.id || 'anonymous'}`);
        res.status(201).json({
            message: 'Session created successfully',
            session: {
                id: session.id,
                userId: session.userId,
                lastActivity: session.lastActivity,
                createdAt: session.createdAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating chat session:', error);
        res.status(500).json({
            error: 'Internal server error while creating session'
        });
    }
});
router.get('/sessions/:sessionId', auth_1.optionalAuth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!sessionId) {
            res.status(400).json({ error: 'Session ID is required' });
            return;
        }
        const session = await chatModel.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        if (session.userId && session.userId !== req.user?.id) {
            res.status(403).json({ error: 'Access denied to this session' });
            return;
        }
        res.json({
            session: {
                id: session.id,
                userId: session.userId,
                sessionData: session.sessionData,
                lastActivity: session.lastActivity,
                createdAt: session.createdAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching session:', error);
        res.status(500).json({
            error: 'Internal server error while fetching session'
        });
    }
});
router.get('/sessions', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const sessions = await chatModel.getUserSessions(req.user.id);
        res.json({
            sessions: sessions.map(session => ({
                id: session.id,
                lastActivity: session.lastActivity,
                createdAt: session.createdAt
            }))
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching user sessions:', error);
        res.status(500).json({
            error: 'Internal server error while fetching sessions'
        });
    }
});
router.post('/sessions/:sessionId/messages', auth_1.optionalAuth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!sessionId) {
            res.status(400).json({ error: 'Session ID is required' });
            return;
        }
        const { error, value } = sendMessageSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                })),
            });
            return;
        }
        const session = await chatModel.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        if (session.userId && session.userId !== req.user?.id) {
            res.status(403).json({ error: 'Access denied to this session' });
            return;
        }
        const userMessage = await chatModel.addMessage({
            sessionId,
            messageType: 'user',
            content: value.content,
            metadata: value.metadata
        });
        const intent = await nlpService.analyzeMessage(value.content);
        const responseContent = nlpService.generateResponse(intent);
        const assistantMessage = await chatModel.addMessage({
            sessionId,
            messageType: 'assistant',
            content: responseContent,
            metadata: {
                intent: intent.intent,
                confidence: intent.confidence,
                entities: intent.entities
            }
        });
        logger_1.logger.info(`Messages exchanged in session ${sessionId}, intent: ${intent.intent}`);
        res.status(201).json({
            userMessage: {
                id: userMessage.id,
                content: userMessage.content,
                timestamp: userMessage.createdAt
            },
            assistantMessage: {
                id: assistantMessage.id,
                content: assistantMessage.content,
                metadata: assistantMessage.metadata,
                timestamp: assistantMessage.createdAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error sending message:', error);
        res.status(500).json({
            error: 'Internal server error while sending message'
        });
    }
});
router.get('/sessions/:sessionId/messages', auth_1.optionalAuth, async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!sessionId) {
            res.status(400).json({ error: 'Session ID is required' });
            return;
        }
        const { error, value } = getMessagesSchema.validate(req.query);
        if (error) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                })),
            });
            return;
        }
        const session = await chatModel.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        if (session.userId && session.userId !== req.user?.id) {
            res.status(403).json({ error: 'Access denied to this session' });
            return;
        }
        const messages = await chatModel.getMessages(sessionId, value.limit, value.offset);
        res.json({
            messages: messages.map(msg => ({
                id: msg.id,
                type: msg.messageType,
                content: msg.content,
                metadata: msg.metadata,
                timestamp: msg.createdAt
            })),
            pagination: {
                limit: value.limit,
                offset: value.offset,
                total: messages.length
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching messages:', error);
        res.status(500).json({
            error: 'Internal server error while fetching messages'
        });
    }
});
router.delete('/sessions/:sessionId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        if (!sessionId) {
            res.status(400).json({ error: 'Session ID is required' });
            return;
        }
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const session = await chatModel.getSession(sessionId);
        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        if (session.userId !== req.user.id) {
            res.status(403).json({ error: 'Access denied to this session' });
            return;
        }
        const deleted = await chatModel.deleteSession(sessionId);
        if (!deleted) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }
        logger_1.logger.info(`Chat session deleted: ${sessionId} by user: ${req.user.id}`);
        res.json({ message: 'Session deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error deleting session:', error);
        res.status(500).json({
            error: 'Internal server error while deleting session'
        });
    }
});
router.post('/analyze', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'Message is required and must be a string' });
            return;
        }
        const intent = await nlpService.analyzeMessage(message);
        res.json({
            intent: intent.intent,
            confidence: intent.confidence,
            entities: intent.entities,
            suggestedResponse: nlpService.generateResponse(intent)
        });
    }
    catch (error) {
        logger_1.logger.error('Error analyzing message:', error);
        res.status(500).json({
            error: 'Internal server error while analyzing message'
        });
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map