import request from 'supertest';
import express from 'express';
import advancedRoutingRouter from '../routes/advancedRouting';
import { database, redisClient } from '../config/database';
import { FlightSearchModel } from '../models/FlightSearch';

// Mock dependencies
jest.mock('../config/database');
jest.mock('../services/EnhancedSearchOrchestrator');
jest.mock('../middleware/auth');

const app = express();
app.use(express.json());
app.use('/api/advanced-routing', advancedRoutingRouter);

describe('Advanced Routing Routes Integration Tests', () => {
  let mockFlightSearchModel: jest.Mocked<FlightSearchModel>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFlightSearchModel = {
      getSearch: jest.fn(),
      createSearch: jest.fn(),
      updateSearch: jest.fn(),
      getUserSearches: jest.fn(),
      getRecentSearches: jest.fn(),
      deleteSearch: jest.fn(),
      deleteExpiredSearches: jest.fn()
    } as any;

    // Mock auth middleware to always pass
    const mockAuth = require('../middleware/auth');
    mockAuth.authenticateToken = jest.fn((req: any, res: any, next: any) => {
      req.user = { id: 'user-123', email: 'test@example.com' };
      next();
    });
    mockAuth.optionalAuth = jest.fn((req: any, res: any, next: any) => {
      req.user = { id: 'user-123', email: 'test@example.com' };
      next();
    });
  });

  describe('POST /enhanced-search', () => {
    const validSearchRequest = {
      searchCriteria: {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2024-06-01T10:00:00Z',
        passengers: {
          adults: 1,
          children: 0,
          infants: 0
        },
        cabinClass: 'economy',
        flexible: false
      },
      airlines: ['AA', 'DL'],
      includeNearbyAirports: false,
      flexibleDates: false
    };

    it('should perform enhanced search successfully', async () => {
      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.enhancedSearchFlights = jest.fn().mockResolvedValue({
        searchId: 'search-123',
        results: [{
          id: '1',
          airline: 'AA',
          flightNumber: 'AA100',
          route: [{
            airline: 'AA',
            flightNumber: 'AA100',
            origin: 'JFK',
            destination: 'LAX',
            departureTime: new Date('2024-06-01T10:00:00Z'),
            arrivalTime: new Date('2024-06-01T16:00:00Z'),
            duration: 360
          }],
          pricing: {
            cashPrice: 500,
            currency: 'USD',
            pointsOptions: [],
            taxes: 50,
            fees: 25,
            totalPrice: 575
          },
          availability: {
            availableSeats: 10,
            bookingClass: 'Y',
            fareBasis: 'Y'
          },
          duration: 360,
          layovers: 0
        }],
        totalResults: 1,
        searchTime: 1500,
        sources: ['AA']
      });

      const response = await request(app)
        .post('/api/advanced-routing/enhanced-search')
        .send(validSearchRequest)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Enhanced flight search completed successfully');
      expect(response.body).toHaveProperty('searchId', 'search-123');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('totalResults', 1);
      expect(response.body.results).toHaveLength(1);
    });

    it('should validate search criteria', async () => {
      const invalidRequest = {
        searchCriteria: {
          origin: 'INVALID', // Invalid airport code
          destination: 'LAX',
          departureDate: '2024-06-01T10:00:00Z',
          passengers: {
            adults: 1,
            children: 0,
            infants: 0
          }
        }
      };

      const response = await request(app)
        .post('/api/advanced-routing/enhanced-search')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('details');
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should handle route optimization options', async () => {
      const requestWithOptimization = {
        ...validSearchRequest,
        routeOptimization: {
          considerPositioning: true,
          maxPositioningDetour: 500,
          allowStopovers: true,
          maxStopoverDuration: 24,
          prioritizeCost: true
        }
      };

      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.enhancedSearchFlights = jest.fn().mockResolvedValue({
        searchId: 'search-123',
        results: [],
        totalResults: 0,
        searchTime: 1500,
        sources: [],
        optimizedRoute: {
          routeType: 'positioning',
          totalCost: 500,
          savings: 75,
          optimizationScore: 85
        }
      });

      const response = await request(app)
        .post('/api/advanced-routing/enhanced-search')
        .send(requestWithOptimization)
        .expect(201);

      expect(response.body).toHaveProperty('optimizedRoute');
      expect(response.body.optimizedRoute).toHaveProperty('routeType', 'positioning');
      expect(response.body.optimizedRoute).toHaveProperty('savings', 75);
    });

    it('should handle power user filters', async () => {
      const requestWithFilters = {
        ...validSearchRequest,
        powerUserFilters: {
          aircraftTypes: ['A350', 'B787'],
          directFlightsOnly: true,
          avoidRedEyes: true,
          wifiRequired: true
        }
      };

      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.enhancedSearchFlights = jest.fn().mockResolvedValue({
        searchId: 'search-123',
        results: [],
        totalResults: 0,
        searchTime: 1500,
        sources: [],
        filterResult: {
          originalCount: 10,
          filteredCount: 3,
          appliedFilters: ['Aircraft types', 'Direct flights only', 'Avoid red-eye flights', 'WiFi required'],
          warnings: [],
          suggestions: []
        }
      });

      const response = await request(app)
        .post('/api/advanced-routing/enhanced-search')
        .send(requestWithFilters)
        .expect(201);

      expect(response.body).toHaveProperty('filterResult');
      expect(response.body.filterResult.appliedFilters).toHaveLength(4);
    });

    it('should handle search errors', async () => {
      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.enhancedSearchFlights = jest.fn().mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .post('/api/advanced-routing/enhanced-search')
        .send(validSearchRequest)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal server error during enhanced flight search');
      expect(response.body).toHaveProperty('message', 'Search failed');
    });
  });

  describe('GET /searches/:searchId/positioning', () => {
    it('should return positioning flight suggestions', async () => {
      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.getPositioningFlightSuggestions = jest.fn().mockResolvedValue([
        {
          originalSearch: {
            origin: 'JFK',
            destination: 'LAX'
          },
          positioningFlight: {
            id: 'pos-1',
            airline: 'AA',
            pricing: { totalPrice: 100 }
          },
          mainFlight: {
            id: 'main-1',
            airline: 'AA',
            pricing: { totalPrice: 400 }
          },
          totalCost: 500,
          savings: 75,
          feasible: true
        }
      ]);

      const response = await request(app)
        .get('/api/advanced-routing/searches/search-123/positioning')
        .expect(200);

      expect(response.body).toHaveProperty('searchId', 'search-123');
      expect(response.body).toHaveProperty('positioningOptions');
      expect(response.body.positioningOptions).toHaveLength(1);
      expect(response.body.positioningOptions[0]).toHaveProperty('savings', 75);
      expect(response.body.positioningOptions[0]).toHaveProperty('feasible', true);
    });

    it('should validate maxDetourMiles parameter', async () => {
      const response = await request(app)
        .get('/api/advanced-routing/searches/search-123/positioning?maxDetourMiles=2000')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Max detour miles must be between 50 and 1000');
    });

    it('should handle missing search ID', async () => {
      const response = await request(app)
        .get('/api/advanced-routing/searches//positioning')
        .expect(404); // Express will return 404 for missing route parameter
    });
  });

  describe('POST /searches/:searchId/optimize', () => {
    it('should optimize existing search', async () => {
      const optimizationOptions = {
        considerPositioning: true,
        maxPositioningDetour: 500,
        allowStopovers: false,
        prioritizeCost: true
      };

      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.optimizeExistingSearch = jest.fn().mockResolvedValue({
        routeType: 'positioning',
        totalCost: 500,
        savings: 75,
        optimizationScore: 85,
        recommendations: ['Positioning flight saves money']
      });

      const response = await request(app)
        .post('/api/advanced-routing/searches/search-123/optimize')
        .send(optimizationOptions)
        .expect(200);

      expect(response.body).toHaveProperty('searchId', 'search-123');
      expect(response.body).toHaveProperty('optimizedRoute');
      expect(response.body.optimizedRoute).toHaveProperty('routeType', 'positioning');
      expect(response.body.optimizedRoute).toHaveProperty('savings', 75);
      expect(response.body).toHaveProperty('message', 'Route optimization applied successfully');
    });

    it('should validate optimization options', async () => {
      const invalidOptions = {
        maxPositioningDetour: -100 // Invalid negative value
      };

      const response = await request(app)
        .post('/api/advanced-routing/searches/search-123/optimize')
        .send(invalidOptions)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('POST /searches/:searchId/advanced-filter', () => {
    it('should apply advanced filters to existing search', async () => {
      const filters = {
        aircraftTypes: ['A350'],
        directFlightsOnly: true,
        avoidRedEyes: true
      };

      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.applyAdvancedFiltersToSearch = jest.fn().mockResolvedValue({
        filteredFlights: [{
          id: '1',
          airline: 'AA',
          aircraft: 'A350'
        }],
        filterResult: {
          originalCount: 10,
          filteredCount: 1,
          appliedFilters: ['Aircraft types', 'Direct flights only', 'Avoid red-eye flights'],
          warnings: [],
          suggestions: []
        }
      });

      const response = await request(app)
        .post('/api/advanced-routing/searches/search-123/advanced-filter')
        .send(filters)
        .expect(200);

      expect(response.body).toHaveProperty('searchId', 'search-123');
      expect(response.body).toHaveProperty('filteredFlights');
      expect(response.body).toHaveProperty('filterResult');
      expect(response.body.filterResult.appliedFilters).toHaveLength(3);
      expect(response.body).toHaveProperty('message', 'Advanced filters applied successfully');
    });

    it('should validate filter options', async () => {
      const invalidFilters = {
        maxTotalTravelTime: -60 // Invalid negative value
      };

      const response = await request(app)
        .post('/api/advanced-routing/searches/search-123/advanced-filter')
        .send(invalidFilters)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('POST /multi-city-search', () => {
    it('should perform multi-city search', async () => {
      const multiCityRequest = {
        cities: ['JFK', 'LAX', 'SFO', 'JFK'],
        departureDate: '2024-06-01T10:00:00Z',
        returnDate: '2024-06-08T10:00:00Z',
        passengers: {
          adults: 1,
          children: 0,
          infants: 0
        },
        cabinClass: 'economy',
        flexible: false
      };

      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.enhancedSearchFlights = jest.fn().mockResolvedValue({
        searchId: 'search-123',
        multiCityRoute: {
          routeType: 'multi-city',
          optimizedFlights: [
            { id: '1', route: [{ origin: 'JFK', destination: 'LAX' }] },
            { id: '2', route: [{ origin: 'LAX', destination: 'SFO' }] },
            { id: '3', route: [{ origin: 'SFO', destination: 'JFK' }] }
          ],
          totalCost: 1200,
          totalTime: 800,
          savings: 100
        }
      });

      const response = await request(app)
        .post('/api/advanced-routing/multi-city-search')
        .send(multiCityRequest)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Multi-city flight search completed successfully');
      expect(response.body).toHaveProperty('searchId', 'search-123');
      expect(response.body).toHaveProperty('multiCityRoute');
      expect(response.body).toHaveProperty('cities', multiCityRequest.cities);
      expect(response.body).toHaveProperty('totalSegments', 3);
      expect(response.body).toHaveProperty('totalCost', 1200);
    });

    it('should validate multi-city criteria', async () => {
      const invalidRequest = {
        cities: ['JFK', 'LAX'], // Too few cities
        departureDate: '2024-06-01T10:00:00Z',
        passengers: {
          adults: 1,
          children: 0,
          infants: 0
        }
      };

      const response = await request(app)
        .post('/api/advanced-routing/multi-city-search')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('GET /searches/:searchId/analytics', () => {
    it('should return search analytics and insights', async () => {
      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.getSearchAnalytics = jest.fn().mockReturnValue({
        searchId: 'search-123',
        originalCriteria: {
          origin: 'JFK',
          destination: 'LAX'
        },
        totalFlightsFound: 10,
        filtersApplied: ['Aircraft types'],
        optimizationUsed: true,
        routeType: 'positioning',
        searchDuration: 1500,
        userSavings: 150,
        timestamp: new Date()
      });

      mockEnhancedOrchestrator.prototype.generateSearchInsights = jest.fn().mockResolvedValue({
        insights: ['Price range: $400 - $800 (avg: $600)', 'Route optimization applied: positioning routing'],
        recommendations: ['Consider nearby airports for potentially better deals'],
        potentialSavings: 150,
        alternativeRoutes: 2
      });

      const response = await request(app)
        .get('/api/advanced-routing/searches/search-123/analytics')
        .expect(200);

      expect(response.body).toHaveProperty('searchId', 'search-123');
      expect(response.body).toHaveProperty('analytics');
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('potentialSavings', 150);
      expect(response.body).toHaveProperty('alternativeRoutes', 2);
    });

    it('should handle missing analytics', async () => {
      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.getSearchAnalytics = jest.fn().mockReturnValue(null);

      const response = await request(app)
        .get('/api/advanced-routing/searches/search-123/analytics')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Search analytics not found');
    });
  });

  describe('GET /analytics/all', () => {
    it('should return all search analytics for authenticated users', async () => {
      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.getAllSearchAnalytics = jest.fn().mockReturnValue([
        {
          searchId: 'search-1',
          routeType: 'direct',
          optimizationUsed: false,
          userSavings: 0,
          searchDuration: 1000,
          timestamp: new Date()
        },
        {
          searchId: 'search-2',
          routeType: 'positioning',
          optimizationUsed: true,
          userSavings: 150,
          searchDuration: 1500,
          timestamp: new Date()
        }
      ]);

      const response = await request(app)
        .get('/api/advanced-routing/analytics/all')
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('totalSearches', 2);
      expect(response.body.summary).toHaveProperty('optimizedSearches', 1);
      expect(response.body.summary).toHaveProperty('optimizationRate', 50);
      expect(response.body.summary).toHaveProperty('totalSavings', 150);
      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics).toHaveLength(2);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.enhancedHealthCheck = jest.fn().mockResolvedValue({
        status: 'healthy',
        baseOrchestrator: { status: 'healthy' },
        routeOptimizer: true,
        advancedFilters: true,
        activeAnalytics: 5
      });

      const response = await request(app)
        .get('/api/advanced-routing/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('baseOrchestrator', 'healthy');
      expect(response.body.services).toHaveProperty('routeOptimizer', 'healthy');
      expect(response.body.services).toHaveProperty('advancedFilters', 'healthy');
      expect(response.body).toHaveProperty('activeAnalytics', 5);
    });

    it('should return degraded status when some services are unhealthy', async () => {
      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.enhancedHealthCheck = jest.fn().mockResolvedValue({
        status: 'degraded',
        baseOrchestrator: { status: 'degraded' },
        routeOptimizer: true,
        advancedFilters: true,
        activeAnalytics: 2
      });

      const response = await request(app)
        .get('/api/advanced-routing/health')
        .expect(206);

      expect(response.body).toHaveProperty('status', 'degraded');
    });

    it('should handle health check errors', async () => {
      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.enhancedHealthCheck = jest.fn().mockRejectedValue(new Error('Health check failed'));

      const response = await request(app)
        .get('/api/advanced-routing/health')
        .expect(500);

      expect(response.body).toHaveProperty('status', 'unhealthy');
      expect(response.body).toHaveProperty('error', 'Health check failed');
    });
  });

  describe('GET /searches/:searchId/filter-options', () => {
    it('should return available filter options', async () => {
      mockFlightSearchModel.getSearch.mockResolvedValue({
        id: 'search-123',
        searchCriteria: {
          origin: 'JFK',
          destination: 'LAX',
          departureDate: new Date(),
          passengers: { adults: 1, children: 0, infants: 0 },
          cabinClass: 'economy',
          flexible: false
        },
        results: [{
          id: '1',
          airline: 'AA',
          flightNumber: 'AA100',
          route: [{
            airline: 'AA',
            flightNumber: 'AA100',
            origin: 'JFK',
            destination: 'LAX',
            departureTime: new Date(),
            arrivalTime: new Date(),
            duration: 360,
            aircraft: 'A350'
          }],
          pricing: {
            cashPrice: 500,
            currency: 'USD',
            pointsOptions: [],
            taxes: 50,
            fees: 25,
            totalPrice: 575
          },
          availability: {
            availableSeats: 10,
            bookingClass: 'Y',
            fareBasis: 'Y'
          },
          duration: 360,
          layovers: 0
        }],
        status: 'completed',
        createdAt: new Date(),
        expiresAt: new Date()
      });

      // Mock the enhanced orchestrator's searchService
      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.searchService = {
        getFlightSearch: mockFlightSearchModel.getSearch
      };

      const response = await request(app)
        .get('/api/advanced-routing/searches/search-123/filter-options')
        .expect(200);

      expect(response.body).toHaveProperty('searchId', 'search-123');
      expect(response.body).toHaveProperty('availableOptions');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('totalResults');
    });

    it('should handle search not found', async () => {
      mockFlightSearchModel.getSearch.mockResolvedValue(null);

      const mockEnhancedOrchestrator = require('../services/EnhancedSearchOrchestrator').EnhancedSearchOrchestrator;
      mockEnhancedOrchestrator.prototype.searchService = {
        getFlightSearch: mockFlightSearchModel.getSearch
      };

      const response = await request(app)
        .get('/api/advanced-routing/searches/search-123/filter-options')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Search not found or has no results');
    });
  });
});