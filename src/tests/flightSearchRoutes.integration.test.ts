import request from 'supertest';
import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import app from '../utils/app';
import { FlightSearchOrchestrator } from '../services/FlightSearchOrchestrator';
import { SearchService } from '../services/SearchService';
import { SearchCriteria } from '../models/FlightSearch';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Mock dependencies
jest.mock('../config/database');
jest.mock('../services/FlightSearchOrchestrator');
jest.mock('../factories/AirlineAdapterFactory');
jest.mock('../services/SearchService');
jest.mock('../utils/logger');

describe('Flight Search Routes Integration Tests', () => {
  let mockDatabase: jest.Mocked<Pool>;
  let mockRedisClient: jest.Mocked<RedisClientType>;
  let mockOrchestrator: jest.Mocked<FlightSearchOrchestrator>;
  let mockSearchService: jest.Mocked<SearchService>;
  let authToken: string;

  const mockSearchCriteria: SearchCriteria = {
    origin: 'LAX',
    destination: 'JFK',
    departureDate: new Date('2024-12-01'),
    passengers: { adults: 1, children: 0, infants: 0 },
    cabinClass: 'economy',
    flexible: false
  };



  beforeAll(() => {
    // Create auth token for testing
    authToken = jwt.sign(
      { id: 'test-user-id', email: 'test@example.com' },
      config.jwt.secret as string,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database and redis
    mockDatabase = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn()
    } as any;

    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      ping: jest.fn()
    } as any;

    // Mock SearchService
    mockSearchService = {
      createFlightSearch: jest.fn(),
      getFlightSearch: jest.fn(),
      updateFlightSearch: jest.fn(),
      filterFlightResults: jest.fn(),
      sortFlightResults: jest.fn(),
      validateAndSuggestCorrections: jest.fn()
    } as any;

    // Mock FlightSearchOrchestrator
    mockOrchestrator = {
      searchFlights: jest.fn(),
      filterSearchResults: jest.fn(),
      sortSearchResults: jest.fn(),
      getSearchProgress: jest.fn(),
      cancelSearch: jest.fn(),
      getActiveSearches: jest.fn(),
      healthCheck: jest.fn()
    } as any;

    // Set up module mocks
    require('../config/database').database = mockDatabase;
    require('../config/database').redisClient = mockRedisClient;
  });

  describe('POST /api/flight-search/searches/orchestrated', () => {
    it('should successfully create orchestrated flight search', async () => {
      const mockResult = {
        searchId: 'search-123',
        results: [
          {
            id: 'flight-1',
            airline: 'American Airlines',
            flightNumber: 'AA123',
            route: [],
            pricing: { 
              totalPrice: 500, 
              currency: 'USD', 
              pointsOptions: [], 
              taxes: 50, 
              fees: 25, 
              cashPrice: 425 
            },
            availability: { 
              availableSeats: 10, 
              bookingClass: 'Y', 
              fareBasis: 'Y' 
            },
            duration: 360,
            layovers: 0
          }
        ],
        totalResults: 1,
        searchTime: 2500,
        sources: ['american-airlines'],
        cached: false,
        sortBy: 'price',
        sortOrder: 'asc'
      };

      mockSearchService.validateAndSuggestCorrections.mockReturnValue({
        isValid: true,
        errors: [],
        suggestions: []
      });

      mockOrchestrator.searchFlights.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/flight-search/searches/orchestrated')
        .send({
          searchCriteria: mockSearchCriteria,
          airlines: ['american-airlines', 'delta-airlines'],
          searchOptions: { sortBy: 'price', sortOrder: 'asc' }
        })
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'Flight search completed successfully',
        searchId: 'search-123',
        results: expect.any(Array),
        totalResults: 1,
        searchTime: 2500,
        sources: ['american-airlines'],
        cached: false,
        sortBy: 'price',
        sortOrder: 'asc'
      });

      expect(mockOrchestrator.searchFlights).toHaveBeenCalledWith(
        expect.objectContaining({
          searchCriteria: mockSearchCriteria
        }),
        ['american-airlines', 'delta-airlines'],
        { sortBy: 'price', sortOrder: 'asc' }
      );
    });

    it('should handle validation errors', async () => {
      mockSearchService.validateAndSuggestCorrections.mockReturnValue({
        isValid: false,
        errors: ['Invalid origin airport code'],
        suggestions: ['Origin must be a valid 3-letter IATA airport code']
      });

      const response = await request(app)
        .post('/api/flight-search/searches/orchestrated')
        .send({
          searchCriteria: {
            ...mockSearchCriteria,
            origin: 'INVALID'
          }
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid search criteria',
        validationErrors: ['Invalid origin airport code'],
        suggestions: ['Origin must be a valid 3-letter IATA airport code']
      });
    });

    it('should handle orchestrator errors', async () => {
      mockSearchService.validateAndSuggestCorrections.mockReturnValue({
        isValid: true,
        errors: [],
        suggestions: []
      });

      mockOrchestrator.searchFlights.mockRejectedValue(new Error('Search timeout'));

      const response = await request(app)
        .post('/api/flight-search/searches/orchestrated')
        .send({
          searchCriteria: mockSearchCriteria
        })
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal server error during flight search',
        message: 'Search timeout'
      });
    });

    it('should work with authenticated user', async () => {
      const mockResult = {
        searchId: 'search-auth-123',
        results: [],
        totalResults: 0,
        searchTime: 1000,
        sources: [],
        cached: false
      };

      mockSearchService.validateAndSuggestCorrections.mockReturnValue({
        isValid: true,
        errors: [],
        suggestions: []
      });

      mockOrchestrator.searchFlights.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/flight-search/searches/orchestrated')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          searchCriteria: mockSearchCriteria
        })
        .expect(201);

      expect(response.body.searchId).toBe('search-auth-123');
      expect(mockOrchestrator.searchFlights).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'test-user-id',
          searchCriteria: mockSearchCriteria
        }),
        expect.any(Array),
        expect.any(Object)
      );
    });
  });

  describe('GET /api/flight-search/searches/:searchId/progress', () => {
    it('should return search progress for active search', async () => {
      const mockProgress = {
        searchId: 'progress-123',
        status: 'searching' as const,
        progress: 75,
        completedSources: ['american-airlines'],
        totalSources: 2,
        results: [],
        resultsCount: 5,
        errors: [],
        startTime: new Date(),
        estimatedCompletion: new Date()
      };

      mockOrchestrator.getSearchProgress.mockReturnValue(mockProgress);

      const response = await request(app)
        .get('/api/flight-search/searches/progress-123/progress')
        .expect(200);

      expect(response.body).toMatchObject({
        searchId: 'progress-123',
        status: 'searching',
        progress: 75,
        completedSources: ['american-airlines'],
        totalSources: 2,
        resultsCount: 5,
        errors: []
      });
    });

    it('should return 404 for non-existent search', async () => {
      mockOrchestrator.getSearchProgress.mockReturnValue(null);

      const response = await request(app)
        .get('/api/flight-search/searches/non-existent/progress')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Search progress not found or search completed'
      });
    });
  });

  describe('DELETE /api/flight-search/searches/:searchId/cancel', () => {
    it('should cancel active search for authenticated user', async () => {
      const mockSearch = {
        id: 'cancel-123',
        userId: 'test-user-id',
        searchCriteria: mockSearchCriteria,
        results: [],
        status: 'pending' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      mockSearchService.getFlightSearch.mockResolvedValue(mockSearch);
      mockOrchestrator.cancelSearch.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/flight-search/searches/cancel-123/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Search cancelled successfully'
      });

      expect(mockOrchestrator.cancelSearch).toHaveBeenCalledWith('cancel-123');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/flight-search/searches/cancel-123/cancel')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Authentication required'
      });
    });

    it('should check search ownership', async () => {
      const mockSearch = {
        id: 'cancel-456',
        userId: 'other-user-id',
        searchCriteria: mockSearchCriteria,
        results: [],
        status: 'pending' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      mockSearchService.getFlightSearch.mockResolvedValue(mockSearch);

      const response = await request(app)
        .delete('/api/flight-search/searches/cancel-456/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied to this search'
      });
    });

    it('should handle search not found', async () => {
      mockSearchService.getFlightSearch.mockResolvedValue(null);
      mockOrchestrator.cancelSearch.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/flight-search/searches/not-found/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Search not found or already completed'
      });
    });
  });

  describe('GET /api/flight-search/searches/active', () => {
    it('should return all active searches', async () => {
      const mockActiveSearches = [
        {
          searchId: 'active-1',
          status: 'searching' as const,
          progress: 25,
          completedSources: [],
          totalSources: 2,
          results: [],
          errors: [],
          resultsCount: 0,
          startTime: new Date()
        },
        {
          searchId: 'active-2',
          status: 'aggregating' as const,
          progress: 80,
          completedSources: ['american-airlines', 'delta-airlines'],
          totalSources: 2,
          results: [],
          errors: [],
          resultsCount: 10,
          startTime: new Date()
        }
      ];

      mockOrchestrator.getActiveSearches.mockReturnValue(mockActiveSearches);

      const response = await request(app)
        .get('/api/flight-search/searches/active')
        .expect(200);

      expect(response.body).toMatchObject({
        activeSearches: expect.arrayContaining([
          expect.objectContaining({
            searchId: 'active-1',
            status: 'searching',
            progress: 25
          }),
          expect.objectContaining({
            searchId: 'active-2',
            status: 'aggregating',
            progress: 80
          })
        ]),
        totalActive: 2
      });
    });
  });

  describe('POST /api/flight-search/searches/:searchId/filter/enhanced', () => {
    it('should filter search results with orchestrator', async () => {
      const mockSearch = {
        id: 'filter-123',
        userId: 'test-user-id',
        searchCriteria: mockSearchCriteria,
        results: [
          {
            id: 'flight-1',
            airline: 'American Airlines',
            flightNumber: 'AA123',
            route: [],
            pricing: { 
              totalPrice: 500, 
              currency: 'USD', 
              pointsOptions: [], 
              taxes: 50, 
              fees: 25, 
              cashPrice: 425 
            },
            availability: { 
              availableSeats: 10, 
              bookingClass: 'Y', 
              fareBasis: 'Y' 
            },
            duration: 360,
            layovers: 0
          },
          {
            id: 'flight-2',
            airline: 'Delta Airlines',
            flightNumber: 'DL456',
            route: [],
            pricing: { 
              totalPrice: 800, 
              currency: 'USD', 
              pointsOptions: [], 
              taxes: 80, 
              fees: 40, 
              cashPrice: 680 
            },
            availability: { 
              availableSeats: 5, 
              bookingClass: 'Y', 
              fareBasis: 'Y' 
            },
            duration: 480,
            layovers: 1
          }
        ],
        status: 'completed' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      const mockFilterResult = {
        searchId: 'filter-123',
        results: [mockSearch.results[0]!],
        totalResults: 1,
        searchTime: 0,
        sources: [],
        cached: true,
        filters: { maxPrice: 600 }
      };

      mockSearchService.getFlightSearch.mockResolvedValue(mockSearch);
      mockOrchestrator.filterSearchResults.mockResolvedValue(mockFilterResult);

      const response = await request(app)
        .post('/api/flight-search/searches/filter-123/filter/enhanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          maxPrice: 600
        })
        .expect(200);

      expect(response.body).toMatchObject({
        searchId: 'filter-123',
        results: expect.any(Array),
        totalResults: 1,
        filters: { maxPrice: 600 },
        originalCount: 2,
        filteredCount: 1
      });

      expect(mockOrchestrator.filterSearchResults).toHaveBeenCalledWith(
        'filter-123',
        { maxPrice: 600 }
      );
    });

    it('should check search permissions', async () => {
      const mockSearch = {
        id: 'filter-456',
        userId: 'other-user-id',
        searchCriteria: mockSearchCriteria,
        results: [],
        status: 'completed' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      mockSearchService.getFlightSearch.mockResolvedValue(mockSearch);

      const response = await request(app)
        .post('/api/flight-search/searches/filter-456/filter/enhanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          maxPrice: 600
        })
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied to this search'
      });
    });
  });

  describe('POST /api/flight-search/searches/:searchId/sort/enhanced', () => {
    it('should sort search results with orchestrator', async () => {
      const mockSearch = {
        id: 'sort-123',
        userId: 'test-user-id',
        searchCriteria: mockSearchCriteria,
        results: [
          {
            id: 'flight-1',
            airline: 'American Airlines',
            flightNumber: 'AA123',
            route: [],
            pricing: { 
              totalPrice: 800, 
              currency: 'USD', 
              pointsOptions: [], 
              taxes: 80, 
              fees: 40, 
              cashPrice: 680 
            },
            availability: { 
              availableSeats: 10, 
              bookingClass: 'Y', 
              fareBasis: 'Y' 
            },
            duration: 360,
            layovers: 0
          },
          {
            id: 'flight-2',
            airline: 'Delta Airlines',
            flightNumber: 'DL456',
            route: [],
            pricing: { 
              totalPrice: 500, 
              currency: 'USD', 
              pointsOptions: [], 
              taxes: 50, 
              fees: 25, 
              cashPrice: 425 
            },
            availability: { 
              availableSeats: 5, 
              bookingClass: 'Y', 
              fareBasis: 'Y' 
            },
            duration: 480,
            layovers: 1
          }
        ],
        status: 'completed' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      const mockSortResult = {
        searchId: 'sort-123',
        results: [mockSearch.results[1]!, mockSearch.results[0]!], // Sorted by price
        totalResults: 2,
        searchTime: 0,
        sources: [],
        cached: true,
        sortBy: 'price',
        sortOrder: 'asc'
      };

      mockSearchService.getFlightSearch.mockResolvedValue(mockSearch);
      mockOrchestrator.sortSearchResults.mockResolvedValue(mockSortResult);

      const response = await request(app)
        .post('/api/flight-search/searches/sort-123/sort/enhanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sortBy: 'price',
          sortOrder: 'asc'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        searchId: 'sort-123',
        results: expect.any(Array),
        totalResults: 2,
        sortBy: 'price',
        sortOrder: 'asc'
      });

      expect(mockOrchestrator.sortSearchResults).toHaveBeenCalledWith(
        'sort-123',
        'price',
        'asc'
      );
    });
  });

  describe('GET /api/flight-search/health', () => {
    it('should return healthy status', async () => {
      const mockHealth = {
        status: 'healthy' as const,
        activeSearches: 2,
        adapterHealth: {
          'american-airlines': { status: 'healthy', lastCheck: new Date() },
          'delta-airlines': { status: 'healthy', lastCheck: new Date() }
        },
        cacheHealth: true
      };

      mockOrchestrator.healthCheck.mockResolvedValue(mockHealth);

      const response = await request(app)
        .get('/api/flight-search/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        activeSearches: 2,
        adapterHealth: expect.any(Object),
        cacheHealth: true,
        timestamp: expect.any(String)
      });
    });

    it('should return degraded status with 206 status code', async () => {
      const mockHealth = {
        status: 'degraded' as const,
        activeSearches: 1,
        adapterHealth: {
          'american-airlines': { status: 'healthy', lastCheck: new Date() },
          'delta-airlines': { status: 'unhealthy', lastCheck: new Date() }
        },
        cacheHealth: true
      };

      mockOrchestrator.healthCheck.mockResolvedValue(mockHealth);

      const response = await request(app)
        .get('/api/flight-search/health')
        .expect(206);

      expect(response.body.status).toBe('degraded');
    });

    it('should return unhealthy status with 503 status code', async () => {
      const mockHealth = {
        status: 'unhealthy' as const,
        activeSearches: 0,
        adapterHealth: {
          'american-airlines': { status: 'unhealthy', lastCheck: new Date() },
          'delta-airlines': { status: 'unhealthy', lastCheck: new Date() }
        },
        cacheHealth: false
      };

      mockOrchestrator.healthCheck.mockResolvedValue(mockHealth);

      const response = await request(app)
        .get('/api/flight-search/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
    });

    it('should handle health check errors', async () => {
      mockOrchestrator.healthCheck.mockRejectedValue(new Error('Health check failed'));

      const response = await request(app)
        .get('/api/flight-search/health')
        .expect(500);

      expect(response.body).toMatchObject({
        status: 'unhealthy',
        error: 'Health check failed'
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate search criteria format', async () => {
      const response = await request(app)
        .post('/api/flight-search/searches/orchestrated')
        .send({
          searchCriteria: {
            origin: 'INVALID_CODE', // Too long
            destination: 'JFK',
            departureDate: '2024-12-01',
            passengers: { adults: 1, children: 0, infants: 0 },
            cabinClass: 'economy',
            flexible: false
          }
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: expect.stringContaining('origin'),
            message: expect.any(String)
          })
        ])
      });
    });

    it('should validate filter parameters', async () => {
      const response = await request(app)
        .post('/api/flight-search/searches/test-123/filter/enhanced')
        .send({
          maxPrice: -100 // Invalid negative price
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        details: expect.any(Array)
      });
    });

    it('should validate sort parameters', async () => {
      const response = await request(app)
        .post('/api/flight-search/searches/test-123/sort/enhanced')
        .send({
          sortBy: 'invalid_field', // Invalid sort field
          sortOrder: 'asc'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed',
        details: expect.any(Array)
      });
    });
  });
});