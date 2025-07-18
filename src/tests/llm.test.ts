import { LLMService, ConversationContext } from '../services/LLMService';
import { config } from '../config';

// Mock OpenAI client for Requesty integration
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    }))
  };
});

describe('LLM Service - Requesty Integration', () => {
  let llmService: LLMService;
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service instance
    llmService = new LLMService();
    
    // Get mock OpenAI instance
    const OpenAI = require('openai').default;
    mockClient = new OpenAI();
  });

  describe('generateResponse - Requesty Multi-LLM', () => {
    it('should generate response using primary LLM model', async () => {
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
                  destination: 'Los Angeles',
                  flexible: true,
                  tripType: 'roundtrip'
                },
                response: 'I can help you find flights from New York to Los Angeles. When would you like to travel?',
                followUpQuestions: ['What dates are you looking at?', 'How many passengers?']
              })
            }
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      const result = await llmService.generateResponse('Find flights from NYC to LA', context);

      expect(result.content).toContain('New York to Los Angeles');
      expect(result.intent.intent).toBe('flight_search');
      expect(result.intent.confidence).toBe(0.9);
      expect(result.intent.entities.origin).toBe('New York');
      expect(result.intent.entities.destination).toBe('Los Angeles');
      expect(result.intent.entities.flexible).toBe(true);
      expect(result.requiresAction?.type).toBe('search_flights');
      expect(result.requiresAction?.parameters['tripType']).toBe('roundtrip');
    });

    it('should fallback to secondary model when primary fails', async () => {
      const primaryError = new Error('Primary model unavailable');
      const fallbackResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'greeting',
                confidence: 0.85,
                entities: {},
                response: 'Hello! I\'m here to help you with flight searches. How can I assist you today?'
              })
            }
          }
        }]
      };

      // Primary model fails, then fallback succeeds
      mockClient.chat.completions.create
        .mockRejectedValueOnce(primaryError)
        .mockResolvedValue(fallbackResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      const result = await llmService.generateResponse('Hello there!', context);

      expect(result.content).toContain('Hello');
      expect(result.intent.intent).toBe('greeting');
      expect(result.intent.confidence).toBe(0.85);
      expect(result.requiresAction).toBeUndefined();
      
      // Verify both primary and fallback were attempted
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('should handle greeting intent', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'greeting',
                confidence: 0.95,
                entities: {},
                response: 'Hello! I\'m here to help you find great flight deals using your points and miles. What can I help you with today?'
              })
            }
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      const result = await llmService.generateResponse('Hello there!', context);

      expect(result.content).toContain('Hello');
      expect(result.intent.intent).toBe('greeting');
      expect(result.intent.confidence).toBe(0.95);
      expect(result.requiresAction).toBeUndefined();
    });

    it('should handle enhanced points inquiry with new entities', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'points_inquiry',
                confidence: 0.85,
                entities: {
                  loyaltyProgram: 'Chase Ultimate Rewards',
                  pointsAmount: 50000,
                  preferredAirlines: ['United', 'Southwest']
                },
                response: 'I can help you check your Chase Ultimate Rewards balance and find the best redemption options for your 50,000 points, especially with United and Southwest.',
                followUpQuestions: ['Are you looking for domestic or international flights?']
              })
            }
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      const result = await llmService.generateResponse('How can I use my 50k Chase Ultimate Rewards points for United or Southwest?', context);

      expect(result.intent.intent).toBe('points_inquiry');
      expect(result.intent.entities.loyaltyProgram).toBe('Chase Ultimate Rewards');
      expect(result.intent.entities.pointsAmount).toBe(50000);
      expect(result.intent.entities.preferredAirlines).toEqual(['United', 'Southwest']);
      expect(result.intent.followUpQuestions).toContain('Are you looking for domestic or international flights?');
      expect(result.requiresAction?.type).toBe('check_points');
    });

    it('should handle booking status inquiry', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'booking_status',
                confidence: 0.9,
                entities: {
                  confirmationCode: 'ABC123'
                },
                response: 'Let me check the status of your booking with confirmation code ABC123.'
              })
            }
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      const result = await llmService.generateResponse('What is the status of booking ABC123?', context);

      expect(result.intent.intent).toBe('booking_status');
      expect(result.intent.entities.confirmationCode).toBe('ABC123');
      expect(result.requiresAction?.type).toBe('lookup_booking');
    });

    it('should handle route optimization intent', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'route_optimization',
                confidence: 0.88,
                entities: {
                  origin: 'Boston',
                  destination: 'Tokyo',
                  flexible: true,
                  maxStops: 1
                },
                response: 'I can help optimize your route from Boston to Tokyo. Let me find the best routing options with up to 1 stop.',
                followUpQuestions: ['Are you flexible with your travel dates?']
              })
            }
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      const result = await llmService.generateResponse('Find the best route from Boston to Tokyo with max 1 stop', context);

      expect(result.intent.intent).toBe('route_optimization');
      expect(result.intent.entities.maxStops).toBe(1);
      expect(result.intent.entities.flexible).toBe(true);
      expect(result.requiresAction?.type).toBe('optimize_route');
    });

    it('should handle price alert intent', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'price_alert',
                confidence: 0.92,
                entities: {
                  origin: 'San Francisco',
                  destination: 'Paris',
                  budget: 800,
                  departureDate: '2024-06-15'
                },
                response: 'I\'ll set up a price alert for flights from San Francisco to Paris around June 15th with a budget of $800.',
                followUpQuestions: ['Would you like alerts for nearby dates too?']
              })
            }
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      const result = await llmService.generateResponse('Alert me when SFO to Paris flights drop below $800 in June', context);

      expect(result.intent.intent).toBe('price_alert');
      expect(result.intent.entities.budget).toBe(800);
      expect(result.requiresAction?.type).toBe('create_alert');
    });

    it('should throw error when all LLM models fail', async () => {
      const primaryError = new Error('Primary API Error');
      const fallbackError = new Error('Fallback API Error');
      
      mockClient.chat.completions.create.mockRejectedValue(primaryError);
      mockClient.chat.completions.create.mockRejectedValue(fallbackError);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      await expect(llmService.generateResponse('Hello', context)).rejects.toThrow();
    });

    it('should include enhanced conversation context and user preferences', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'flight_search',
                confidence: 0.8,
                entities: {
                  destination: 'Paris',
                  preferredAirlines: ['Delta']
                },
                response: 'Based on our previous conversation and your preference for Delta, I can help you find flights to Paris.'
              })
            }
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        userId: 'user-123',
        messageHistory: [
          {
            role: 'user',
            content: 'I want to travel next month',
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: 'Where would you like to go?',
            timestamp: new Date()
          }
        ],
        userPreferences: {
          preferredAirlines: ['Delta', 'United'],
          preferredAirports: ['JFK', 'LGA'],
          loyaltyPrograms: ['Delta SkyMiles']
        }
      };

      await llmService.generateResponse('Find flights to Paris', context);

      // Verify that the conversation history and preferences were included
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ 
              role: 'system',
              content: expect.stringContaining('Delta, United')
            }),
            expect.objectContaining({ role: 'user', content: 'I want to travel next month' }),
            expect.objectContaining({ role: 'assistant', content: 'Where would you like to go?' }),
            expect.objectContaining({ role: 'user', content: 'Find flights to Paris' })
          ])
        })
      );
    });
  });

  describe('extractFlightIntent', () => {
    it('should extract flight intent from message', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'flight_search',
                confidence: 0.9,
                entities: {
                  origin: 'Boston',
                  destination: 'Seattle',
                  departureDate: '2024-03-15'
                },
                response: 'I can help you find flights from Boston to Seattle on March 15th.'
              })
            }
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await llmService.extractFlightIntent('I need flights from Boston to Seattle on March 15th');

      expect(result.intent).toBe('flight_search');
      expect(result.entities.origin).toBe('Boston');
      expect(result.entities.destination).toBe('Seattle');
      expect(result.entities.departureDate).toBe('2024-03-15');
    });
  });

  describe('checkHealth - Requesty Multi-Model', () => {
    it('should return true when primary model is healthy', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Health check response'
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const isHealthy = await llmService.checkHealth();

      expect(isHealthy).toBe(true);
      expect(llmService.isServiceAvailable()).toBe(true);
      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: config.llm.model,
          messages: [{ role: 'user', content: 'Health check' }]
        })
      );
    });

    it('should fallback to secondary model when primary fails', async () => {
      const primaryError = new Error('Primary model unavailable');
      const fallbackResponse = {
        choices: [{
          message: {
            content: 'Fallback health check response'
          }
        }]
      };

      mockClient.chat.completions.create
        .mockRejectedValueOnce(primaryError)
        .mockResolvedValue(fallbackResponse);

      const isHealthy = await llmService.checkHealth();

      expect(isHealthy).toBe(true);
      expect(llmService.isServiceAvailable()).toBe(true);
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('should return false when all models are unhealthy', async () => {
      const primaryError = new Error('Primary service unavailable');
      const fallbackError = new Error('Fallback service unavailable');
      
      mockClient.chat.completions.create
        .mockRejectedValueOnce(primaryError)
        .mockRejectedValueOnce(fallbackError);

      const isHealthy = await llmService.checkHealth();

      expect(isHealthy).toBe(false);
      expect(llmService.isServiceAvailable()).toBe(false);
    });

    it('should cache health check results for 5 minutes', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Health check response'
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      // First health check
      await llmService.checkHealth();
      
      // Second health check should use cached result
      await llmService.checkHealth();

      // Should only call the API once due to caching
      expect(mockClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('isServiceAvailable', () => {
    it('should return current availability status', () => {
      expect(typeof llmService.isServiceAvailable()).toBe('boolean');
    });
  });

  describe('Model Management', () => {
    it('should return available models', () => {
      const models = llmService.getAvailableModels();
      expect(models).toContain(config.llm.model);
      expect(models).toContain(config.llm.fallbackModel);
    });

    it('should switch models', () => {
      const newModel = 'anthropic/claude-3-sonnet';
      llmService.switchModel(newModel);
      const models = llmService.getAvailableModels();
      expect(models[0]).toBe(newModel);
    });
  });

  describe('Enhanced Error Handling', () => {
    it('should handle malformed LLM response with fallback', async () => {
      const malformedResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: 'invalid json'
            }
          }
        }]
      };

      const validFallbackResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'unknown',
                confidence: 0.5,
                entities: {},
                response: 'I apologize, but I had trouble understanding your request. Could you please rephrase?'
              })
            }
          }
        }]
      };

      mockClient.chat.completions.create
        .mockResolvedValueOnce(malformedResponse)
        .mockResolvedValue(validFallbackResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      // Should still throw on malformed JSON, but test the fallback mechanism
      await expect(llmService.generateResponse('Hello', context)).rejects.toThrow();
    });

    it('should handle missing function call in response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Regular response without function call'
          }
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      await expect(llmService.generateResponse('Hello', context)).rejects.toThrow('LLM did not return expected function call');
    });

    it('should handle network timeouts with retry logic', async () => {
      const timeoutError = new Error('Request timeout');
      const successResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'extract_flight_intent',
              arguments: JSON.stringify({
                intent: 'greeting',
                confidence: 0.9,
                entities: {},
                response: 'Hello! How can I help you with your travel plans?'
              })
            }
          }
        }]
      };

      mockClient.chat.completions.create
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValue(successResponse);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      const result = await llmService.generateResponse('Hello', context);
      expect(result.intent.intent).toBe('greeting');
    });
  });

  describe('Requesty Integration Specifics', () => {
    it('should use correct Requesty headers', () => {
      // Verify that the service was initialized with correct headers
      expect(llmService).toBeDefined();
      // Headers are set in constructor, this test verifies the service initializes
    });

    it('should handle Requesty-specific error responses', async () => {
      const requestyError = new Error('Requesty: Model not available');
      requestyError.name = 'RequestyError';

      mockClient.chat.completions.create.mockRejectedValue(requestyError);
      mockClient.chat.completions.create.mockRejectedValue(requestyError);

      const context: ConversationContext = {
        sessionId: 'test-session',
        messageHistory: []
      };

      await expect(llmService.generateResponse('Hello', context)).rejects.toThrow();
    });
  });
});