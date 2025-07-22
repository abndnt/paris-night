import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { Server as SocketIOServer } from 'socket.io';
import { FlightResult, CreateFlightSearchData } from '../models/FlightSearch';
import { SearchFilters, SearchOptions } from './SearchService';
import { AirlineAdapterFactory } from '../factories/AirlineAdapterFactory';
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
    progress: number;
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
export declare class FlightSearchOrchestrator {
    private searchService;
    private adapterFactory;
    private redisClient;
    private socketIO;
    private activeSearches;
    private options;
    constructor(database: Pool, redisClient: RedisClientType, adapterFactory: AirlineAdapterFactory, socketIO?: SocketIOServer, options?: SearchOrchestrationOptions);
    searchFlights(searchData: CreateFlightSearchData, airlines?: string[], searchOptions?: SearchOptions): Promise<SearchResult>;
    filterSearchResults(searchId: string, filters: SearchFilters): Promise<SearchResult>;
    sortSearchResults(searchId: string, sortBy?: 'price' | 'duration' | 'score', sortOrder?: 'asc' | 'desc'): Promise<SearchResult>;
    getSearchProgress(searchId: string): SearchProgress | null;
    getActiveSearches(): SearchProgress[];
    cancelSearch(searchId: string): Promise<boolean>;
    private searchSingleAirline;
    private withTimeout;
    private emitSearchUpdate;
    private cacheSearchResults;
    healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        activeSearches: number;
        adapterHealth: Record<string, any>;
        cacheHealth: boolean;
    }>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=FlightSearchOrchestrator.d.ts.map