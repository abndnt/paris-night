import { Pool } from 'pg';
import { FlightSearch, CreateFlightSearchData, UpdateFlightSearchData, SearchCriteria, FlightResult } from '../models/FlightSearch';
export interface SearchFilters {
    maxPrice?: number;
    maxDuration?: number;
    maxLayovers?: number;
    preferredAirlines?: string[];
    departureTimeRange?: {
        earliest: string;
        latest: string;
    };
}
export interface SearchOptions {
    includeNearbyAirports?: boolean;
    flexibleDates?: boolean;
    sortBy?: 'price' | 'duration' | 'score';
    sortOrder?: 'asc' | 'desc';
}
export declare class SearchService {
    private flightSearchModel;
    constructor(database: Pool);
    createFlightSearch(searchData: CreateFlightSearchData): Promise<FlightSearch>;
    getFlightSearch(searchId: string): Promise<FlightSearch | null>;
    updateFlightSearch(searchId: string, updateData: UpdateFlightSearchData): Promise<FlightSearch | null>;
    getUserFlightSearches(userId: string, limit?: number, offset?: number): Promise<FlightSearch[]>;
    getRecentFlightSearches(limit?: number): Promise<FlightSearch[]>;
    deleteFlightSearch(searchId: string): Promise<boolean>;
    filterFlightResults(results: FlightResult[], filters: SearchFilters): FlightResult[];
    sortFlightResults(results: FlightResult[], sortBy?: 'price' | 'duration' | 'score', sortOrder?: 'asc' | 'desc'): FlightResult[];
    cleanupExpiredSearches(): Promise<number>;
    validateAndSuggestCorrections(criteria: SearchCriteria): {
        isValid: boolean;
        errors: string[];
        suggestions: string[];
    };
    private sanitizeSearchCriteria;
    private sanitizeFlightResults;
    private isValidUUID;
    private isValidAirportCode;
}
//# sourceMappingURL=SearchService.d.ts.map