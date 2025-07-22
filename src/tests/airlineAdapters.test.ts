import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MockAirlineAdapter } from '../adapters/MockAirlineAdapter';
import { AirlineRateLimiter } from '../services/AirlineRateLimiter';
import { AirlineCacheService } from '../services/AirlineCache';
import { AirlineSearchRequest, AirlineSearchResponse, AirlineConfig } from '../adapters/BaseAirlineAdapter';
import { SearchCriteria } from '../models/FlightSearch';

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  keys: jest.fn(),
  flushAll: jest.fn(),
  info: jest.fn(),
  isOpen: true,
  isReady: true
} as any;

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

describe('Airline Adapter Integration Tests', () => {
  let mockAdapter: MockAirlineAdapter;
  let rateLimiter: AirlineRateLimiter;
  let cache: AirlineCacheService;

  const sampleSearchCriteria: SearchCriteria = {
    origin: 'JFK',
    destination: 'LAX',
    departureDate: new Date('2024-03-15'),
    returnDate: new Date('2024-03-20'),
    passengers: {
      adults: 2,
      children: 1,
      infants: 0
    },
    cabinClass: 'economy',
    flexible: false
  };

  const sampleSearchRequest: AirlineSearchRequest = {
    searchCriteria: sampleSearchCriteria,
    requestId: 'test-request-123',
    timestamp: new Date()
  };

  const validConfig: AirlineConfig = {
    name: 'MockAirline',
    baseUrl: 'https://api.mockairline.com',
    apiKey: 'test-api-key',
    timeout: 5000,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000
    },
    retryConfig: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    }
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock Redis responses
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.setEx.mockResolvedValue('OK');
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);
    mockRedisClient.exists.mockResolvedValue(0);
    mockRedisClient.keys.mockResolvedValue([]);
    mockRedisClient.info.mockResolvedValue('used_memory_human:1.5M\r\n');

    // Initialize services
    rateLimiter = new AirlineRateLimiter(mockRedisClient);
    cache = new AirlineCacheService(mockRedisClient);
    
    // Initialize mock adapter
    mockAdapter = new MockAirlineAdapter(validConfig, rateLimiter, cache);
  });

  afterEach(async () => {
    // Clean up if needed
  });

  describe('MockAirlineAdapter', () => {
    it('should validate configuration correctly', () => {
      expect(mockAdapter.validateConfig()).toBe(true);
      
      // Test invalid configuration
      const invalidConfig = {
        ...validConfig,
        timeout: -1
      };
      
      expect(() => {
        new MockAirlineAdapter(invalidConfig, rateLimiter, cache);
      }).toThrow();
    });

    it('should search flights successfully', async () => {
      const response = await mockAdapter.searchFlights(sampleSearchRequest);

      expect(response).toBeDefined();
      expect(response.flights).toBeDefined();
      expect(Array.isArray(response.flights)).toBe(true);
      expect(response.requestId).toBe(sampleSearchRequest.requestId);
      expect(response.totalResults).toBeGreaterThanOrEqual(0);
      expect(response.source).toBe('mock');
      expect(response.timestamp).toBeInstanceOf(Date);
      
      if (response.flights.length > 0) {
        const flight = response.flights[0];
        expect(flight).toHaveProperty('id');
        expect(flight).toHaveProperty('airline');
        expect(flight).toHaveProperty('flightNumber');
        expect(flight).toHaveProperty('route');
        expect(flight).toHaveProperty('pricing');
        expect(flight).toHaveProperty('availability');
        expect(Array.isArray(flight!.route)).toBe(true);
      }
    });

    it('should handle different test scenarios', async () => {
      // Test no flights scenario using generateScenario
      const noFlightsData = await mockAdapter.generateScenario('no-flights');
      jest.spyOn(mockAdapter as any, 'generateMockFlightData').mockReturnValue(noFlightsData);

      const noFlightsRequest = { ...sampleSearchRequest, requestId: 'no-flights-test' };
      const noFlightsResponse = await mockAdapter.searchFlights(noFlightsRequest);
      expect(noFlightsResponse.flights).toHaveLength(0);
      expect(noFlightsResponse.totalResults).toBe(0);

      // Reset the mock for the next test
      jest.restoreAllMocks();
      
      // Test expensive flights scenario using generateScenario
      const expensiveFlightsData = await mockAdapter.generateScenario('expensive-flights');
      jest.spyOn(mockAdapter as any, 'generateMockFlightData').mockReturnValue(expensiveFlightsData);

      const expensiveRequest = { ...sampleSearchRequest, requestId: 'expensive-flights-test' };
      const expensiveResponse = await mockAdapter.searchFlights(expensiveRequest);
      expect(expensiveResponse.flights.length).toBeGreaterThan(0);
      expect(expensiveResponse.flights[0]!.pricing.cashPrice).toBeGreaterThan(1500);
    });

    it('should perform health checks', async () => {
      const isHealthy = await mockAdapter.healthCheck();
      expect(isHealthy).toBe(true);

      const status = await mockAdapter.getStatus();
      expect(status.isHealthy).toBe(true);
      expect(status.errorRate).toBeGreaterThanOrEqual(0);
      expect(status.averageResponseTime).toBeGreaterThanOrEqual(0);
    });

    it('should update configuration', () => {
      const newConfig = {
        timeout: 10000,
        rateLimit: {
          requestsPerMinute: 30,
          requestsPerHour: 500
        }
      };

      mockAdapter.updateConfig(newConfig);
      expect(mockAdapter.config.timeout).toBe(10000);
      expect(mockAdapter.config.rateLimit.requestsPerMinute).toBe(30);
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should respect rate limits', async () => {
      // Mock rate limiter to return false (rate limited)
      jest.spyOn(rateLimiter, 'checkLimit').mockResolvedValueOnce(false);
      
      try {
        await mockAdapter.searchFlights(sampleSearchRequest);
        fail('Should have thrown rate limit error');
      } catch (error: any) {
        expect(error.message).toContain('Rate limit exceeded');
      }
    });

    it('should allow requests within rate limits', async () => {
      // Mock rate limiter to return true (within limits)
      jest.spyOn(rateLimiter, 'checkLimit').mockResolvedValue(true);
      jest.spyOn(rateLimiter, 'incrementCounter').mockResolvedValue(undefined);
      
      const response = await mockAdapter.searchFlights(sampleSearchRequest);
      expect(response).toBeDefined();
      expect(response.flights).toBeDefined();
    });
  });

  describe('Caching Integration', () => {
    it('should cache successful responses', async () => {
      jest.spyOn(rateLimiter, 'checkLimit').mockResolvedValue(true);
      jest.spyOn(rateLimiter, 'incrementCounter').mockResolvedValue(undefined);
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(cache, 'set').mockResolvedValue();
      
      const response = await mockAdapter.searchFlights(sampleSearchRequest);
      expect(response).toBeDefined();
      
      // Verify cache was called to set
      expect(cache.set).toHaveBeenCalled();
    });

    it('should return cached responses', async () => {
      const cachedResponse: AirlineSearchResponse = {
        requestId: sampleSearchRequest.requestId,
        flights: [],
        totalResults: 0,
        searchTime: 100,
        currency: 'USD',
        timestamp: new Date(),
        source: 'MockAirline'
      };

      jest.spyOn(cache, 'get').mockResolvedValue(cachedResponse);
      
      const response = await mockAdapter.searchFlights(sampleSearchRequest);
      expect(response).toEqual(cachedResponse);
    });

    it('should handle cache misses gracefully', async () => {
      jest.spyOn(rateLimiter, 'checkLimit').mockResolvedValue(true);
      jest.spyOn(rateLimiter, 'incrementCounter').mockResolvedValue(undefined);
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(cache, 'set').mockResolvedValue();
      
      const response = await mockAdapter.searchFlights(sampleSearchRequest);
      expect(response).toBeDefined();
      expect(response.flights).toBeDefined();
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should handle API errors gracefully', async () => {
      // Create an adapter that will simulate errors
      const errorConfig = {
        ...validConfig,
        name: 'ErrorAirline'
      };
      
      const errorAdapter = new MockAirlineAdapter(errorConfig, rateLimiter, cache);
      
      // Mock the makeApiRequest to throw an error
      jest.spyOn(errorAdapter as any, 'makeApiRequest').mockRejectedValue(new Error('API Error'));
      
      try {
        await errorAdapter.searchFlights(sampleSearchRequest);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should validate retry configuration', () => {
      const retryConfig = {
        ...validConfig,
        retryConfig: {
          maxRetries: 5,
          backoffMultiplier: 1.5,
          initialDelay: 500
        }
      };
      
      const retryAdapter = new MockAirlineAdapter(retryConfig, rateLimiter, cache);
      expect(retryAdapter.config.retryConfig.maxRetries).toBe(5);
      expect(retryAdapter.config.retryConfig.backoffMultiplier).toBe(1.5);
    });
  });

  describe('Response Normalization', () => {
    it('should normalize flight data consistently', async () => {
      jest.spyOn(rateLimiter, 'checkLimit').mockResolvedValue(true);
      jest.spyOn(rateLimiter, 'incrementCounter').mockResolvedValue(undefined);
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(cache, 'set').mockResolvedValue();
      
      const response = await mockAdapter.searchFlights(sampleSearchRequest);
      
      if (response.flights.length > 0) {
        const flight = response.flights[0];
        
        // Verify normalized structure
        expect(flight!.id).toBeDefined();
        expect(typeof flight!.id).toBe('string');

        expect(flight!.airline).toBeDefined();
        expect(typeof flight!.airline).toBe('string');

        expect(flight!.pricing).toBeDefined();
        expect(flight!.pricing).toHaveProperty('cashPrice');
        expect(flight!.pricing).toHaveProperty('currency');
        expect(typeof flight!.pricing.cashPrice).toBe('number');
        expect(typeof flight!.pricing.currency).toBe('string');

        expect(flight!.route).toBeDefined();
        expect(Array.isArray(flight!.route)).toBe(true);

        if (flight!.route.length > 0) {
          const segment = flight!.route[0];
          expect(segment).toHaveProperty('origin');
          expect(segment).toHaveProperty('destination');
          expect(segment).toHaveProperty('departureTime');
          expect(segment).toHaveProperty('arrivalTime');
          expect(segment).toHaveProperty('flightNumber');
          expect(segment!.departureTime).toBeInstanceOf(Date);
          expect(segment!.arrivalTime).toBeInstanceOf(Date);
        }
      }
    });

    it('should handle different flight types consistently', async () => {
      jest.spyOn(rateLimiter, 'checkLimit').mockResolvedValue(true);
      jest.spyOn(rateLimiter, 'incrementCounter').mockResolvedValue(undefined);
      jest.spyOn(cache, 'get').mockResolvedValue(null);
      jest.spyOn(cache, 'set').mockResolvedValue();
      
      // Test direct flights
      const directRequest = {
        ...sampleSearchRequest,
        searchCriteria: {
          ...sampleSearchCriteria,
          flexible: false
        }
      };
      
      const directResponse = await mockAdapter.searchFlights(directRequest);
      expect(directResponse.flights).toBeDefined();
      
      // Test flexible flights
      const flexibleRequest = {
        ...sampleSearchRequest,
        searchCriteria: {
          ...sampleSearchCriteria,
          flexible: true
        }
      };
      
      const flexibleResponse = await mockAdapter.searchFlights(flexibleRequest);
      expect(flexibleResponse.flights).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should validate configuration on initialization', () => {
      // Test valid configuration
      expect(() => {
        new MockAirlineAdapter(validConfig, rateLimiter, cache);
      }).not.toThrow();
      
      // Test invalid configurations
      const invalidConfigs = [
        { ...validConfig, name: '' },
        { ...validConfig, apiKey: '' },
        { ...validConfig, baseUrl: '' },
        { ...validConfig, timeout: -1 },
        { ...validConfig, rateLimit: { requestsPerMinute: 0, requestsPerHour: 100 } },
        { ...validConfig, retryConfig: { maxRetries: -1, backoffMultiplier: 1, initialDelay: 100 } }
      ];

      invalidConfigs.forEach((config) => {
        expect(() => {
          new MockAirlineAdapter(config, rateLimiter, cache);
        }).toThrow();
      });
    });

    it('should use configuration values correctly', () => {
      const customConfig: AirlineConfig = {
        name: 'CustomMockAirline',
        baseUrl: 'https://api.custom.com',
        apiKey: 'custom-key',
        timeout: 10000,
        rateLimit: {
          requestsPerMinute: 30,
          requestsPerHour: 500
        },
        retryConfig: {
          maxRetries: 5,
          backoffMultiplier: 1.5,
          initialDelay: 2000
        }
      };

      const customAdapter = new MockAirlineAdapter(customConfig, rateLimiter, cache);
      expect(customAdapter.name).toBe('mock');
      expect(customAdapter.config.timeout).toBe(10000);
      expect(customAdapter.config.rateLimit.requestsPerMinute).toBe(30);
      expect(customAdapter.config.retryConfig.maxRetries).toBe(5);
    });
  });

  describe('Cache Service Integration', () => {
    it('should generate consistent cache keys', () => {
      const key1 = cache.generateKey(sampleSearchCriteria, 'TestAirline');
      const key2 = cache.generateKey(sampleSearchCriteria, 'TestAirline');
      
      expect(key1).toBe(key2);
      expect(typeof key1).toBe('string');
      expect(key1.length).toBeGreaterThan(0);
    });

    it('should handle cache operations', async () => {
      const testResponse: AirlineSearchResponse = {
        requestId: 'test-123',
        flights: [],
        totalResults: 0,
        searchTime: 100,
        currency: 'USD',
        timestamp: new Date(),
        source: 'TestAirline'
      };

      // Test cache set and get
      await cache.set('test-key', testResponse, 300);
      expect(mockRedisClient.setEx).toHaveBeenCalled();

      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(testResponse));
      const retrieved = await cache.get('test-key');
      expect(retrieved).toBeDefined();
    });
  });

  describe('Rate Limiter Service Integration', () => {
    it('should check rate limits correctly', async () => {
      // Mock Redis get to return low counts (within limits)
      mockRedisClient.get.mockResolvedValue('5'); // Low count, within limits
      
      const result = await rateLimiter.checkLimit('test-key');
      expect(result).toBe(true);
      expect(mockRedisClient.get).toHaveBeenCalled();
    });

    it('should enforce rate limits', async () => {
      // Mock Redis get to return high counts (exceeding limits)
      mockRedisClient.get.mockResolvedValue('100'); // High count, exceeds default limits
      
      const result = await rateLimiter.checkLimit('test-key');
      expect(result).toBe(false);
      expect(mockRedisClient.get).toHaveBeenCalled();
    });

    it('should increment counters', async () => {
      mockRedisClient.incr.mockResolvedValue(2);
      
      await rateLimiter.incrementCounter('test-key');
      expect(mockRedisClient.incr).toHaveBeenCalled();
    });
  });
});