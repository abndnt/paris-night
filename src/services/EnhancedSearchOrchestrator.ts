import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { Server as SocketIOServer } from 'socket.io';
import { 
  SearchCriteria, 
  FlightResult, 
  CreateFlightSearchData 
} from '../models/FlightSearch';
import { FlightSearchOrchestrator, SearchResult } from './FlightSearchOrchestrator';
import { 
  RouteOptimizationService, 
  OptimizedRoute, 
  RouteOptimizationOptions,
  MultiCitySearchCriteria,
  PositioningFlightSuggestion
} from './RouteOptimizationService';
import { 
  AdvancedSearchFilters, 
  PowerUserFilters, 
  FilterResult 
} from './AdvancedSearchFilters';
import { AirlineAdapterFactory } from '../factories/AirlineAdapterFactory';
import { logger } from '../utils/logger';

export interface EnhancedSearchOptions {
  // Basic search options
  airlines?: string[];
  includeNearbyAirports?: boolean;
  flexibleDates?: boolean;
  
  // Route optimization options
  routeOptimization?: RouteOptimizationOptions;
  
  // Advanced filtering options
  powerUserFilters?: PowerUserFilters;
  
  // Multi-city options
  multiCity?: MultiCitySearchCriteria;
  
  // Performance options
  maxConcurrentSearches?: number;
  searchTimeout?: number;
  enableRealTimeUpdates?: boolean;
  cacheResults?: boolean;
}

export interface EnhancedSearchResult extends SearchResult {
  optimizedRoute?: OptimizedRoute;
  filterResult?: FilterResult;
  positioningOptions?: PositioningFlightSuggestion[];
  multiCityRoute?: OptimizedRoute;
  powerUserAnalysis?: {
    availableOptions: any;
    recommendations: string[];
    appliedFilters: string[];
  };
}

export interface SearchAnalytics {
  searchId: string;
  originalCriteria: SearchCriteria;
  totalFlightsFound: number;
  filtersApplied: string[];
  optimizationUsed: boolean;
  routeType: string;
  searchDuration: number;
  userSavings: number;
  timestamp: Date;
}

export class EnhancedSearchOrchestrator extends FlightSearchOrchestrator {
  private routeOptimizer: RouteOptimizationService;
  private advancedFilters: AdvancedSearchFilters;
  private searchAnalytics: Map<string, SearchAnalytics> = new Map();

  constructor(
    database: Pool,
    redisClient: RedisClientType,
    adapterFactory: AirlineAdapterFactory,
    socketIO?: SocketIOServer,
    options: EnhancedSearchOptions = {}
  ) {
    super(database, redisClient, adapterFactory, socketIO, options);
    this.routeOptimizer = new RouteOptimizationService();
    this.advancedFilters = new AdvancedSearchFilters();
  }

