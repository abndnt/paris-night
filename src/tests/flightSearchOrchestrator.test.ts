import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { Server as SocketIOServer } from 'socket.io';
import { FlightSearchOrchestrator, SearchOrchestrationOptions } from '../services/FlightSearchOrchestrator';
import { AirlineAdapterFactory } from '../factories/AirlineAdapterFactory';
import { SearchService } from '../services/SearchService';
import { CreateFlightSearchData, SearchCriteria } from '../models/FlightSearch';

// Mock dependencies
jest.mock('../services/SearchService');
jest.mock('../factories/AirlineAdapterFactory');
jest.mock('../utils/logger');

describe('FlightSearchOrchestrator', () => {
  let orchestrator: FlightSearchOrchestrator;
  let mockDatabase: jest.Mocked<Pool>;
  let mockRedisClient: jest.Mocked<RedisClientType>;
  let mockAdapterFactory: jest.Mocked<AirlineAdapterFactory>;
  let mockSocketIO: jest.Mocked<SocketIOServer>;
  let mockSearchService: jest.Mocked<SearchService>;

  const mockSearchCriteria: SearchCriteria = {
    origin: 'LAX',
    destination: 'JFK',
    departureDate: new Date('2024-12-01'),
    passengers: { adults: 1, children: 0, infants: 0 },
    cabinClass: 'economy',
    flexible: false
  };

  const mockSearchData: CreateFlightSearchData = {
    userId: 'test-user-id',
    searchCriteria: mockSearchCriteria
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
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
      ping: jest.fn(),
      quit: jest.fn()
    } as any;

    mockSocketIO = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      on: jest.fn(),
      sockets: {
        adapter: {
          rooms: new Map()
        }
      }
    } as any;

    // Mock SearchService
    mockSearchService = {
      createFlightSearch: jest.fn(),
      updateFlightSearch: jest.fn(),
      getFlightSearch: jest.fn(),
      filterFlightResults: jest.fn(),
      sortFlightResults: jest.fn(),
      validateAndSuggestCorrections: jest.fn()
    } as any;

    (SearchService as jest.MockedClass<typeof SearchService>).mockImplementation(() => mockSearchService);

    // Mock AirlineAdapterFactory
    mockAdapterFactory = {
      getAdapter: jest.fn(),
      getAllAdapterHealth: jest.fn(),
      cleanup: jest.fn()
    } as any;

    (AirlineAdapterFactory as jest.MockedClass<typeof AirlineAdapterFactory>).mockImplementation(() => mockAdapterFactory);

    // Create orchestrator instance
    const options: SearchOrchestrationOptions = {
      maxConcurrentSearches: 5,
      searchTimeout: 10000,
      enableRealTimeUpdates: true,
      cacheResults: true,
      cacheTtl: 300
    };

    orchestrator = new FlightSearchOrchestrator(
      mockDatabase,
      mockRedisClient,
      mockAdapterFactory,
      mockSocketIO,
      options
    );
  });

  describe('searchFlights', () => {
    it('should successfully orchestrate flight search across multiple airlines', async () => {
      // Mock search service responses
      const mockSearch = {
        id: 'search-123',
        userId: 'test-user-id',
        searchCriteria: mockSearchCriteria,
        results: [],
        status: 'pending' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      mockSearchService.createFlightSearch.mockResolvedValue(mockSearch);
      mockSearchService.updateFlightSearch.mockResolvedValue({
        ...mockSearch,
        status: 'completed' as const,
        results: []
      });

      // Mock airline adapter responses
      const mockAdapter = {
        searchFlights: jest.fn().mockResolvedValue({
          requestId: 'req-123',
          flights: [
            {
              id: 'flight-1',
              airline: 'American Airlines',
              flightNumber: 'AA123',
              route: [],
              pricing: { totalPrice: 500, currency: 'USD', pointsOptions: [], taxes: 50, fees: 25, cashPrice: 425 },
              availability: { availableSeats: 10, bookingClass: 'Y', fareBasis: 'Y' },
              duration: 360,
              layovers: 0
            }
          ],
          totalResults: 1,
          searchTime: 1000,
          currency: 'USD',
          timestamp: new Date(),
          source: 'american-airlines'
        })
      };

      mockAdapterFactory.getAdapter.mockResolvedValue(mockAdapter as any);

      // Execute search
      const result = await orchestrator.searchFlights(
        mockSearchData,
        ['american-airlines', 'delta-airlines']
      );

      // Verify results
      expect(result).toBeDefined();
      expect(result.searchId).toBe('search-123');
      expect(result.results).toHaveLength(2); // One from each airline
      expect(result.sources).toContain('american-airlines');
      expect(result.sources).toContain('delta-airlines');
      expect(result.cached).toBe(false);

      // Verify service calls
      expect(mockSearchService.createFlightSearch).toHaveBeenCalledWith(mockSearchData);
      expect(mockSearchService.updateFlightSearch).toHaveBeenCalledWith(
        'search-123',
        expect.objectContaining({
          status: 'completed',
          results: expect.any(Array)
        })
      );

      // Verify adapter calls
      expect(mockAdapterFactory.getAdapter).toHaveBeenCalledTimes(2);
      expect(mockAdapter.searchFlights).toHaveBeenCalledTimes(2);

      // Verify WebSocket emissions
      expect(mockSocketIO.emit).toHaveBeenCalledWith(
        'search:progress',
        expect.objectContaining({
          searchId: 'search-123',
          status: expect.any(String),
          progress: expect.any(Number)
        })
      );
    });

    it('should handle airline adapter failures gracefully', async () => {
      // Mock search service responses
      const mockSearch = {
        id: 'search-456',
        userId: 'test-user-id',
        searchCriteria: mockSearchCriteria,
        results: [],
        status: 'pending' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      mockSearchService.createFlightSearch.mockResolvedValue(mockSearch);
      mockSearchService.updateFlightSearch.mockResolvedValue({
        ...mockSearch,
        status: 'completed' as const
      });

      // Mock one successful and one failing adapter
      const successfulAdapter = {
        searchFlights: jest.fn().mockResolvedValue({
          requestId: 'req-success',
          flights: [
            {
              id: 'flight-success',
              airline: 'Delta Airlines',
              flightNumber: 'DL456',
              route: [],
              pricing: { totalPrice: 600, currency: 'USD', pointsOptions: [], taxes: 60, fees: 30, cashPrice: 510 },
              availability: { availableSeats: 5, bookingClass: 'Y', fareBasis: 'Y' },
              duration: 400,
              layovers: 1
            }
          ],
          totalResults: 1,
          searchTime: 1200,
          currency: 'USD',
          timestamp: new Date(),
          source: 'delta-airlines'
        })
      };

      const failingAdapter = {
        searchFlights: jest.fn().mockRejectedValue(new Error('API timeout'))
      };

      mockAdapterFactory.getAdapter
        .mockResolvedValueOnce(successfulAdapter as any)
        .mockResolvedValueOnce(failingAdapter as any);

      // Execute search
      const result = await orchestrator.searchFlights(
        mockSearchData,
        ['delta-airlines', 'united-airlines']
      );

      // Verify results - should have results from successful adapter only
      expect(result).toBeDefined();
      expect(result.results).toHaveLength(1);
      expect(result.sources).toEqual(['delta-airlines']);
      expect(result.results[0]?.airline).toBe('Delta Airlines');

      // Verify both adapters were called
      expect(mockAdapterFactory.getAdapter).toHaveBeenCalledTimes(2);
      expect(successfulAdapter.searchFlights).toHaveBeenCalled();
      expect(failingAdapter.searchFlights).toHaveBeenCalled();
    });

    it('should respect maximum concurrent searches limit', async () => {
      // Create orchestrator with low limit
      const limitedOrchestrator = new FlightSearchOrchestrator(
        mockDatabase,
        mockRedisClient,
        mockAdapterFactory,
        mockSocketIO,
        { maxConcurrentSearches: 1 }
      );

      // Mock search service
      mockSearchService.createFlightSearch.mockResolvedValue({
        id: 'search-1',
        userId: 'test-user-id',
        searchCriteria: mockSearchCriteria,
        results: [],
        status: 'pending' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      });

      // Start first search (should succeed)
      const search1Promise = limitedOrchestrator.searchFlights(mockSearchData, ['american-airlines']);

      // Start second search immediately (should fail due to limit)
      await expect(
        limitedOrchestrator.searchFlights(mockSearchData, ['delta-airlines'])
      ).rejects.toThrow('Maximum concurrent searches exceeded');

      // Wait for first search to complete
      await search1Promise.catch(() => {}); // Ignore errors for this test
    });

    it('should handle search timeout', async () => {
      // Create orchestrator with very short timeout
      const timeoutOrchestrator = new FlightSearchOrchestrator(
        mockDatabase,
        mockRedisClient,
        mockAdapterFactory,
        mockSocketIO,
        { searchTimeout: 100 } // 100ms timeout
      );

      // Mock search service
      mockSearchService.createFlightSearch.mockResolvedValue({
        id: 'search-timeout',
        userId: 'test-user-id',
        searchCriteria: mockSearchCriteria,
        results: [],
        status: 'pending' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      });

      // Mock slow adapter
      const slowAdapter = {
        searchFlights: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay
        )
      };

      mockAdapterFactory.getAdapter.mockResolvedValue(slowAdapter as any);

      // Execute search and expect timeout
      await expect(
        timeoutOrchestrator.searchFlights(mockSearchData, ['slow-airline'])
      ).rejects.toThrow();

      // Verify search was marked as failed
      expect(mockSearchService.updateFlightSearch).toHaveBeenCalledWith(
        'search-timeout',
        expect.objectContaining({ status: 'error' })
      );
    });
  });

  describe('filterSearchResults', () => {
    it('should filter search results correctly', async () => {
      const mockSearch = {
        id: 'search-filter',
        userId: 'test-user-id',
        searchCriteria: mockSearchCriteria,
        results: [
          {
            id: 'flight-1',
            airline: 'American Airlines',
            flightNumber: 'AA123',
            route: [],
            pricing: { totalPrice: 500, currency: 'USD', pointsOptions: [], taxes: 50, fees: 25, cashPrice: 425 },
            availability: { availableSeats: 10, bookingClass: 'Y', fareBasis: 'Y' },
            duration: 360,
            layovers: 0
          },
          {
            id: 'flight-2',
            airline: 'Delta Airlines',
            flightNumber: 'DL456',
            route: [],
            pricing: { totalPrice: 800, currency: 'USD', pointsOptions: [], taxes: 80, fees: 40, cashPrice: 680 },
            availability: { availableSeats: 5, bookingClass: 'Y', fareBasis: 'Y' },
            duration: 480,
            layovers: 1
          }
        ],
        status: 'completed' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      mockSearchService.getFlightSearch.mockResolvedValue(mockSearch);
      mockSearchService.filterFlightResults.mockReturnValue([mockSearch.results[0]!]); // Return only first flight

      const filters = { maxPrice: 600 };
      const result = await orchestrator.filterSearchResults('search-filter', filters);

      expect(result).toBeDefined();
      expect(result.searchId).toBe('search-filter');
      expect(result.results).toHaveLength(1);
      expect(result.filters).toEqual(filters);
      expect(result.cached).toBe(true);

      // Verify service calls
      expect(mockSearchService.getFlightSearch).toHaveBeenCalledWith('search-filter');
      expect(mockSearchService.filterFlightResults).toHaveBeenCalledWith(mockSearch.results, filters);

      // Verify WebSocket emission
      expect(mockSocketIO.emit).toHaveBeenCalledWith(
        'search:filtered',
        expect.objectContaining({
          searchId: 'search-filter',
          filters,
          originalCount: 2,
          filteredCount: 1
        })
      );
    });

    it('should throw error for non-existent search', async () => {
      mockSearchService.getFlightSearch.mockResolvedValue(null);

      await expect(
        orchestrator.filterSearchResults('non-existent', { maxPrice: 500 })
      ).rejects.toThrow('Search not found');
    });

    it('should throw error for search with no results', async () => {
      const mockSearch = {
        id: 'search-no-results',
        userId: 'test-user-id',
        searchCriteria: mockSearchCriteria,
        results: [],
        status: 'completed' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      mockSearchService.getFlightSearch.mockResolvedValue(mockSearch);

      await expect(
        orchestrator.filterSearchResults('search-no-results', { maxPrice: 500 })
      ).rejects.toThrow('No results available to filter');
    });
  });

  describe('sortSearchResults', () => {
    it('should sort search results correctly', async () => {
      const mockSearch = {
        id: 'search-sort',
        userId: 'test-user-id',
        searchCriteria: mockSearchCriteria,
        results: [
          {
            id: 'flight-1',
            airline: 'American Airlines',
            flightNumber: 'AA123',
            route: [],
            pricing: { totalPrice: 800, currency: 'USD', pointsOptions: [], taxes: 80, fees: 40, cashPrice: 680 },
            availability: { availableSeats: 10, bookingClass: 'Y', fareBasis: 'Y' },
            duration: 360,
            layovers: 0
          },
          {
            id: 'flight-2',
            airline: 'Delta Airlines',
            flightNumber: 'DL456',
            route: [],
            pricing: { totalPrice: 500, currency: 'USD', pointsOptions: [], taxes: 50, fees: 25, cashPrice: 425 },
            availability: { availableSeats: 5, bookingClass: 'Y', fareBasis: 'Y' },
            duration: 480,
            layovers: 1
          }
        ],
        status: 'completed' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      const sortedResults = [mockSearch.results[1]!, mockSearch.results[0]!]; // Sorted by price ascending

      mockSearchService.getFlightSearch.mockResolvedValue(mockSearch);
      mockSearchService.sortFlightResults.mockReturnValue(sortedResults);

      const result = await orchestrator.sortSearchResults('search-sort', 'price', 'asc');

      expect(result).toBeDefined();
      expect(result.searchId).toBe('search-sort');
      expect(result.results).toEqual(sortedResults);
      expect(result.sortBy).toBe('price');
      expect(result.sortOrder).toBe('asc');
      expect(result.cached).toBe(true);

      // Verify service calls
      expect(mockSearchService.getFlightSearch).toHaveBeenCalledWith('search-sort');
      expect(mockSearchService.sortFlightResults).toHaveBeenCalledWith(mockSearch.results, 'price', 'asc');

      // Verify WebSocket emission
      expect(mockSocketIO.emit).toHaveBeenCalledWith(
        'search:sorted',
        expect.objectContaining({
          searchId: 'search-sort',
          sortBy: 'price',
          sortOrder: 'asc',
          results: sortedResults
        })
      );
    });
  });

  describe('getSearchProgress', () => {
    it('should return search progress for active searches', () => {
      // This would require access to private activeSearches map
      // For now, test that it returns null for non-existent searches
      const progress = orchestrator.getSearchProgress('non-existent');
      expect(progress).toBeNull();
    });
  });

  describe('cancelSearch', () => {
    it('should cancel active search', async () => {
      // Mock an active search by calling searchFlights but not awaiting
      const mockSearch = {
        id: 'search-cancel',
        userId: 'test-user-id',
        searchCriteria: mockSearchCriteria,
        results: [],
        status: 'pending' as const,
        createdAt: new Date(),
        expiresAt: new Date()
      };

      mockSearchService.createFlightSearch.mockResolvedValue(mockSearch);
      mockSearchService.updateFlightSearch.mockResolvedValue({
        ...mockSearch,
        status: 'error' as const
      });

      // Start search but don't await
      const searchPromise = orchestrator.searchFlights(mockSearchData, ['american-airlines']);

      // Cancel the search
      const cancelled = await orchestrator.cancelSearch('search-cancel');

      expect(cancelled).toBe(true);
      expect(mockSearchService.updateFlightSearch).toHaveBeenCalledWith(
        'search-cancel',
        expect.objectContaining({ status: 'error' })
      );

      // Clean up
      await searchPromise.catch(() => {}); // Ignore errors
    });

    it('should return false for non-existent search', async () => {
      const cancelled = await orchestrator.cancelSearch('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      mockAdapterFactory.getAllAdapterHealth.mockResolvedValue({
        'american-airlines': { status: 'healthy', lastCheck: new Date() },
        'delta-airlines': { status: 'healthy', lastCheck: new Date() }
      });

      mockRedisClient.ping.mockResolvedValue('PONG');

      const health = await orchestrator.healthCheck();

      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.activeSearches).toBe(0);
      expect(health.cacheHealth).toBe(true);
      expect(health.adapterHealth).toBeDefined();
    });

    it('should return degraded status when some adapters are unhealthy', async () => {
      mockAdapterFactory.getAllAdapterHealth.mockResolvedValue({
        'american-airlines': { status: 'healthy', lastCheck: new Date() },
        'delta-airlines': { status: 'unhealthy', lastCheck: new Date() }
      });

      mockRedisClient.ping.mockResolvedValue('PONG');

      const health = await orchestrator.healthCheck();

      expect(health.status).toBe('degraded');
    });

    it('should return unhealthy status when all adapters are unhealthy', async () => {
      mockAdapterFactory.getAllAdapterHealth.mockResolvedValue({
        'american-airlines': { status: 'unhealthy', lastCheck: new Date() },
        'delta-airlines': { status: 'unhealthy', lastCheck: new Date() }
      });

      mockRedisClient.ping.mockResolvedValue('PONG');

      const health = await orchestrator.healthCheck();

      expect(health.status).toBe('unhealthy');
    });
  });
});