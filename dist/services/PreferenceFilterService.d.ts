import { TravelPreferences } from '../models/TravelPreferences';
import { FlightResult } from '../models/FlightSearch';
export interface FilteredSearchResults {
    results: FlightResult[];
    appliedFilters: string[];
    totalResults: number;
    filteredResults: number;
}
export interface PreferenceFilterOptions {
    applyAirlinePreference?: boolean;
    applyAirportPreference?: boolean;
    applyCabinClassPreference?: boolean;
    applyLayoverPreference?: boolean;
    strictFiltering?: boolean;
}
export declare class PreferenceFilterService {
    filterByPreferences(results: FlightResult[], preferences: TravelPreferences | null, options?: PreferenceFilterOptions): Promise<FilteredSearchResults>;
    private calculatePreferenceScore;
    private matchesAirlinePreference;
    private matchesAirportPreference;
    private matchesCabinClassPreference;
    private matchesLayoverPreference;
    getSearchRecommendations(preferences: TravelPreferences | null): Promise<{
        recommendedAirlines: string[];
        recommendedAirports: string[];
        recommendedCabinClass: string;
        recommendedMaxLayovers: number;
    }>;
    analyzeBookingPatterns(bookingHistory: any[]): Promise<{
        suggestedAirlines: string[];
        suggestedAirports: string[];
        suggestedCabinClass: string;
        suggestedMaxLayovers: number;
        confidence: number;
    }>;
}
//# sourceMappingURL=PreferenceFilterService.d.ts.map