  /**
   * Enhanced flight search with optimization and advanced filtering
   */
  async enhancedSearchFlights(
    searchData: CreateFlightSearchData,
    options: EnhancedSearchOptions = {}
  ): Promise<EnhancedSearchResult> {
    const startTime = Date.now();
    logger.info(`Starting enhanced flight search for ${searchData.searchCriteria.origin} to ${searchData.searchCriteria.destination}`);

    // Initialize analytics
    const analytics: SearchAnalytics = {
      searchId: '',
      originalCriteria: searchData.searchCriteria,
      totalFlightsFound: 0,
      filtersApplied: [],
      optimizationUsed: false,
      routeType: 'direct',
      searchDuration: 0,
      userSavings: 0,
      timestamp: new Date()
    };

    try {
      // Step 1: Perform basic flight search
      const basicResult = await this.searchFlights(
        searchData,
        options.airlines,
        {
          includeNearbyAirports: options.includeNearbyAirports || false,
          flexibleDates: options.flexibleDates || false,
          sortBy: 'price',
          sortOrder: 'asc'
        }
      );

      analytics.searchId = basicResult.searchId;
      analytics.totalFlightsFound = basicResult.totalResults;

      let enhancedResult: EnhancedSearchResult = {
        ...basicResult
      };

      // Step 2: Apply advanced filters if specified
      if (options.powerUserFilters) {
        const { filteredFlights, filterResult } = await this.advancedFilters.applyAdvancedFilters(
          basicResult.results,
          options.powerUserFilters
        );

        enhancedResult.results = filteredFlights;
        enhancedResult.totalResults = filteredFlights.length;
        enhancedResult.filterResult = filterResult;
        enhancedResult.powerUserAnalysis = {
          availableOptions: this.advancedFilters.getAvailableFilterOptions(basicResult.results),
          recommendations: this.advancedFilters.generateFilterRecommendations(
            searchData.searchCriteria,
            basicResult.results
          ),
          appliedFilters: filterResult.appliedFilters
        };

        analytics.filtersApplied = filterResult.appliedFilters;

        this.emitEnhancedUpdate(basicResult.searchId, 'filtering', {
          originalCount: basicResult.totalResults,
          filteredCount: filteredFlights.length,
          filtersApplied: filterResult.appliedFilters
        });
      }

      // Step 3: Route optimization if enabled
      if (options.routeOptimization && enhancedResult.results.length > 0) {
        const optimizedRoute = await this.routeOptimizer.optimizeRoute(
          searchData.searchCriteria,
          enhancedResult.results,
          options.routeOptimization
        );

        enhancedResult.optimizedRoute = optimizedRoute;
        analytics.optimizationUsed = true;
        analytics.routeType = optimizedRoute.routeType;
        analytics.userSavings = optimizedRoute.savings;

        // Find positioning flight options if enabled
        if (options.routeOptimization.considerPositioning) {
          const positioningOptions = await this.routeOptimizer.findPositioningFlights(
            searchData.searchCriteria,
            enhancedResult.results
          );
          enhancedResult.positioningOptions = positioningOptions;
        }

        this.emitEnhancedUpdate(basicResult.searchId, 'optimization', {
          routeType: optimizedRoute.routeType,
          savings: optimizedRoute.savings,
          optimizationScore: optimizedRoute.optimizationScore
        });
      }

      // Step 4: Multi-city optimization if specified
      if (options.multiCity) {
        const multiCityRoute = await this.routeOptimizer.optimizeMultiCityRoute(
          options.multiCity,
          enhancedResult.results
        );

        enhancedResult.multiCityRoute = multiCityRoute;
        analytics.routeType = 'multi-city';

        this.emitEnhancedUpdate(basicResult.searchId, 'multi-city', {
          cities: options.multiCity.cities,
          totalCost: multiCityRoute.totalCost,
          segments: multiCityRoute.optimizedFlights.length
        });
      }

      // Step 5: Final result processing and caching
      analytics.searchDuration = Date.now() - startTime;
      this.searchAnalytics.set(basicResult.searchId, analytics);

      // Cache enhanced results
      await this.cacheEnhancedResults(basicResult.searchId, enhancedResult);

      logger.info(`Enhanced search completed: ${basicResult.searchId}, ${enhancedResult.totalResults} results, ${analytics.searchDuration}ms`);

      return enhancedResult;

    } catch (error) {
      analytics.searchDuration = Date.now() - startTime;
      logger.error('Enhanced search failed:', error);
      throw error;
    }
  }

  /**
   * Get positioning flight suggestions for existing search
   */
  async getPositioningFlightSuggestions(
    searchId: string,
    maxDetourMiles: number = 500
  ): Promise<PositioningFlightSuggestion[]> {
    const search = await this.searchService.getFlightSearch(searchId);
    if (!search || !search.results || search.results.length === 0) {
      throw new Error('Search not found or has no results');
    }

    return await this.routeOptimizer.findPositioningFlights(
      search.searchCriteria,
      search.results,
      maxDetourMiles
    );
  }

  /**
   * Apply route optimization to existing search results
   */
  async optimizeExistingSearch(
    searchId: string,
    options: RouteOptimizationOptions
  ): Promise<OptimizedRoute> {
    const search = await this.searchService.getFlightSearch(searchId);
    if (!search || !search.results || search.results.length === 0) {
      throw new Error('Search not found or has no results');
    }

    const optimizedRoute = await this.routeOptimizer.optimizeRoute(
      search.searchCriteria,
      search.results,
      options
    );

    // Emit real-time update
    this.emitEnhancedUpdate(searchId, 'optimization-applied', {
      routeType: optimizedRoute.routeType,
      savings: optimizedRoute.savings,
      optimizationScore: optimizedRoute.optimizationScore
    });

    return optimizedRoute;
  }

  /**
   * Apply advanced filters to existing search results
   */
  async applyAdvancedFiltersToSearch(
    searchId: string,
    filters: PowerUserFilters
  ): Promise<{ filteredFlights: FlightResult[]; filterResult: FilterResult }> {
    const search = await this.searchService.getFlightSearch(searchId);
    if (!search || !search.results || search.results.length === 0) {
      throw new Error('Search not found or has no results');
    }

    const result = await this.advancedFilters.applyAdvancedFilters(search.results, filters);

    // Emit real-time update
    this.emitEnhancedUpdate(searchId, 'filters-applied', {
      originalCount: search.results.length,
      filteredCount: result.filteredFlights.length,
      filtersApplied: result.filterResult.appliedFilters
    });

    return result;
  }

  /**
   * Get comprehensive search analytics
   */
  getSearchAnalytics(searchId: string): SearchAnalytics | null {
    return this.searchAnalytics.get(searchId) || null;
  }

  /**
   * Get all search analytics (for admin/reporting)
   */
  getAllSearchAnalytics(): SearchAnalytics[] {
    return Array.from(this.searchAnalytics.values());
  }

