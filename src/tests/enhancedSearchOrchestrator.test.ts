import { 
  EnhancedSearchOrchestrator, 
  EnhancedSearchOptions,
  EnhancedSearchResult 
} from '../services/EnhancedSearchOrchestrator';
import { RouteOptimizationOptions } from '../services/RouteOptimizationService';
import { PowerUserFilters } from '../services/AdvancedSearchFilters';
import { CreateFlightSearchData, FlightResult } from '../models/FlightSearch';
import { AirlineAdapterFactory } from '../factories/AirlineAdapterFactory';
import { Pool } from 'pg';
import { RedisClientType } from 'redis';

// Mock dependencies
jest.mock('../services/FlightSearchOrchestrator');
jest.mock('../services/RouteOptimizationService');
jest.mock('../services/AdvancedSearchFilters');
jest.mock('../factories/AirlineAdapterFactory');

describe('EnhancedSearchOrchestrator', () => {
  let enhancedOrchestrator: EnhancedSearchOrchestrator;
  let mockDatabase: jest.Mocked<Pool>;
  let mockRedisClient: jest.Mocked<RedisClientType>;
  let mockAdapterFactory: jest.Mocked<AirlineAdapterFactory>;
  let mockSearchData: CreateFlightSearchData;
  let mockFlightResults: FlightResult[];

  beforeEach(() => {
    // Setup mocks
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

    mockAdapterFactory = {
      getAdapter: jest.fn(),
      getAllAdapterHealth: jest.fn(),
      cleanup: jest.fn()
    } as any;

    enhancedOrchestrator = new EnhancedSearchOrchestrator(
      mockDatabase,
      mockRedisClient,
      mockAdapterFactory
    );

    mockSearchData = {
      userId: 'user-123',
      searchCriteria: {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: new Date('2024-06-01T10:00:00Z'),
        passengers: { adults: 1, children: 0, infants: 0 },
        cabinClass: 'economy',
        flexible: false
      }
    };

    mockFlightResults = [
      {
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
      }
    ];
  });

  describe('enhancedSearchFlights', () => {
    it('should perform basic search without additional options', async () => {
      // Mock the parent class method
      const mockBasicResult = {
        searchId: 'search-123',
        results: mockFlightResults,
        totalResults: 1,
        searchTime: 1000,
        sources: ['AA'],
        cached: false
      };

      jest.spyOn(enhancedOrchestrator, 'searchFlights').mockResolvedValue(mockBasicResult);

      const result = await enhancedOrchestrator.enhancedSearchFlights(mockSearchData);

      expect(result).toBeDefined();
      expect(result.searchId).toBe('search-123');
      expect(result.results).toEqual(mockFlightResults);
      expect(result.totalResults).toBe(1);
    });

    it('should apply route optimization when enabled', async () => {
      const mockBasicResult = {
        searchId: 'search-123',
        results: mockFlightResults,
        totalResults: 1,
        searchTime: 1000,
        sources: ['AA'],
        cached: false
      };

      const mockOptimizedRoute = {
        originalCriteria: mockSearchData.searchCriteria,
        optimizedFlights: mockFlightResults,
        routeType: 'direct' as const,
        totalCost: 575,
        totalTime: 360,
        savings: 0,
        optimizationScore: 75,
        recommendations: ['Direct flight - fastest option'],
        alternatives: []
      };

      jest.spyOn(enhancedOrchestrator, 'searchFlights').mockResolvedValue(mockBasicResult);
      jest.spyOn(enhancedOrchestrator['routeOptimizer'], 'optimizeRoute').mockResolvedValue(mockOptimizedRoute);

      const options: EnhancedSearchOptions = {
        routeOptimization: {
          considerPositioning: true,
          maxPositioningDetour: 500,
          allowStopovers: false,
          maxStopoverDuration: 24,
          considerOpenJaw: false,
          maxGroundTransportTime: 6,
          prioritizeTime: false,
          prioritizeCost: true,
          prioritizePoints: false
        }
      };

      const result = await enhancedOrchestrator.enhancedSearchFlights(mockSearchData, options);

      expect(result.optimizedRoute).toBeDefined();
      expect(result.optimizedRoute?.routeType).toBe('direct');
      expect(result.optimizedRoute?.optimizationScore).toBe(75);
    });

    it('should apply advanced filters when specified', async () => {
      const mockBasicResult = {
        searchId: 'search-123',
        results: mockFlightResults,
        totalResults: 1,
        searchTime: 1000,
        sources: ['AA'],
        cached: false
      };

      const mockFilterResult = {
        filteredFlights: mockFlightResults,
        filterResult: {
          originalCount: 1,
          filteredCount: 1,
          removedByFilter: {},
          appliedFilters: ['Aircraft types'],
          warnings: [],
          suggestions: []
        }
      };

      jest.spyOn(enhancedOrchestrator, 'searchFlights').mockResolvedValue(mockBasicResult);
      jest.spyOn(enhancedOrchestrator['advancedFilters'], 'applyAdvancedFilters').mockResolvedValue(mockFilterResult);

      const options: EnhancedSearchOptions = {
        powerUserFilters: {
          aircraftTypes: ['A350']
        }
      };

      const result = await enhancedOrchestrator.enhancedSearchFlights(mockSearchData, options);

      expect(result.filterResult).toBeDefined();
      expect(result.filterResult?.appliedFilters).toContain('Aircraft types');
      expect(result.powerUserAnalysis).toBeDefined();
    });

    it('should handle multi-city searches', async () => {
      const mockBasicResult = {
        searchId: 'search-123',
        results: mockFlightResults,
        totalResults: 1,
        searchTime: 1000,
        sources: ['AA'],
        cached: false
      };

      const mockMultiCityRoute = {
        originalCriteria: mockSearchData.searchCriteria,
        optimizedFlights: mockFlightResults,
        routeType: 'multi-city' as const,
        totalCost: 1200,
        totalTime: 800,
        savings: 100,
        optimizationScore: 80,
        recommendations: ['Multi-city optimization applied'],
        alternatives: []
      };

      jest.spyOn(enhancedOrchestrator, 'searchFlights').mockResolvedValue(mockBasicResult);
      jest.spyOn(enhancedOrchestrator['routeOptimizer'], 'optimizeMultiCityRoute').mockResolvedValue(mockMultiCityRoute);

      const options: EnhancedSearchOptions = {
        multiCity: {
          cities: ['JFK', 'LAX', 'SFO', 'JFK'],
          departureDate: new Date('2024-06-01T10:00:00Z'),
          passengers: { adults: 1, children: 0, infants: 0 },
          cabinClass: 'economy',
          flexible: false
        }
      };

      const result = await enhancedOrchestrator.enhancedSearchFlights(mockSearchData, options);

      expect(result.multiCityRoute).toBeDefined();
      expect(result.multiCityRoute?.routeType).toBe('multi-city');
      expect(result.multiCityRoute?.totalCost).toBe(1200);
    });

    it('should cache enhanced results', async () => {
      const mockBasicResult = {
        searchId: 'search-123',
        results: mockFlightResults,
        totalResults: 1,
        searchTime: 1000,
        sources: ['AA'],
        cached: false
      };

      jest.spyOn(enhancedOrchestrator, 'searchFlights').mockResolvedValue(mockBasicResult);
      mockRedisClient.setEx.mockResolvedValue('OK');

      await enhancedOrchestrator.enhancedSearchFlights(mockSearchData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'enhanced_search:search-123',
        1800,
        expect.any(String)
      );
    });

    it('should handle search errors gracefully', async () => {
      jest.spyOn(enhancedOrchestrator, 'searchFlights').mockRejectedValue(new Error('Search failed'));

      await expect(
        enhancedOrchestrator.enhancedSearchFlights(mockSearchData)
      ).rejects.toThrow('Search failed');
    });
  });

  describe('getPositioningFlightSuggestions', () => {
    it('should return positioning flight suggestions', async () => {
      const mockSearch = {
        id: 'search-123',
        searchCriteria: mockSearchData.searchCriteria,
        results: mockFlightResults,
        status: 'completed' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      const mockSuggestions = [{
        originalSearch: mockSearchData.searchCriteria,
        positioningFlight: mockFlightResults[0],
        mainFlight: mockFlightResults[0],
        totalCost: 500,
        totalTime: 400,
        savings: 75,
        feasible: true
      }];

      jest.spyOn(enhancedOrchestrator['searchService'], 'getFlightSearch').mockResolvedValue(mockSearch);
      jest.spyOn(enhancedOrchestrator['routeOptimizer'], 'findPositioningFlights').mockResolvedValue(mockSuggestions);

      const result = await enhancedOrchestrator.getPositioningFlightSuggestions('search-123', 500);

      expect(result).toEqual(mockSuggestions);
      expect(result[0].feasible).toBe(true);
      expect(result[0].savings).toBe(75);
    });

    it('should throw error for non-existent search', async () => {
      jest.spyOn(enhancedOrchestrator['searchService'], 'getFlightSearch').mockResolvedValue(null);

      await expect(
        enhancedOrchestrator.getPositioningFlightSuggestions('non-existent', 500)
      ).rejects.toThrow('Search not found or has no results');
    });

    it('should throw error for search without results', async () => {
      const mockSearch = {
        id: 'search-123',
        searchCriteria: mockSearchData.searchCriteria,
        results: [],
        status: 'completed' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      jest.spyOn(enhancedOrchestrator['searchService'], 'getFlightSearch').mockResolvedValue(mockSearch);

      await expect(
        enhancedOrchestrator.getPositioningFlightSuggestions('search-123', 500)
      ).rejects.toThrow('Search not found or has no results');
    });
  });

  describe('optimizeExistingSearch', () => {
    it('should optimize existing search results', async () => {
      const mockSearch = {
        id: 'search-123',
        searchCriteria: mockSearchData.searchCriteria,
        results: mockFlightResults,
        status: 'completed' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      const mockOptimizedRoute = {
        originalCriteria: mockSearchData.searchCriteria,
        optimizedFlights: mockFlightResults,
        routeType: 'positioning' as const,
        totalCost: 500,
        totalTime: 400,
        savings: 75,
        optimizationScore: 85,
        recommendations: ['Positioning flight saves money'],
        alternatives: []
      };

      const optimizationOptions: RouteOptimizationOptions = {
        considerPositioning: true,
        maxPositioningDetour: 500,
        allowStopovers: false,
        maxStopoverDuration: 24,
        considerOpenJaw: false,
        maxGroundTransportTime: 6,
        prioritizeTime: false,
        prioritizeCost: true,
        prioritizePoints: false
      };

      jest.spyOn(enhancedOrchestrator['searchService'], 'getFlightSearch').mockResolvedValue(mockSearch);
      jest.spyOn(enhancedOrchestrator['routeOptimizer'], 'optimizeRoute').mockResolvedValue(mockOptimizedRoute);

      const result = await enhancedOrchestrator.optimizeExistingSearch('search-123', optimizationOptions);

      expect(result).toEqual(mockOptimizedRoute);
      expect(result.routeType).toBe('positioning');
      expect(result.savings).toBe(75);
    });
  });

  describe('applyAdvancedFiltersToSearch', () => {
    it('should apply advanced filters to existing search', async () => {
      const mockSearch = {
        id: 'search-123',
        searchCriteria: mockSearchData.searchCriteria,
        results: mockFlightResults,
        status: 'completed' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      const mockFilterResult = {
        filteredFlights: mockFlightResults,
        filterResult: {
          originalCount: 1,
          filteredCount: 1,
          removedByFilter: {},
          appliedFilters: ['Direct flights only'],
          warnings: [],
          suggestions: []
        }
      };

      const filters: PowerUserFilters = {
        directFlightsOnly: true
      };

      jest.spyOn(enhancedOrchestrator['searchService'], 'getFlightSearch').mockResolvedValue(mockSearch);
      jest.spyOn(enhancedOrchestrator['advancedFilters'], 'applyAdvancedFilters').mockResolvedValue(mockFilterResult);

      const result = await enhancedOrchestrator.applyAdvancedFiltersToSearch('search-123', filters);

      expect(result).toEqual(mockFilterResult);
      expect(result.filterResult.appliedFilters).toContain('Direct flights only');
    });
  });

  describe('getSearchAnalytics', () => {
    it('should return search analytics for existing search', () => {
      const mockAnalytics = {
        searchId: 'search-123',
        originalCriteria: mockSearchData.searchCriteria,
        totalFlightsFound: 10,
        filtersApplied: ['Aircraft types'],
        optimizationUsed: true,
        routeType: 'direct',
        searchDuration: 1500,
        userSavings: 100,
        timestamp: new Date()
      };

      enhancedOrchestrator['searchAnalytics'].set('search-123', mockAnalytics);

      const result = enhancedOrchestrator.getSearchAnalytics('search-123');

      expect(result).toEqual(mockAnalytics);
    });

    it('should return null for non-existent search', () => {
      const result = enhancedOrchestrator.getSearchAnalytics('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('generateSearchInsights', () => {
    it('should generate insights and recommendations', async () => {
      const mockAnalytics = {
        searchId: 'search-123',
        originalCriteria: mockSearchData.searchCriteria,
        totalFlightsFound: 10,
        filtersApplied: ['Aircraft types'],
        optimizationUsed: true,
        routeType: 'positioning',
        searchDuration: 1500,
        userSavings: 150,
        timestamp: new Date()
      };

      const mockSearch = {
        id: 'search-123',
        searchCriteria: mockSearchData.searchCriteria,
        results: mockFlightResults,
        status: 'completed' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      enhancedOrchestrator['searchAnalytics'].set('search-123', mockAnalytics);
      jest.spyOn(enhancedOrchestrator['searchService'], 'getFlightSearch').mockResolvedValue(mockSearch);

      const result = await enhancedOrchestrator.generateSearchInsights('search-123');

      expect(result).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.potentialSavings).toBeDefined();
      expect(result.alternativeRoutes).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should throw error for missing analytics', async () => {
      await expect(
        enhancedOrchestrator.generateSearchInsights('non-existent')
      ).rejects.toThrow('Search analytics not found');
    });
  });

  describe('getCachedEnhancedResults', () => {
    it('should return cached results when available', async () => {
      const mockCachedData = {
        searchId: 'search-123',
        result: {
          searchId: 'search-123',
          results: mockFlightResults,
          totalResults: 1,
          searchTime: 1000,
          sources: ['AA'],
          cached: true
        },
        timestamp: new Date()
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockCachedData));

      const result = await enhancedOrchestrator.getCachedEnhancedResults('search-123');

      expect(result).toEqual(mockCachedData.result);
      expect(mockRedisClient.get).toHaveBeenCalledWith('enhanced_search:search-123');
    });

    it('should return null when no cached results exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await enhancedOrchestrator.getCachedEnhancedResults('search-123');

      expect(result).toBeNull();
    });

    it('should handle cache errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Cache error'));

      const result = await enhancedOrchestrator.getCachedEnhancedResults('search-123');

      expect(result).toBeNull();
    });
  });

  describe('enhancedHealthCheck', () => {
    it('should return health status', async () => {
      const mockBaseHealth = {
        status: 'healthy' as const,
        activeSearches: 2,
        adapterHealth: {},
        cacheHealth: true
      };

      jest.spyOn(enhancedOrchestrator, 'healthCheck').mockResolvedValue(mockBaseHealth);

      const result = await enhancedOrchestrator.enhancedHealthCheck();

      expect(result).toBeDefined();
      expect(result.status).toBe('healthy');
      expect(result.baseOrchestrator).toEqual(mockBaseHealth);
      expect(result.routeOptimizer).toBe(true);
      expect(result.advancedFilters).toBe(true);
      expect(result.activeAnalytics).toBe(0);
    });
  });

  describe('enhancedCleanup', () => {
    it('should cleanup resources', async () => {
      const mockAnalytics = {
        searchId: 'search-123',
        originalCriteria: mockSearchData.searchCriteria,
        totalFlightsFound: 10,
        filtersApplied: [],
        optimizationUsed: false,
        routeType: 'direct',
        searchDuration: 1000,
        userSavings: 0,
        timestamp: new Date()
      };

      enhancedOrchestrator['searchAnalytics'].set('search-123', mockAnalytics);
      jest.spyOn(enhancedOrchestrator, 'cleanup').mockResolvedValue();

      await enhancedOrchestrator.enhancedCleanup();

      expect(enhancedOrchestrator['searchAnalytics'].size).toBe(0);
      expect(enhancedOrchestrator.cleanup).toHaveBeenCalled();
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle null search criteria gracefully', async () => {
      const invalidSearchData = {
        userId: 'user-123',
        searchCriteria: null as any
      };

      await expect(
        enhancedOrchestrator.enhancedSearchFlights(invalidSearchData)
      ).rejects.toThrow();
    });

    it('should handle empty flight results', async () => {
      const mockBasicResult = {
        searchId: 'search-123',
        results: [],
        totalResults: 0,
        searchTime: 1000,
        sources: [],
        cached: false
      };

      jest.spyOn(enhancedOrchestrator, 'searchFlights').mockResolvedValue(mockBasicResult);

      const result = await enhancedOrchestrator.enhancedSearchFlights(mockSearchData);

      expect(result.results).toEqual([]);
      expect(result.totalResults).toBe(0);
    });

    it('should handle optimization failures gracefully', async () => {
      const mockBasicResult = {
        searchId: 'search-123',
        results: mockFlightResults,
        totalResults: 1,
        searchTime: 1000,
        sources: ['AA'],
        cached: false
      };

      jest.spyOn(enhancedOrchestrator, 'searchFlights').mockResolvedValue(mockBasicResult);
      jest.spyOn(enhancedOrchestrator['routeOptimizer'], 'optimizeRoute').mockRejectedValue(new Error('Optimization failed'));

      const options: EnhancedSearchOptions = {
        routeOptimization: {
          considerPositioning: true,
          maxPositioningDetour: 500,
          allowStopovers: false,
          maxStopoverDuration: 24,
          considerOpenJaw: false,
          maxGroundTransportTime: 6,
          prioritizeTime: false,
          prioritizeCost: true,
          prioritizePoints: false
        }
      };

      await expect(
        enhancedOrchestrator.enhancedSearchFlights(mockSearchData, options)
      ).rejects.toThrow('Optimization failed');
    });

    it('should handle filter failures gracefully', async () => {
      const mockBasicResult = {
        searchId: 'search-123',
        results: mockFlightResults,
        totalResults: 1,
        searchTime: 1000,
        sources: ['AA'],
        cached: false
      };

      jest.spyOn(enhancedOrchestrator, 'searchFlights').mockResolvedValue(mockBasicResult);
      jest.spyOn(enhancedOrchestrator['advancedFilters'], 'applyAdvancedFilters').mockRejectedValue(new Error('Filter failed'));

      const options: EnhancedSearchOptions = {
        powerUserFilters: {
          aircraftTypes: ['A350']
        }
      };

      await expect(
        enhancedOrchestrator.enhancedSearchFlights(mockSearchData, options)
      ).rejects.toThrow('Filter failed');
    });
  });
});