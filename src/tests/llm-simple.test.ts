import { LLMService, ConversationContext } from '../services/LLMService';

// Mock the OpenAI client
const mockCreate = jest.fn();
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  };
});

describe('LLM Service - Requesty Integration (Simplified)', () => {
  let llmService: LLMService;

  beforeEach(() => {
    jest.clearAllMocks();
    llmService = new LLMService();
  });

  describe('Core Functionality', () => {
    it('should be instantiated correctly', () => {
      expect(llmService).toBeDefined();
      expect(llmService.isServiceAvailable()).toBe(true);
    });

    it('should have correct available models', () => {
      const models = llmService.getAvailableModels();
      expect(models).toContain('openai/gpt-4o');
      expect(models).toContain('openai/gpt-3.5-turbo');
    });

    it('should switch models correctly', () => {
      const newModel = 'anthropic/claude-3-sonnet';
      llmService.switchModel(newModel);
      const models = llmService.getAvailableModels();
      expect(models[0]).toBe(newModel);
    });

    it('should generate response with proper mock', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'flight_search',
                confidence: 0.9,
                entities: {
                  origin: 'New York',
                  destination: 'Los Angeles'
                },
                response: 'I can help you find flights from New York to Los Angeles.'
              })
            }
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      const result = await llmService.generateResponse('Find flights from NYC to LA', context);

      expect(result).toBeDefined();
      expect(result.content).toContain('New York to Los Angeles');
      expect(result.intent.intent).toBe('flight_search');
      expect(result.intent.confidence).toBe(0.9);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.any(Array),
          functions: expect.any(Array)
        })
      );
    });

    it('should handle fallback when primary model fails', async () => {
      const primaryError = new Error('Primary model failed');
      const fallbackResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'greeting',
                confidence: 0.8,
                entities: {},
                response: 'Hello! How can I help you with your travel plans?'
              })
            }
          }
        }]
      };

      mockCreate
        .mockRejectedValueOnce(primaryError)
        .mockResolvedValue(fallbackResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      const result = await llmService.generateResponse('Hello', context);

      expect(result).toBeDefined();
      expect(result.intent.intent).toBe('greeting');
      expect(mockCreate).toHaveBeenCalledTimes(2); // Primary + fallback
    });

    it('should throw error when all models fail', async () => {
      const error = new Error('All models failed');
      mockCreate.mockRejectedValue(error);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      await expect(llmService.generateResponse('Hello', context)).rejects.toThrow();
      expect(llmService.isServiceAvailable()).toBe(false);
    });
  });

  describe('Intent Extraction', () => {
    it('should extract flight search intent', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'flight_search',
                confidence: 0.95,
                entities: {
                  origin: 'Boston',
                  destination: 'Seattle',
                  departureDate: '2024-03-15',
                  passengers: 2
                },
                response: 'I can help you find flights from Boston to Seattle on March 15th for 2 passengers.'
              })
            }
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await llmService.extractFlightIntent('I need flights from Boston to Seattle on March 15th for 2 people');

      expect(result.intent).toBe('flight_search');
      expect(result.entities.origin).toBe('Boston');
      expect(result.entities.destination).toBe('Seattle');
      expect(result.entities.departureDate).toBe('2024-03-15');
      expect(result.entities.passengers).toBe(2);
    });

    it('should extract points inquiry intent', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'points_inquiry',
                confidence: 0.88,
                entities: {
                  loyaltyProgram: 'Chase Ultimate Rewards',
                  pointsAmount: 75000
                },
                response: 'I can help you optimize your 75,000 Chase Ultimate Rewards points.'
              })
            }
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await llmService.extractFlightIntent('How should I use my 75k Chase UR points?');

      expect(result.intent).toBe('points_inquiry');
      expect(result.entities.loyaltyProgram).toBe('Chase Ultimate Rewards');
      expect(result.entities.pointsAmount).toBe(75000);
    });
  });

  describe('Health Checks', () => {
    it('should perform health check', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Health check response'
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const isHealthy = await llmService.checkHealth();

      expect(isHealthy).toBe(true);
      expect(llmService.isServiceAvailable()).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Health check' }],
          max_tokens: 5
        })
      );
    });

    it('should handle health check failure', async () => {
      const error = new Error('Health check failed');
      mockCreate.mockRejectedValue(error);

      const isHealthy = await llmService.checkHealth();

      expect(isHealthy).toBe(false);
      expect(llmService.isServiceAvailable()).toBe(false);
    });
  });

  describe('Conversation Context', () => {
    it('should include conversation history in requests', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'flight_search',
                confidence: 0.9,
                entities: {
                  destination: 'Paris'
                },
                response: 'Based on our conversation, I can help you find flights to Paris.'
              })
            }
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: [
          {
            role: 'user',
            content: 'I want to travel to Europe',
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: 'Which city in Europe interests you?',
            timestamp: new Date()
          }
        ]
      };

      await llmService.generateResponse('Paris sounds great', context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: 'I want to travel to Europe' }),
            expect.objectContaining({ role: 'assistant', content: 'Which city in Europe interests you?' }),
            expect.objectContaining({ role: 'user', content: 'Paris sounds great' })
          ])
        })
      );
    });

    it('should include user preferences in system prompt', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'flight_search',
                confidence: 0.9,
                entities: {},
                response: 'I can help you find flights with your preferred airlines.'
              })
            }
          }
        }]
      };

      mockCreate.mockResolvedValue(mockResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: [],
        userPreferences: {
          preferredAirlines: ['Delta', 'United'],
          preferredAirports: ['JFK', 'LGA'],
          loyaltyPrograms: ['Delta SkyMiles']
        }
      };

      await llmService.generateResponse('Find flights', context);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('Delta, United')
            })
          ])
        })
      );
    });
  });
});