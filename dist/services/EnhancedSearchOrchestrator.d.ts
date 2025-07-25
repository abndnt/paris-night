import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { Server as SocketIOServer } from 'socket.io';
import { SearchCriteria, FlightResult, CreateFlightSearchData } from '../models/FlightSearch';
import { FlightSearchOrchestrator, SearchResult } from './FlightSearchOrchestrator';
import { OptimizedRoute, RouteOptimizationOptions, MultiCitySearchCriteria, PositioningFlightSuggestion } from './RouteOptimizationService';
import { PowerUserFilters, FilterResult } from './AdvancedSearchFilters';
import { AirlineAdapterFactory } from '../factories/AirlineAdapterFactory';
export interface EnhancedSearchOptions {
    airlines?: string[];
    includeNearbyAirports?: boolean;
    flexibleDates?: boolean;
    routeOptimization?: RouteOptimizationOptions;
    powerUserFilters?: PowerUserFilters;
    multiCity?: MultiCitySearchCriteria;
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
export declare class EnhancedSearchOrchestrator extends FlightSearchOrchestrator {
    private routeOptimizer;
    private advancedFilters;
    private searchAnalytics;
    constructor(database: Pool, redisClient: RedisClientType, adapterFactory: AirlineAdapterFactory, socketIO?: SocketIOServer, options?: EnhancedSearchOptions);
    enhancedSearchFlights(searchData: CreateFlightSearchData, options?: EnhancedSearchOptions): Promise<EnhancedSearchResult>;
    getPositioningFlightSuggestions(searchId: string, maxDetourMiles?: number): Promise<PositioningFlightSuggestion[]>;
    optimizeExistingSearch(searchId: string, options: RouteOptimizationOptions): Promise<OptimizedRoute>;
    applyAdvancedFiltersToSearch(searchId: string, filters: PowerUserFilters): Promise<{
        filteredFlights: FlightResult[];
        filterResult: FilterResult;
    }>;
    getSearchAnalytics(searchId: string): SearchAnalytics | null;
    getAllSearchAnalytics(): SearchAnalytics[];
    generateSearchInsights(searchId: string): Promise<{
        insights: string[];
        recommendations: string[];
        potentialSavings: number;
        alternativeRoutes: number;
    }>;
    private emitEnhancedUpdate;
    private cacheEnhancedResults;
    getCachedEnhancedResults(searchId: string): Promise<EnhancedSearchResult | null>;
    enhancedHealthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        baseOrchestrator: any;
        routeOptimizer: boolean;
        advancedFilters: boolean;
        activeAnalytics: number;
    }>;
    enhancedCleanup(): Promise<void>;
}
//# sourceMappingURL=EnhancedSearchOrchestrator.d.ts.map