import { Router, Request, Response } from 'express';
import { ChatModel } from '../models/Chat';
import { NLPService } from '../services/NLPService';
import { LLMService, ConversationContext } from '../services/LLMService';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { database } from '../config/database';
import { logger } from '../utils/logger';
import * as Joi from 'joi';

// Extend Request interface for user property
interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const router = Router();
const chatModel = new ChatModel(database);
const nlpService = new NLPService();
const llmService = new LLMService();

// Validation schemas
const createSessionSchema = Joi.object({
  sessionData: Joi.object().optional()
});

const sendMessageSchema = Joi.object({
  content: Joi.string().required().min(1).max(2000),
  metadata: Joi.object().optional()
});

const getMessagesSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0)
});

// Create a new chat session
router.post('/sessions', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

    logger.info(`Chat session created: ${session.id} for user: ${req.user?.id || 'anonymous'}`);

    res.status(201).json({
      message: 'Session created successfully',
      session: {
        id: session.id,
        userId: session.userId,
        lastActivity: session.lastActivity,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    logger.error('Error creating chat session:', error);
    res.status(500).json({
      error: 'Internal server error while creating session'
    });
  }
});

// Get session details
router.get('/sessions/:sessionId', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

    // Check if user has access to this session
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
  } catch (error) {
    logger.error('Error fetching session:', error);
    res.status(500).json({
      error: 'Internal server error while fetching session'
    });
  }
});

// Get user's sessions (authenticated only)
router.get('/sessions', authenticateToken, async (req: RequestWithUser, res: Response): Promise<void> => {
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
  } catch (error) {
    logger.error('Error fetching user sessions:', error);
    res.status(500).json({
      error: 'Internal server error while fetching sessions'
    });
  }
});

// Send a message to a session
router.post('/sessions/:sessionId/messages', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

    // Check if session exists
    const session = await chatModel.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Check access permissions
    if (session.userId && session.userId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied to this session' });
      return;
    }

    // Save user message
    const userMessage = await chatModel.addMessage({
      sessionId,
      messageType: 'user',
      content: value.content,
      metadata: value.metadata
    });

    // Process with LLM (with fallback to basic NLP)
    let responseContent: string;
    let intentData: any;
    let processingSource = 'llm';

    try {
      // Build conversation context
      const recentMessages = await chatModel.getRecentMessages(sessionId, 10);
      const context: ConversationContext = {
        sessionId,
        userId: req.user?.id,
        messageHistory: recentMessages.map(msg => ({
          role: msg.messageType === 'user' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: msg.createdAt
        }))
      };

      // Try LLM service first
      const llmResponse = await llmService.generateResponse(value.content, context);
      responseContent = llmResponse.content;
      intentData = {
        intent: llmResponse.intent.intent,
        confidence: llmResponse.intent.confidence,
        entities: llmResponse.intent.entities,
        requiresAction: llmResponse.requiresAction
      };

    } catch (error) {
      // Fallback to basic NLP service
      logger.warn('LLM service failed, using fallback NLP:', error);
      processingSource = 'fallback';
      
      const intent = await nlpService.analyzeMessage(value.content);
      responseContent = nlpService.generateResponse(intent);
      intentData = {
        intent: intent.intent,
        confidence: intent.confidence,
        entities: intent.entities,
        fallback: true
      };
    }

    // Save assistant response
    const assistantMessage = await chatModel.addMessage({
      sessionId,
      messageType: 'assistant',
      content: responseContent,
      metadata: {
        ...intentData,
        processingSource
      }
    });

    logger.info(`Messages exchanged in session ${sessionId}, intent: ${intentData.intent}`);

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
  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({
      error: 'Internal server error while sending message'
    });
  }
});

// Get messages from a session
router.get('/sessions/:sessionId/messages', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

    // Check if session exists
    const session = await chatModel.getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Check access permissions
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
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({
      error: 'Internal server error while fetching messages'
    });
  }
});

// Delete a session (authenticated users only)
router.delete('/sessions/:sessionId', authenticateToken, async (req: RequestWithUser, res: Response): Promise<void> => {
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

    // Check if session exists and belongs to user
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

    logger.info(`Chat session deleted: ${sessionId} by user: ${req.user.id}`);

    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    logger.error('Error deleting session:', error);
    res.status(500).json({
      error: 'Internal server error while deleting session'
    });
  }
});

// Analyze message intent (utility endpoint)
router.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required and must be a string' });
      return;
    }

    let analysisResult: any;
    let processingSource = 'llm';

    try {
      // Try LLM service first
      const intent = await llmService.extractFlightIntent(message);
      analysisResult = {
        intent: intent.intent,
        confidence: intent.confidence,
        entities: intent.entities,
        suggestedResponse: intent.response,
        followUpQuestions: intent.followUpQuestions
      };
    } catch (error) {
      // Fallback to basic NLP service
      logger.warn('LLM service failed for analysis, using fallback:', error);
      processingSource = 'fallback';
      
      const intent = await nlpService.analyzeMessage(message);
      analysisResult = {
        intent: intent.intent,
        confidence: intent.confidence,
        entities: intent.entities,
        suggestedResponse: nlpService.generateResponse(intent),
        fallback: true
      };
    }
    
    res.json({
      ...analysisResult,
      processingSource
    });
  } catch (error) {
    logger.error('Error analyzing message:', error);
    res.status(500).json({
      error: 'Internal server error while analyzing message'
    });
  }
});

export default router;