import { Server as SocketIOServer, Socket } from 'socket.io';
import { FlightSearchOrchestrator } from './FlightSearchOrchestrator';
import { logger } from '../utils/logger';

export interface SearchWebSocketEvents {
  'search:start': (data: { searchId: string; criteria: any }) => void;
  'search:progress': (data: { 
    searchId: string; 
    status: string; 
    progress: number; 
    completedSources: string[];
    totalSources: number;
    resultsCount: number;
    errors: string[];
    estimatedCompletion?: Date;
  }) => void;
  'search:completed': (data: { searchId: string; results: any[]; totalResults: number }) => void;
  'search:failed': (data: { searchId: string; error: string }) => void;
  'search:filtered': (data: { 
    searchId: string; 
    filters: any; 
    originalCount: number; 
    filteredCount: number; 
    results: any[] 
  }) => void;
  'search:sorted': (data: { 
    searchId: string; 
    sortBy: string; 
    sortOrder: string; 
    results: any[] 
  }) => void;
}

export class SearchWebSocketService {
  private io: SocketIOServer;
  private orchestrator: FlightSearchOrchestrator;
  private connectedClients: Map<string, Socket> = new Map();

  constructor(io: SocketIOServer, orchestrator: FlightSearchOrchestrator) {
    this.io = io;
    this.orchestrator = orchestrator;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Search WebSocket client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      // Handle client joining search room
      socket.on('search:join', (data: { searchId: string }) => {
        socket.join(`search:${data.searchId}`);
        logger.debug(`Client ${socket.id} joined search room: ${data.searchId}`);
      });

      // Handle client leaving search room
      socket.on('search:leave', (data: { searchId: string }) => {
        socket.leave(`search:${data.searchId}`);
        logger.debug(`Client ${socket.id} left search room: ${data.searchId}`);
      });

      // Handle search progress requests
      socket.on('search:getProgress', async (data: { searchId: string }) => {
        try {
          const progress = this.orchestrator.getSearchProgress(data.searchId);
          if (progress) {
            socket.emit('search:progress', {
              searchId: progress.searchId,
              status: progress.status,
              progress: progress.progress,
              completedSources: progress.completedSources,
              totalSources: progress.totalSources,
              resultsCount: progress.results.length,
              errors: progress.errors,
              estimatedCompletion: progress.estimatedCompletion
            });
          } else {
            socket.emit('search:notFound', { searchId: data.searchId });
          }
        } catch (error) {
          logger.error('Error getting search progress:', error);
          socket.emit('search:error', { 
            searchId: data.searchId, 
            error: 'Failed to get search progress' 
          });
        }
      });

      // Handle search cancellation requests
      socket.on('search:cancel', async (data: { searchId: string }) => {
        try {
          const cancelled = await this.orchestrator.cancelSearch(data.searchId);
          if (cancelled) {
            this.emitToSearchRoom(data.searchId, 'search:cancelled', { searchId: data.searchId });
          } else {
            socket.emit('search:error', { 
              searchId: data.searchId, 
              error: 'Search not found or already completed' 
            });
          }
        } catch (error) {
          logger.error('Error cancelling search:', error);
          socket.emit('search:error', { 
            searchId: data.searchId, 
            error: 'Failed to cancel search' 
          });
        }
      });

      // Handle active searches request
      socket.on('search:getActive', () => {
        try {
          const activeSearches = this.orchestrator.getActiveSearches();
          socket.emit('search:activeList', {
            searches: activeSearches.map(search => ({
              searchId: search.searchId,
              status: search.status,
              progress: search.progress,
              completedSources: search.completedSources,
              totalSources: search.totalSources,
              resultsCount: search.results.length,
              startTime: search.startTime,
              estimatedCompletion: search.estimatedCompletion
            })),
            totalActive: activeSearches.length
          });
        } catch (error) {
          logger.error('Error getting active searches:', error);
          socket.emit('search:error', { error: 'Failed to get active searches' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`Search WebSocket client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  /**
   * Emit search progress updates to specific search room
   */
  emitSearchProgress(searchId: string, progress: {
    status: string;
    progress: number;
    completedSources: string[];
    totalSources: number;
    resultsCount: number;
    errors: string[];
    estimatedCompletion?: Date;
  }): void {
    this.emitToSearchRoom(searchId, 'search:progress', {
      searchId,
      ...progress
    });
  }

  /**
   * Emit search completion to specific search room
   */
  emitSearchCompleted(searchId: string, results: any[], totalResults: number): void {
    this.emitToSearchRoom(searchId, 'search:completed', {
      searchId,
      results,
      totalResults
    });
  }

  /**
   * Emit search failure to specific search room
   */
  emitSearchFailed(searchId: string, error: string): void {
    this.emitToSearchRoom(searchId, 'search:failed', {
      searchId,
      error
    });
  }

  /**
   * Emit filter results to specific search room
   */
  emitSearchFiltered(searchId: string, filters: any, originalCount: number, filteredCount: number, results: any[]): void {
    this.emitToSearchRoom(searchId, 'search:filtered', {
      searchId,
      filters,
      originalCount,
      filteredCount,
      results
    });
  }

  /**
   * Emit sort results to specific search room
   */
  emitSearchSorted(searchId: string, sortBy: string, sortOrder: string, results: any[]): void {
    this.emitToSearchRoom(searchId, 'search:sorted', {
      searchId,
      sortBy,
      sortOrder,
      results
    });
  }

  /**
   * Emit to all clients in a search room
   */
  private emitToSearchRoom(searchId: string, event: string, data: any): void {
    this.io.to(`search:${searchId}`).emit(event, data);
    logger.debug(`Emitted ${event} to search room: ${searchId}`);
  }

  /**
   * Emit to all connected clients
   */
  emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
    logger.debug(`Emitted ${event} to all clients`);
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get search room participants count
   */
  getSearchRoomParticipants(searchId: string): number {
    const room = this.io.sockets.adapter.rooms.get(`search:${searchId}`);
    return room ? room.size : 0;
  }

  /**
   * Broadcast system message to all clients
   */
  broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.emitToAll('system:message', {
      message,
      type,
      timestamp: new Date()
    });
  }

  /**
   * Health check for WebSocket service
   */
  healthCheck(): {
    status: 'healthy' | 'unhealthy';
    connectedClients: number;
    activeRooms: number;
  } {
    try {
      const activeRooms = this.io.sockets.adapter.rooms.size;
      
      return {
        status: 'healthy',
        connectedClients: this.connectedClients.size,
        activeRooms
      };
    } catch (error) {
      logger.error('WebSocket health check failed:', error);
      return {
        status: 'unhealthy',
        connectedClients: 0,
        activeRooms: 0
      };
    }
  }
}