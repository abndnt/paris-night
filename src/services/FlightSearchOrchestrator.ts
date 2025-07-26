import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { Server as SocketIOServer } from 'socket.io';
import { 
  SearchCriteria, 
  FlightResult, 
  CreateFlightSearchData,
  UpdateFlightSearchData
} from '../models/FlightSearch';
import { SearchService, SearchFilters, SearchOptions } from './SearchService';
import { AirlineAdapterFactory } from '../factories/AirlineAdapterFactory';
import { AirlineSearchRequest, AirlineSearchResponse } from '../adapters/BaseAirlineAdapter';
import { logger } from '../utils/logger';

export interface SearchOrchestrationOptions {
  maxConcurrentSearches?: number;
  searchTimeout?: number;
  enableRealTimeUpdates?: boolean;
  cacheResults?: boolean;
  cacheTtl?: number;
}

export interface SearchProgress {
  searchId: string;
  status: 'initializing' | 'searching' | 'aggregating' | 'completed' | 'failed';
  progress: number; // 0-100
  completedSources: string[];
  totalSources: number;
  results: FlightResult[];
  errors: string[];
  startTime: Date;
  estimatedCompletion?: Date;
}

export interface SearchResult {
  searchId: string;
  results: FlightResult[];
  totalResults: number;
  searchTime: number;
  sources: string[];
  cached: boolean;
  filters?: SearchFilters;
  sortBy?: string;
  sortOrder?: string;
}

export class FlightSearchOrchestrator {
  protected searchService: SearchService;
  protected adapterFactory: AirlineAdapterFactory;
  protected redisClient: RedisClientType;
  protected socketIO: SocketIOServer | undefined;
  private activeSearches: Map<string, SearchProgress> = new Map();
  private options: Required<SearchOrchestrationOptions>;

  constructor(
    database: Pool,
    redisClient: RedisClientType,
    adapterFactory: AirlineAdapterFactory,
    socketIO?: SocketIOServer,
    options: SearchOrchestrationOptions = {}
  ) {
    this.searchService = new SearchService(database);
    this.adapterFactory = adapterFactory;
    this.redisClient = redisClient;
    this.socketIO = socketIO;
    
    this.options = {
      maxConcurrentSearches: options.maxConcurrentSearches || 5,
      searchTimeout: options.searchTimeout || 30000, // 30 seconds
      enableRealTimeUpdates: options.enableRealTimeUpdates ?? true,
      cacheResults: options.cacheResults ?? true,
      cacheTtl: options.cacheTtl || 300 // 5 minutes
    };
  }

