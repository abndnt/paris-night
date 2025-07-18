import { ChatModel, CreateSessionData, CreateMessageData } from '../models/Chat';
import { NLPService } from '../services/NLPService';

// Mock database
const mockDb = {
    query: jest.fn(),
} as any;

describe('Chat Model', () => {
    let chatModel: ChatModel;

    beforeEach(() => {
        chatModel = new ChatModel(mockDb);
        jest.clearAllMocks();
    });

    describe('createSession', () => {
        it('should create a new chat session', async () => {
            const sessionData: CreateSessionData = {
                userId: 'user-123',
                sessionData: { theme: 'dark' }
            };

            const mockResult = {
                rows: [{
                    id: 'session-123',
                    user_id: 'user-123',
                    session_data: { theme: 'dark' },
                    last_activity: new Date(),
                    created_at: new Date(),
                }],
            };

            mockDb.query.mockResolvedValue(mockResult);

            const result = await chatModel.createSession(sessionData);

            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO chat_sessions'),
                expect.arrayContaining([
                    'user-123',
                    expect.any(String) // JSON stringified session data
                ])
            );

            expect(result.id).toBe('session-123');
            expect(result.userId).toBe('user-123');
        });

        it('should create anonymous session when no userId provided', async () => {
            const sessionData: CreateSessionData = {
                sessionData: { anonymous: true }
            };

            const mockResult = {
                rows: [{
                    id: 'session-456',
                    user_id: null,
                    session_data: { anonymous: true },
                    last_activity: new Date(),
                    created_at: new Date(),
                }],
            };

            mockDb.query.mockResolvedValue(mockResult);

            const result = await chatModel.createSession(sessionData);

            expect(result.userId).toBeNull();
            expect(result.sessionData).toEqual({ anonymous: true });
        });
    });

    describe('getSession', () => {
        it('should return session when found', async () => {
            const mockResult = {
                rows: [{
                    id: 'session-123',
                    user_id: 'user-123',
                    session_data: { theme: 'dark' },
                    last_activity: new Date(),
                    created_at: new Date(),
                }],
            };

            mockDb.query.mockResolvedValue(mockResult);

            const result = await chatModel.getSession('session-123');

            expect(result).toBeDefined();
            expect(result?.id).toBe('session-123');
            expect(result?.userId).toBe('user-123');
        });

        it('should return null when session not found', async () => {
            mockDb.query.mockResolvedValue({ rows: [] });

            const result = await chatModel.getSession('nonexistent-session');

            expect(result).toBeNull();
        });
    });

    describe('addMessage', () => {
        it('should add message to session', async () => {
            const messageData: CreateMessageData = {
                sessionId: 'session-123',
                messageType: 'user',
                content: 'Hello, I need help with flights',
                metadata: { source: 'web' }
            };

            const mockResult = {
                rows: [{
                    id: 'message-123',
                    session_id: 'session-123',
                    message_type: 'user',
                    content: 'Hello, I need help with flights',
                    metadata: { source: 'web' },
                    created_at: new Date(),
                }],
            };

            // Mock both message insert and session update
            mockDb.query.mockResolvedValueOnce(mockResult); // addMessage
            mockDb.query.mockResolvedValueOnce({ rows: [] }); // updateSessionActivity

            const result = await chatModel.addMessage(messageData);

            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO chat_messages'),
                expect.arrayContaining([
                    'session-123',
                    'user',
                    'Hello, I need help with flights',
                    expect.any(String) // JSON stringified metadata
                ])
            );

            expect(result.content).toBe('Hello, I need help with flights');
            expect(result.messageType).toBe('user');
        });
    });

    describe('getMessages', () => {
        it('should return messages for session', async () => {
            const mockResult = {
                rows: [
                    {
                        id: 'message-1',
                        session_id: 'session-123',
                        message_type: 'user',
                        content: 'Hello',
                        metadata: {},
                        created_at: new Date(),
                    },
                    {
                        id: 'message-2',
                        session_id: 'session-123',
                        message_type: 'assistant',
                        content: 'Hi! How can I help you?',
                        metadata: { intent: 'greeting' },
                        created_at: new Date(),
                    }
                ],
            };

            mockDb.query.mockResolvedValue(mockResult);

            const result = await chatModel.getMessages('session-123', 50, 0);

            expect(result).toHaveLength(2);
            expect(result[0]?.messageType).toBe('user');
            expect(result[1]?.messageType).toBe('assistant');
        });
    });
});

describe('NLP Service (Fallback)', () => {
    let nlpService: NLPService;

    beforeEach(() => {
        nlpService = new NLPService();
    });

    describe('analyzeMessage', () => {
        it('should identify greeting intent', async () => {
            const message = 'Hello there!';

            const result = await nlpService.analyzeMessage(message);

            expect(result.intent).toBe('greeting');
            expect(result.confidence).toBe(0.8);
            expect(result.entities).toEqual({});
        });

        it('should identify flight search intent', async () => {
            const message = 'I want to find flights';

            const result = await nlpService.analyzeMessage(message);

            expect(result.intent).toBe('flight_search');
            expect(result.confidence).toBe(0.6);
            expect(result.entities).toEqual({});
        });

        it('should return unknown intent for unclear messages', async () => {
            const message = 'asdfghjkl random text';

            const result = await nlpService.analyzeMessage(message);

            expect(result.intent).toBe('unknown');
            expect(result.confidence).toBe(0);
            expect(result.entities).toEqual({});
        });
    });

    describe('generateResponse', () => {
        it('should generate greeting response', () => {
            const intent = {
                intent: 'greeting',
                confidence: 0.8,
                entities: {}
            };

            const response = nlpService.generateResponse(intent);

            expect(response).toContain('Hello');
            expect(response).toContain('help');
        });

        it('should generate flight search response', () => {
            const intent = {
                intent: 'flight_search',
                confidence: 0.6,
                entities: {}
            };

            const response = nlpService.generateResponse(intent);

            expect(response).toContain('flights');
            expect(response).toContain('departure city');
        });

        it('should generate system error response for unknown intent', () => {
            const intent = {
                intent: 'unknown',
                confidence: 0,
                entities: {}
            };

            const response = nlpService.generateResponse(intent);

            expect(response).toContain('technical difficulties');
            expect(response).toContain('try again');
        });
    });

    describe('generateSystemErrorResponse', () => {
        it('should generate appropriate system error message', () => {
            const response = nlpService.generateSystemErrorResponse();

            expect(response).toContain('trouble with my AI assistant');
            expect(response).toContain('try again');
        });
    });
});