  /**
   * Generate search insights and recommendations
   */
  async generateSearchInsights(searchId: string): Promise<{
    insights: string[];
    recommendations: string[];
    potentialSavings: number;
    alternativeRoutes: number;
  }> {
    const analytics = this.searchAnalytics.get(searchId);
    if (!analytics) {
      throw new Error('Search analytics not found');
    }

    const search = await this.searchService.getFlightSearch(searchId);
    if (!search) {
      throw new Error('Search not found');
    }

    const insights: string[] = [];
    const recommendations: string[] = [];
    let potentialSavings = 0;
    let alternativeRoutes = 0;

    // Analyze search results
    if (search.results && search.results.length > 0) {
      const prices = search.results.map(f => f.pricing.totalPrice);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

      insights.push(`Price range: $${minPrice} - $${maxPrice} (avg: $${Math.round(avgPrice)})`);

      // Direct vs connecting flights
      const directFlights = search.results.filter(f => f.route.length === 1);
      const connectingFlights = search.results.filter(f => f.route.length > 1);

      if (directFlights.length > 0 && connectingFlights.length > 0) {
        const directAvgPrice = directFlights.reduce((sum, f) => sum + f.pricing.totalPrice, 0) / directFlights.length;
        const connectingAvgPrice = connectingFlights.reduce((sum, f) => sum + f.pricing.totalPrice, 0) / connectingFlights.length;
        
        if (connectingAvgPrice < directAvgPrice) {
          potentialSavings = Math.round(directAvgPrice - connectingAvgPrice);
          recommendations.push(`Save ~$${potentialSavings} by choosing connecting flights over direct`);
        }
      }

      // Alternative airports
      const origins = [...new Set(search.results.map(f => f.route[0]?.origin))];
      const destinations = [...new Set(search.results.map(f => f.route[f.route.length - 1]?.destination))];
      
      alternativeRoutes = (origins.length - 1) + (destinations.length - 1);
      
      if (alternativeRoutes > 0) {
        insights.push(`${alternativeRoutes} alternative airport options available`);
        recommendations.push('Consider nearby airports for potentially better deals');
      }

      // Timing insights
      const departureHours = search.results.map(f => f.route[0]?.departureTime.getHours() || 0);
      const earlyFlights = departureHours.filter(h => h < 8).length;
      const lateFlights = departureHours.filter(h => h > 20).length;

      if (earlyFlights > 0 || lateFlights > 0) {
        insights.push(`${earlyFlights} early morning and ${lateFlights} late evening options`);
        if (earlyFlights > 0) {
          recommendations.push('Early morning flights often offer better prices');
        }
      }
    }

    // Optimization insights
    if (analytics.optimizationUsed) {
      insights.push(`Route optimization applied: ${analytics.routeType} routing`);
      if (analytics.userSavings > 0) {
        insights.push(`Optimization saved $${analytics.userSavings}`);
      }
    } else {
      recommendations.push('Enable route optimization for potentially better deals');
    }

    // Filter insights
    if (analytics.filtersApplied.length > 0) {
      insights.push(`${analytics.filtersApplied.length} advanced filters applied`);
    } else {
      recommendations.push('Use advanced filters to narrow down options');
    }

    return {
      insights,
      recommendations,
      potentialSavings,
      alternativeRoutes
    };
  }

  /**
   * Emit enhanced search updates via WebSocket
   */
  private emitEnhancedUpdate(searchId: string, type: string, data: any): void {
    if (this.socketIO) {
      this.socketIO.emit('enhanced-search:update', {
        searchId,
        type,
        data,
        timestamp: new Date()
      });
    }
  }

  /**
   * Cache enhanced search results
   */
  private async cacheEnhancedResults(searchId: string, result: EnhancedSearchResult): Promise<void> {
    try {
      const cacheKey = `enhanced_search:${searchId}`;
      const cacheData = {
        searchId,
        result,
        timestamp: new Date()
      };

      await this.redisClient.setEx(
        cacheKey,
        1800, // 30 minutes
        JSON.stringify(cacheData)
      );

      logger.debug(`Cached enhanced search results for ${searchId}`);
    } catch (error) {
      logger.error('Failed to cache enhanced search results:', error);
    }
  }

  /**
   * Get cached enhanced results
   */
  async getCachedEnhancedResults(searchId: string): Promise<EnhancedSearchResult | null> {
    try {
      const cacheKey = `enhanced_search:${searchId}`;
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        return data.result;
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get cached enhanced results:', error);
      return null;
    }
  }

  /**
   * Health check for enhanced orchestrator
   */
  async enhancedHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    baseOrchestrator: any;
    routeOptimizer: boolean;
    advancedFilters: boolean;
    activeAnalytics: number;
  }> {
    const baseHealth = await this.healthCheck();
    
    return {
      status: baseHealth.status,
      baseOrchestrator: baseHealth,
      routeOptimizer: true, // Route optimizer is always available
      advancedFilters: true, // Advanced filters are always available
      activeAnalytics: this.searchAnalytics.size
    };
  }

  /**
   * Cleanup enhanced orchestrator resources
   */
  async enhancedCleanup(): Promise<void> {
    // Clear analytics cache
    this.searchAnalytics.clear();
    
    // Call parent cleanup
    await this.cleanup();
  }
}