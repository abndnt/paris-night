import { TravelPreferences } from '../models/TravelPreferences';
import { FlightResult, FlightSegment } from '../models/FlightSearch';

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
  strictFiltering?: boolean; // If true, exclude results that don't match preferences
}

export class PreferenceFilterService {
  /**
   * Filter and rank search results based on user preferences
   */
  async filterByPreferences(
    results: FlightResult[],
    preferences: TravelPreferences | null,
    options: PreferenceFilterOptions = {}
  ): Promise<FilteredSearchResults> {
    if (!preferences || results.length === 0) {
      return {
        results,
        appliedFilters: [],
        totalResults: results.length,
        filteredResults: results.length,
      };
    }

    const {
      applyAirlinePreference = true,
      applyAirportPreference = true,
      applyCabinClassPreference = true,
      applyLayoverPreference = true,
      strictFiltering = false,
    } = options;

    let filteredResults = [...results];
    const appliedFilters: string[] = [];

    // Apply airline preference filter
    if (applyAirlinePreference && preferences.preferredAirlines.length > 0) {
      if (strictFiltering) {
        filteredResults = filteredResults.filter(result =>
          this.matchesAirlinePreference(result, preferences.preferredAirlines)
        );
      }
      appliedFilters.push('airline_preference');
    }

    // Apply airport preference filter
    if (applyAirportPreference && preferences.preferredAirports.length > 0) {
      if (strictFiltering) {
        filteredResults = filteredResults.filter(result =>
          this.matchesAirportPreference(result, preferences.preferredAirports)
        );
      }
      appliedFilters.push('airport_preference');
    }

    // Apply cabin class preference filter
    if (applyCabinClassPreference && preferences.preferredCabinClass) {
      if (strictFiltering) {
        filteredResults = filteredResults.filter(result =>
          this.matchesCabinClassPreference(result, preferences.preferredCabinClass)
        );
      }
      appliedFilters.push('cabin_class_preference');
    }

    // Apply layover preference filter
    if (applyLayoverPreference && preferences.maxLayovers !== undefined) {
      if (strictFiltering) {
        filteredResults = filteredResults.filter(result =>
          this.matchesLayoverPreference(result, preferences.maxLayovers)
        );
      }
      appliedFilters.push('layover_preference');
    }

    // Sort results by preference score (higher score = better match)
    const scoredResults = filteredResults.map(result => ({
      result,
      score: this.calculatePreferenceScore(result, preferences),
    }));

    scoredResults.sort((a, b) => b.score - a.score);

    return {
      results: scoredResults.map(item => item.result),
      appliedFilters,
      totalResults: results.length,
      filteredResults: filteredResults.length,
    };
  }

  /**
   * Calculate preference score for a flight result
   */
  private calculatePreferenceScore(result: FlightResult, preferences: TravelPreferences): number {
    let score = 0;

    // Airline preference scoring
    if (preferences.preferredAirlines.length > 0) {
      const airlineMatch = this.matchesAirlinePreference(result, preferences.preferredAirlines);
      score += airlineMatch ? 10 : 0;
    }

    // Airport preference scoring
    if (preferences.preferredAirports.length > 0) {
      const airportMatch = this.matchesAirportPreference(result, preferences.preferredAirports);
      score += airportMatch ? 8 : 0;
    }

    // Cabin class preference scoring
    if (preferences.preferredCabinClass) {
      const cabinMatch = this.matchesCabinClassPreference(result, preferences.preferredCabinClass);
      score += cabinMatch ? 6 : 0;
    }

    // Layover preference scoring
    if (preferences.maxLayovers !== undefined) {
      const layoverMatch = this.matchesLayoverPreference(result, preferences.maxLayovers);
      score += layoverMatch ? 4 : -2; // Penalty for exceeding max layovers
    }

    // Bonus for direct flights if user prefers fewer layovers
    if (preferences.maxLayovers <= 1 && result.layovers === 0) {
      score += 5;
    }

    return score;
  }

  /**
   * Check if flight result matches airline preferences
   */
  private matchesAirlinePreference(result: FlightResult, preferredAirlines: string[]): boolean {
    if (!result.route || result.route.length === 0) return false;
    
    // Check if any segment uses a preferred airline
    return result.route.some(segment => 
      preferredAirlines.includes(segment.airline) ||
      preferredAirlines.includes(segment.operatingAirline || segment.airline)
    );
  }

  /**
   * Check if flight result matches airport preferences
   */
  private matchesAirportPreference(result: FlightResult, preferredAirports: string[]): boolean {
    if (!result.route || result.route.length === 0) return false;

    // Check if origin, destination, or any layover airport is preferred
    const allAirports = result.route.flatMap(segment => [segment.origin, segment.destination]);
    return allAirports.some(airport => preferredAirports.includes(airport));
  }

