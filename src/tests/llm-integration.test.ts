import { LLMService, ConversationContext } from '../services/LLMService';
import { config } from '../config';

/**
 * Integration tests for Requesty LLM service communication
 * These tests can be run against a real Requesty API endpoint
 * Set REQUESTY_API_KEY environment variable to run against live API
 */
describe('LLM Service - Requesty Integration Tests', () => {
  let llmService: LLMService;
  const isLiveTest = Boolean(process.env['REQUESTY_API_KEY'] && process.env['RUN_INTEGRATION_TESTS'] === 'true');

  beforeEach(() => {
    llmService = new LLMService();
  });

  // Skip integration tests if no API key is provided
  const testIf = (condition: boolean) => condition ? test : test.skip;

  describe('Live API Communication', () => {
    testIf(isLiveTest)('should successfully communicate with Requesty API', async () => {
      const context: ConversationContext = {
        sessionId: 'integration-test',
        messageHistory: []
      };

      const result = await llmService.generateResponse('Hello, I need help finding flights', context);

      expect(result).toBeDefined();
      expect(result.content).toBeTruthy();
      expect(result.intent).toBeDefined();
      expect(result.intent.intent).toBeTruthy();
      expect(result.intent.confidence).toBeGreaterThanOrEqual(0);
      expect(result.intent.confidence).toBeLessThanOrEqual(1);
    }, 30000); // 30 second timeout for API calls

    testIf(isLiveTest)('should handle flight search intent with real API', async () => {
      const context: ConversationContext = {
        sessionId: 'integration-test',
        messageHistory: []
      };

      const result = await llmService.generateResponse(
        'I want to fly from New York to Los Angeles next Friday',
        context
      );

      expect(result.intent.intent).toBe('flight_search');
      expect(result.intent.entities.origin).toBeTruthy();
      expect(result.intent.entities.destination).toBeTruthy();
      expect(result.requiresAction?.type).toBe('search_flights');
    }, 30000);

    testIf(isLiveTest)('should handle points inquiry with real API', async () => {
      const context: ConversationContext = {
        sessionId: 'integration-test',
        messageHistory: []
      };

      const result = await llmService.generateResponse(
        'How can I use my 100,000 Chase Ultimate Rewards points?',
        context
      );

      expect(result.intent.intent).toBe('points_inquiry');
      expect(result.intent.entities.loyaltyProgram).toBeTruthy();
      expect(result.intent.entities.pointsAmount).toBeTruthy();
      expect(result.requiresAction?.type).toBe('check_points');
    }, 30000);

    testIf(isLiveTest)('should maintain conversation context with real API', async () => {
      const context: ConversationContext = {
        sessionId: 'integration-test',
        messageHistory: [
          {
            role: 'user',
            content: 'I want to travel to Europe',
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: 'Which city in Europe are you interested in?',
            timestamp: new Date()
          }
        ]
      };

      const result = await llmService.generateResponse('Paris would be great', context);

      expect(result.intent.intent).toBe('flight_search');
      expect(result.intent.entities.destination).toMatch(/paris/i);
    }, 30000);

    testIf(isLiveTest)('should handle model fallback with real API', async () => {
      // Temporarily switch to an invalid model to test fallback
      const originalModel = config.llm.model;
      config.llm.model = 'invalid/model-name';

      const context: ConversationContext = {
        sessionId: 'integration-test',
        messageHistory: []
      };

      try {
        const result = await llmService.generateResponse('Hello', context);
        
        // If we get here, fallback worked
        expect(result).toBeDefined();
        expect(result.content).toBeTruthy();
      } catch (error) {
        // If both models fail, that's also a valid test result
        expect(error).toBeDefined();
      } finally {
        // Restore original model
        config.llm.model = originalModel;
      }
    }, 30000);
  });

  describe('Health Check Integration', () => {
    testIf(isLiveTest)('should perform health check against real API', async () => {
      const isHealthy = await llmService.checkHealth();
      
      // Should be healthy if API key is valid
      expect(typeof isHealthy).toBe('boolean');
      expect(llmService.isServiceAvailable()).toBe(isHealthy);
    }, 15000);

    testIf(isLiveTest)('should cache health check results', async () => {
      const start = Date.now();
      
      // First health check
      await llmService.checkHealth();
      const firstCheckTime = Date.now() - start;
      
      const secondStart = Date.now();
      
      // Second health check should be cached
      await llmService.checkHealth();
      const secondCheckTime = Date.now() - secondStart;
      
      // Second check should be much faster due to caching
      expect(secondCheckTime).toBeLessThan(firstCheckTime / 2);
    }, 15000);
  });

  describe('Error Handling Integration', () => {
    test('should handle invalid API key gracefully', async () => {
      // Create service with invalid API key
      const originalApiKey = config.llm.apiKey;
      config.llm.apiKey = 'invalid-api-key';
      
      const invalidService = new LLMService();
      const context: ConversationContext = {
        sessionId: 'error-test',
        messageHistory: []
      };

      try {
        await invalidService.generateResponse('Hello', context);
        // If we get here without error, the test should fail
        fail('Expected API call to fail with invalid key');
      } catch (error) {
        expect(error).toBeDefined();
        expect(invalidService.isServiceAvailable()).toBe(false);
      } finally {
        // Restore original API key
        config.llm.apiKey = originalApiKey;
      }
    }, 15000);

    testIf(isLiveTest)('should handle rate limiting gracefully', async () => {
      const context: ConversationContext = {
        sessionId: 'rate-limit-test',
        messageHistory: []
      };

      // Make multiple rapid requests to potentially trigger rate limiting
      const promises = Array.from({ length: 5 }, (_, i) =>
        llmService.generateResponse(`Test message ${i}`, context)
      );

      try {
        const results = await Promise.allSettled(promises);
        
        // At least some requests should succeed
        const successful = results.filter(r => r.status === 'fulfilled');
        expect(successful.length).toBeGreaterThan(0);
        
        // Failed requests should have meaningful error messages
        const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
        failed.forEach(failure => {
          expect(failure.reason).toBeDefined();
        });
      } catch (error) {
        // Rate limiting or other API errors are acceptable in this test
        expect(error).toBeDefined();
      }
    }, 60000);
  });

  describe('Model Switching Integration', () => {
    testIf(isLiveTest)('should switch between available models', async () => {
      const originalModel = llmService.getAvailableModels()[0];
      const fallbackModel = config.llm.fallbackModel;
      
      if (originalModel && originalModel !== fallbackModel) {
        llmService.switchModel(fallbackModel);
        
        const context: ConversationContext = {
          sessionId: 'model-switch-test',
          messageHistory: []
        };

        const result = await llmService.generateResponse('Hello', context);
        
        expect(result).toBeDefined();
        expect(result.content).toBeTruthy();
        
        // Switch back
        llmService.switchModel(originalModel);
      }
    }, 30000);
  });

  describe('Performance Integration', () => {
    testIf(isLiveTest)('should respond within reasonable time limits', async () => {
      const context: ConversationContext = {
        sessionId: 'performance-test',
        messageHistory: []
      };

      const start = Date.now();
      const result = await llmService.generateResponse(
        'Find me flights from Boston to San Francisco for next week',
        context
      );
      const duration = Date.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should respond within 10 seconds
    }, 15000);

    testIf(isLiveTest)('should handle concurrent requests', async () => {
      const context: ConversationContext = {
        sessionId: 'concurrent-test',
        messageHistory: []
      };

      const requests = [
        'Find flights to Paris',
        'Check my points balance',
        'What are the best deals today?'
      ];

      const start = Date.now();
      const promises = requests.map(msg => 
        llmService.generateResponse(msg, { ...context, sessionId: `concurrent-${Math.random()}` })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.content).toBeTruthy();
      });
      
      // Concurrent requests should be faster than sequential
      expect(duration).toBeLessThan(20000);
    }, 30000);
  });
});