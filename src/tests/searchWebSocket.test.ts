import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { SearchWebSocketService } from '../services/SearchWebSocketService';
import { FlightSearchOrchestrator } from '../services/FlightSearchOrchestrator';

// Mock dependencies
jest.mock('../services/FlightSearchOrchestrator');
jest.mock('../utils/logger');

describe('SearchWebSocketService Integration Tests', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let searchWebSocketService: SearchWebSocketService;
  let mockOrchestrator: jest.Mocked<FlightSearchOrchestrator>;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();
    
    // Create Socket.IO server
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Start server
    httpServer.listen(() => {
      serverPort = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll((done) => {
    httpServer.close(done);
  });

  beforeEach((done) => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock orchestrator
    mockOrchestrator = {
      getSearchProgress: jest.fn(),
      cancelSearch: jest.fn(),
      getActiveSearches: jest.fn(),
      searchFlights: jest.fn(),
      filterSearchResults: jest.fn(),
      sortSearchResults: jest.fn(),
      healthCheck: jest.fn(),
      cleanup: jest.fn()
    } as any;

    // Create SearchWebSocketService
    searchWebSocketService = new SearchWebSocketService(io, mockOrchestrator);

    // Create client socket
    clientSocket = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket']
    });

    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach((done) => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    
    // Wait a bit for cleanup
    setTimeout(done, 100);
  });

  describe('Connection Handling', () => {
    it('should handle client connections', (done) => {
      expect(clientSocket.connected).toBe(true);
      expect(searchWebSocketService.getConnectedClientsCount()).toBeGreaterThan(0);
      done();
    });

    it('should handle client disconnections', (done) => {
      const initialCount = searchWebSocketService.getConnectedClientsCount();
      
      clientSocket.disconnect();
      
      setTimeout(() => {
        expect(searchWebSocketService.getConnectedClientsCount()).toBeLessThan(initialCount);
        done();
      }, 100);
    });
  });

  describe('Search Room Management', () => {
    it('should allow clients to join search rooms', (done) => {
      const searchId = 'test-search-123';
      
      clientSocket.emit('search:join', { searchId });
      
      setTimeout(() => {
        const participants = searchWebSocketService.getSearchRoomParticipants(searchId);
        expect(participants).toBe(1);
        done();
      }, 50);
    });

    it('should allow clients to leave search rooms', (done) => {
      const searchId = 'test-search-456';
      
      // Join first
      clientSocket.emit('search:join', { searchId });
      
      setTimeout(() => {
        // Then leave
        clientSocket.emit('search:leave', { searchId });
        
        setTimeout(() => {
          const participants = searchWebSocketService.getSearchRoomParticipants(searchId);
          expect(participants).toBe(0);
          done();
        }, 50);
      }, 50);
    });
  });

  describe('Search Progress Handling', () => {
    it('should handle search progress requests', (done) => {
      const searchId = 'progress-test-123';
      const mockProgress = {
        searchId,
        status: 'searching' as const,
        progress: 50,
        completedSources: ['american-airlines'],
        totalSources: 2,
        results: [],
        errors: [],
        startTime: new Date(),
        estimatedCompletion: new Date()
      };

      mockOrchestrator.getSearchProgress.mockReturnValue(mockProgress);

      clientSocket.on('search:progress', (data: any) => {
        expect(data.searchId).toBe(searchId);
        expect(data.status).toBe('searching');
        expect(data.progress).toBe(50);
        expect(data.completedSources).toEqual(['american-airlines']);
        expect(data.totalSources).toBe(2);
        done();
      });

      clientSocket.emit('search:getProgress', { searchId });
    });

    it('should handle search not found', (done) => {
      const searchId = 'non-existent-search';
      
      mockOrchestrator.getSearchProgress.mockReturnValue(null);

      clientSocket.on('search:notFound', (data: any) => {
        expect(data.searchId).toBe(searchId);
        done();
      });

      clientSocket.emit('search:getProgress', { searchId });
    });
  });

  describe('Search Cancellation', () => {
    it('should handle search cancellation requests', (done) => {
      const searchId = 'cancel-test-123';
      
      mockOrchestrator.cancelSearch.mockResolvedValue(true);

      // Join the search room first
      clientSocket.emit('search:join', { searchId });
      
      setTimeout(() => {
        clientSocket.on('search:cancelled', (data: any) => {
          expect(data.searchId).toBe(searchId);
          done();
        });

        clientSocket.emit('search:cancel', { searchId });
      }, 50);
    });

    it('should handle cancellation errors', (done) => {
      const searchId = 'cancel-error-test';
      
      mockOrchestrator.cancelSearch.mockResolvedValue(false);

      clientSocket.on('search:error', (data: any) => {
        expect(data.searchId).toBe(searchId);
        expect(data.error).toContain('not found');
        done();
      });

      clientSocket.emit('search:cancel', { searchId });
    });
  });

  describe('Active Searches', () => {
    it('should handle active searches requests', (done) => {
      const mockActiveSearches = [
        {
          searchId: 'active-1',
          status: 'searching' as const,
          progress: 25,
          completedSources: [],
          totalSources: 2,
          results: [],
          errors: [],
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
          startTime: new Date()
        }
      ];

      mockOrchestrator.getActiveSearches.mockReturnValue(mockActiveSearches);

      clientSocket.on('search:activeList', (data: any) => {
        expect(data.searches).toHaveLength(2);
        expect(data.totalActive).toBe(2);
        expect(data.searches[0]?.searchId).toBe('active-1');
        expect(data.searches[1]?.searchId).toBe('active-2');
        done();
      });

      clientSocket.emit('search:getActive');
    });
  });

  describe('Event Emissions', () => {
    it('should emit search progress updates to room participants', (done) => {
      const searchId = 'emit-test-123';
      
      // Join the search room
      clientSocket.emit('search:join', { searchId });
      
      setTimeout(() => {
        clientSocket.on('search:progress', (data: any) => {
          expect(data.searchId).toBe(searchId);
          expect(data.status).toBe('searching');
          expect(data.progress).toBe(75);
          done();
        });

        // Emit progress update
        searchWebSocketService.emitSearchProgress(searchId, {
          status: 'searching',
          progress: 75,
          completedSources: ['american-airlines'],
          totalSources: 2,
          resultsCount: 5,
          errors: []
        });
      }, 50);
    });

    it('should emit search completion to room participants', (done) => {
      const searchId = 'completion-test-123';
      const mockResults = [
        {
          id: 'flight-1',
          airline: 'American Airlines',
          flightNumber: 'AA123',
          pricing: { totalPrice: 500 }
        }
      ];
      
      // Join the search room
      clientSocket.emit('search:join', { searchId });
      
      setTimeout(() => {
        clientSocket.on('search:completed', (data: any) => {
          expect(data.searchId).toBe(searchId);
          expect(data.results).toEqual(mockResults);
          expect(data.totalResults).toBe(1);
          done();
        });

        // Emit completion
        searchWebSocketService.emitSearchCompleted(searchId, mockResults, 1);
      }, 50);
    });

    it('should emit search failures to room participants', (done) => {
      const searchId = 'failure-test-123';
      const errorMessage = 'Search timeout occurred';
      
      // Join the search room
      clientSocket.emit('search:join', { searchId });
      
      setTimeout(() => {
        clientSocket.on('search:failed', (data: any) => {
          expect(data.searchId).toBe(searchId);
          expect(data.error).toBe(errorMessage);
          done();
        });

        // Emit failure
        searchWebSocketService.emitSearchFailed(searchId, errorMessage);
      }, 50);
    });

    it('should emit filter results to room participants', (done) => {
      const searchId = 'filter-test-123';
      const filters = { maxPrice: 600 };
      const results = [{ id: 'flight-1', pricing: { totalPrice: 500 } }];
      
      // Join the search room
      clientSocket.emit('search:join', { searchId });
      
      setTimeout(() => {
        clientSocket.on('search:filtered', (data: any) => {
          expect(data.searchId).toBe(searchId);
          expect(data.filters).toEqual(filters);
          expect(data.originalCount).toBe(10);
          expect(data.filteredCount).toBe(1);
          expect(data.results).toEqual(results);
          done();
        });

        // Emit filter results
        searchWebSocketService.emitSearchFiltered(searchId, filters, 10, 1, results);
      }, 50);
    });

    it('should emit sort results to room participants', (done) => {
      const searchId = 'sort-test-123';
      const results = [
        { id: 'flight-1', pricing: { totalPrice: 400 } },
        { id: 'flight-2', pricing: { totalPrice: 600 } }
      ];
      
      // Join the search room
      clientSocket.emit('search:join', { searchId });
      
      setTimeout(() => {
        clientSocket.on('search:sorted', (data: any) => {
          expect(data.searchId).toBe(searchId);
          expect(data.sortBy).toBe('price');
          expect(data.sortOrder).toBe('asc');
          expect(data.results).toEqual(results);
          done();
        });

        // Emit sort results
        searchWebSocketService.emitSearchSorted(searchId, 'price', 'asc', results);
      }, 50);
    });
  });

  describe('System Messages', () => {
    it('should broadcast system messages to all clients', (done) => {
      const message = 'System maintenance scheduled';
      const type = 'warning';
      
      clientSocket.on('system:message', (data: any) => {
        expect(data.message).toBe(message);
        expect(data.type).toBe(type);
        expect(data.timestamp).toBeDefined();
        done();
      });

      searchWebSocketService.broadcastSystemMessage(message, type);
    });
  });

  describe('Health Check', () => {
    it('should return health status', () => {
      const health = searchWebSocketService.healthCheck();
      
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(typeof health.connectedClients).toBe('number');
      expect(typeof health.activeRooms).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle orchestrator errors gracefully', (done) => {
      const searchId = 'error-test-123';
      
      mockOrchestrator.getSearchProgress.mockImplementation(() => {
        throw new Error('Orchestrator error');
      });

      clientSocket.on('search:error', (data: any) => {
        expect(data.searchId).toBe(searchId);
        expect(data.error).toContain('Failed to get search progress');
        done();
      });

      clientSocket.emit('search:getProgress', { searchId });
    });

    it('should handle cancellation errors gracefully', (done) => {
      const searchId = 'cancel-error-test-456';
      
      mockOrchestrator.cancelSearch.mockRejectedValue(new Error('Cancel failed'));

      clientSocket.on('search:error', (data: any) => {
        expect(data.searchId).toBe(searchId);
        expect(data.error).toContain('Failed to cancel search');
        done();
      });

      clientSocket.emit('search:cancel', { searchId });
    });
  });
});