  /**
   * Check if flight result matches cabin class preference
   */
  private matchesCabinClassPreference(result: FlightResult, preferredCabinClass: string): boolean {
    if (!result.route || result.route.length === 0) return false;

    // Since cabin class is not stored in segments, we'll use booking class as a proxy
    // J/F = business/first, Y/M/B/H = economy, W/P = premium economy
    const cabinClassMap: { [key: string]: string } = {
      'J': 'business', 'C': 'business', 'D': 'business',
      'F': 'first', 'A': 'first',
      'W': 'premium', 'P': 'premium',
      'Y': 'economy', 'M': 'economy', 'B': 'economy', 'H': 'economy', 'K': 'economy', 'L': 'economy'
    };

    // Check booking class from availability info
    const bookingClass = result.availability.bookingClass;
    const inferredCabinClass = cabinClassMap[bookingClass] || 'economy';
    
    return inferredCabinClass === preferredCabinClass;
  }

  /**
   * Check if flight result matches layover preference
   */
  private matchesLayoverPreference(result: FlightResult, maxLayovers: number): boolean {
    return result.layovers <= maxLayovers;
  }

  /**
   * Get preference-based recommendations for search criteria
   */
  async getSearchRecommendations(preferences: TravelPreferences | null): Promise<{
    recommendedAirlines: string[];
    recommendedAirports: string[];
    recommendedCabinClass: string;
    recommendedMaxLayovers: number;
  }> {
    if (!preferences) {
      return {
        recommendedAirlines: [],
        recommendedAirports: [],
        recommendedCabinClass: 'economy',
        recommendedMaxLayovers: 2,
      };
    }

    return {
      recommendedAirlines: preferences.preferredAirlines,
      recommendedAirports: preferences.preferredAirports,
      recommendedCabinClass: preferences.preferredCabinClass,
      recommendedMaxLayovers: preferences.maxLayovers,
    };
  }

  /**
   * Analyze user's booking history to suggest preference updates
   */
  async analyzeBookingPatterns(bookingHistory: any[]): Promise<{
    suggestedAirlines: string[];
    suggestedAirports: string[];
    suggestedCabinClass: string;
    suggestedMaxLayovers: number;
    confidence: number;
  }> {
    if (!bookingHistory || bookingHistory.length === 0) {
      return {
        suggestedAirlines: [],
        suggestedAirports: [],
        suggestedCabinClass: 'economy',
        suggestedMaxLayovers: 2,
        confidence: 0,
      };
    }

    // Analyze airline frequency
    const airlineFrequency: { [key: string]: number } = {};
    const airportFrequency: { [key: string]: number } = {};
    const cabinClassFrequency: { [key: string]: number } = {};
    const layoverCounts: number[] = [];

    bookingHistory.forEach(booking => {
      if (booking.flightDetails && booking.flightDetails.route) {
        booking.flightDetails.route.forEach((segment: any) => {
          // Count airlines
          const airline = segment.airline || segment.operatingAirline;
          if (airline) {
            airlineFrequency[airline] = (airlineFrequency[airline] || 0) + 1;
          }

          // Count airports
          if (segment.origin) {
            airportFrequency[segment.origin] = (airportFrequency[segment.origin] || 0) + 1;
          }
          if (segment.destination) {
            airportFrequency[segment.destination] = (airportFrequency[segment.destination] || 0) + 1;
          }

          // Count cabin classes
          if (segment.cabinClass) {
            cabinClassFrequency[segment.cabinClass] = (cabinClassFrequency[segment.cabinClass] || 0) + 1;
          }
        });

        // Count layovers
        if (booking.flightDetails.layovers !== undefined) {
          layoverCounts.push(booking.flightDetails.layovers);
        }
      }
    });

    // Get top preferences
    const suggestedAirlines = Object.entries(airlineFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([airline]) => airline);

    const suggestedAirports = Object.entries(airportFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([airport]) => airport);

    const suggestedCabinClass = Object.entries(cabinClassFrequency)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'economy';

    const avgLayovers = layoverCounts.length > 0 
      ? Math.round(layoverCounts.reduce((sum, count) => sum + count, 0) / layoverCounts.length)
      : 2;

    // Calculate confidence based on booking history size
    const confidence = Math.min(bookingHistory.length / 10, 1); // Max confidence at 10+ bookings

    return {
      suggestedAirlines,
      suggestedAirports,
      suggestedCabinClass,
      suggestedMaxLayovers: avgLayovers,
      confidence,
    };
  }
}