  /**
   * Orchestrate flight search across multiple data sources
   */
  async searchFlights(
    searchData: CreateFlightSearchData,
    airlines: string[] = ['american-airlines', 'delta-airlines'],
    searchOptions: SearchOptions = {}
  ): Promise<SearchResult> {
    // Create initial search record
    const search = await this.searchService.createFlightSearch(searchData);
    const searchId = search.id;

    // Initialize search progress
    const progress: SearchProgress = {
      searchId,
      status: 'initializing',
      progress: 0,
      completedSources: [],
      totalSources: airlines.length,
      results: [],
      errors: [],
      startTime: new Date()
    };

    this.activeSearches.set(searchId, progress);
    this.emitSearchUpdate(searchId, progress);

    try {
      // Check if we have too many concurrent searches
      if (this.activeSearches.size > this.options.maxConcurrentSearches) {
        throw new Error('Maximum concurrent searches exceeded. Please try again later.');
      }

      // Update status to searching
      progress.status = 'searching';
      progress.progress = 10;
      this.emitSearchUpdate(searchId, progress);

      // Search across all airline sources concurrently
      const searchPromises = airlines.map(airline => 
        this.searchSingleAirline(airline, search.searchCriteria, searchId)
      );

      // Wait for all searches with timeout
      const searchResults = await Promise.allSettled(
        searchPromises.map(promise => 
          this.withTimeout(promise, this.options.searchTimeout)
        )
      );

      // Process results
      const allResults: FlightResult[] = [];
      const sources: string[] = [];
      const errors: string[] = [];

      searchResults.forEach((result, index) => {
        const airline = airlines[index]!;
        
        if (result.status === 'fulfilled' && result.value) {
          allResults.push(...result.value.flights);
          sources.push(airline);
          progress.completedSources.push(airline);
        } else {
          const error = result.status === 'rejected' 
            ? result.reason?.message || 'Unknown error'
            : 'No results returned';
          errors.push(`${airline}: ${error}`);
          progress.errors.push(`${airline}: ${error}`);
        }
      });

      // Update progress to aggregating
      progress.status = 'aggregating';
      progress.progress = 80;
      progress.results = allResults;
      this.emitSearchUpdate(searchId, progress);

      // Apply filters and sorting
      let filteredResults = allResults;
      
      if (searchOptions.includeNearbyAirports) {
        // In a real implementation, this would expand search to nearby airports
        logger.info(`Nearby airports option enabled for search ${searchId}`);
      }

      // Sort results
      const sortBy = searchOptions.sortBy || 'price';
      const sortOrder = searchOptions.sortOrder || 'asc';
      const sortedResults = this.searchService.sortFlightResults(
        filteredResults, 
        sortBy, 
        sortOrder
      );

      // Update search record with results
      const updateData: UpdateFlightSearchData = {
        results: sortedResults,
        status: 'completed'
      };

      await this.searchService.updateFlightSearch(searchId, updateData);

      // Update final progress
      progress.status = 'completed';
      progress.progress = 100;
      progress.results = sortedResults;
      progress.estimatedCompletion = new Date();
      this.emitSearchUpdate(searchId, progress);

      // Cache results if enabled
      if (this.options.cacheResults) {
        await this.cacheSearchResults(searchId, sortedResults);
      }

      const searchTime = Date.now() - progress.startTime.getTime();

      const result: SearchResult = {
        searchId,
        results: sortedResults,
        totalResults: sortedResults.length,
        searchTime,
        sources,
        cached: false,
        sortBy,
        sortOrder
      };

      // Clean up active search
      this.activeSearches.delete(searchId);

      logger.info(`Flight search completed: ${searchId}, ${result.totalResults} results from ${sources.length} sources in ${searchTime}ms`);

      return result;

    } catch (error) {
      // Update search status to failed
      progress.status = 'failed';
      progress.errors.push(error instanceof Error ? error.message : 'Unknown error');
      this.emitSearchUpdate(searchId, progress);

      // Update database record
      await this.searchService.updateFlightSearch(searchId, { status: 'error' });

      // Clean up
      this.activeSearches.delete(searchId);

      logger.error(`Flight search failed: ${searchId}`, error);
      throw error;
    }
  }

  /**
   * Apply filters to existing search results
   */
  async filterSearchResults(
    searchId: string, 
    filters: SearchFilters
  ): Promise<SearchResult> {
    const search = await this.searchService.getFlightSearch(searchId);
    if (!search) {
      throw new Error('Search not found');
    }

    if (!search.results || search.results.length === 0) {
      throw new Error('No results available to filter');
    }

    const filteredResults = this.searchService.filterFlightResults(search.results, filters);
    
    // Emit real-time update
    if (this.options.enableRealTimeUpdates) {
      this.socketIO?.emit('search:filtered', {
        searchId,
        filters,
        originalCount: search.results.length,
        filteredCount: filteredResults.length,
        results: filteredResults
      });
    }

    return {
      searchId,
      results: filteredResults,
      totalResults: filteredResults.length,
      searchTime: 0, // Filtering is instant
      sources: [], // Not applicable for filtering
      cached: true,
      filters
    };
  }

  /**
   * Sort existing search results
   */
  async sortSearchResults(
    searchId: string,
    sortBy: 'price' | 'duration' | 'score' = 'price',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<SearchResult> {
    const search = await this.searchService.getFlightSearch(searchId);
    if (!search) {
      throw new Error('Search not found');
    }

    if (!search.results || search.results.length === 0) {
      throw new Error('No results available to sort');
    }

    const sortedResults = this.searchService.sortFlightResults(search.results, sortBy, sortOrder);
    
    // Emit real-time update
    if (this.options.enableRealTimeUpdates) {
      this.socketIO?.emit('search:sorted', {
        searchId,
        sortBy,
        sortOrder,
        results: sortedResults
      });
    }

    return {
      searchId,
      results: sortedResults,
      totalResults: sortedResults.length,
      searchTime: 0, // Sorting is instant
      sources: [], // Not applicable for sorting
      cached: true,
      sortBy,
      sortOrder
    };
  }

  /**
   * Get search progress for active searches
   */
  getSearchProgress(searchId: string): SearchProgress | null {
    return this.activeSearches.get(searchId) || null;
  }

  /**
   * Get all active searches
   */
  getActiveSearches(): SearchProgress[] {
    return Array.from(this.activeSearches.values());
  }

  /**
   * Cancel an active search
   */
  async cancelSearch(searchId: string): Promise<boolean> {
    const progress = this.activeSearches.get(searchId);
    if (!progress) {
      return false;
    }

    progress.status = 'failed';
    progress.errors.push('Search cancelled by user');
    this.emitSearchUpdate(searchId, progress);

    // Update database record
    await this.searchService.updateFlightSearch(searchId, { status: 'error' });

    // Clean up
    this.activeSearches.delete(searchId);

    logger.info(`Search cancelled: ${searchId}`);
    return true;
  }

  /**
   * Search a single airline source
   */
  private async searchSingleAirline(
    airlineName: string, 
    searchCriteria: SearchCriteria,
    searchId: string
  ): Promise<AirlineSearchResponse> {
    try {
      logger.info(`Starting search for ${airlineName} - Search ID: ${searchId}`);

      const adapter = await this.adapterFactory.getAdapter(airlineName, 'mock');
      
      const request: AirlineSearchRequest = {
        searchCriteria,
        requestId: `${searchId}-${airlineName}`,
        timestamp: new Date()
      };

      const response = await adapter.searchFlights(request);
      
      logger.info(`Completed search for ${airlineName} - ${response.flights.length} results`);
      
      return response;
    } catch (error) {
      logger.error(`Search failed for ${airlineName}:`, error);
      throw error;
    }
  }

  /**
   * Add timeout to promises
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), timeoutMs)
      )
    ]);
  }

  /**
   * Emit search updates via WebSocket
   */
  private emitSearchUpdate(searchId: string, progress: SearchProgress): void {
    if (this.options.enableRealTimeUpdates && this.socketIO) {
      this.socketIO.emit('search:progress', {
        searchId,
        status: progress.status,
        progress: progress.progress,
        completedSources: progress.completedSources,
        totalSources: progress.totalSources,
        resultsCount: progress.results.length,
        errors: progress.errors,
        estimatedCompletion: progress.estimatedCompletion
      });
    }
  }

  /**
   * Cache search results
   */
  private async cacheSearchResults(searchId: string, results: FlightResult[]): Promise<void> {
    try {
      const cacheKey = `search_results:${searchId}`;
      const cacheData = {
        searchId,
        results,
        timestamp: new Date(),
        ttl: this.options.cacheTtl
      };

      await this.redisClient.setEx(
        cacheKey, 
        this.options.cacheTtl, 
        JSON.stringify(cacheData)
      );

      logger.debug(`Cached search results for ${searchId}`);
    } catch (error) {
      logger.error('Failed to cache search results:', error);
      // Don't throw - caching failures shouldn't break the search
    }
  }



  /**
   * Health check for the orchestrator
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    activeSearches: number;
    adapterHealth: Record<string, any>;
    cacheHealth: boolean;
  }> {
    try {
      // Check adapter health
      const adapterHealth = await this.adapterFactory.getAllAdapterHealth();
      
      // Check cache health
      let cacheHealth = false;
      try {
        await this.redisClient.ping();
        cacheHealth = true;
      } catch (error) {
        logger.error('Cache health check failed:', error);
      }

      // Determine overall status
      const healthyAdapters = Object.values(adapterHealth).filter(
        health => health.status === 'healthy'
      ).length;
      
      const totalAdapters = Object.keys(adapterHealth).length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (healthyAdapters === 0) {
        status = 'unhealthy';
      } else if (healthyAdapters < totalAdapters || !cacheHealth) {
        status = 'degraded';
      }

      return {
        status,
        activeSearches: this.activeSearches.size,
        adapterHealth,
        cacheHealth
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        activeSearches: this.activeSearches.size,
        adapterHealth: {},
        cacheHealth: false
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cancel all active searches
    for (const searchId of Array.from(this.activeSearches.keys())) {
      await this.cancelSearch(searchId);
    }

    // Cleanup adapter factory
    await this.adapterFactory.cleanup();
  }
}