import { Pool } from 'pg';
import { 
  FlightSearchModel, 
  FlightSearch, 
  CreateFlightSearchData, 
  UpdateFlightSearchData,
  SearchCriteria,
  FlightResult,
  SearchCriteriaSchema
} from '../models/FlightSearch';

export interface SearchFilters {
  maxPrice?: number;
  maxDuration?: number;
  maxLayovers?: number;
  preferredAirlines?: string[];
  departureTimeRange?: {
    earliest: string; // HH:MM format
    latest: string;   // HH:MM format
  };
}

export interface SearchOptions {
  includeNearbyAirports?: boolean;
  flexibleDates?: boolean;
  sortBy?: 'price' | 'duration' | 'score';
  sortOrder?: 'asc' | 'desc';
}

export class SearchService {
  private flightSearchModel: FlightSearchModel;
  private db: Pool;

  constructor(database: Pool) {
    this.db = database;
    this.flightSearchModel = new FlightSearchModel(database);
  }

  /**
   * Create a new flight search
   */
  async createFlightSearch(searchData: CreateFlightSearchData): Promise<FlightSearch> {
    try {
      // Validate search criteria
      const { error } = SearchCriteriaSchema.validate(searchData.searchCriteria);
      if (error) {
        throw new Error(`Invalid search criteria: ${error.details[0].message}`);
      }

      // Sanitize search criteria
      const sanitizedCriteria = this.sanitizeSearchCriteria(searchData.searchCriteria);
      
      const sanitizedSearchData: CreateFlightSearchData = {
        ...searchData,
        searchCriteria: sanitizedCriteria
      };

      return await this.flightSearchModel.createSearch(sanitizedSearchData);
    } catch (error) {
      throw new Error(`Failed to create flight search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a flight search by ID
   */
  async getFlightSearch(searchId: string): Promise<FlightSearch | null> {
    try {
      if (!this.isValidUUID(searchId)) {
        throw new Error('Invalid search ID format');
      }

      return await this.flightSearchModel.getSearch(searchId);
    } catch (error) {
      throw new Error(`Failed to get flight search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a flight search with results
   */
  async updateFlightSearch(searchId: string, updateData: UpdateFlightSearchData): Promise<FlightSearch | null> {
    try {
      if (!this.isValidUUID(searchId)) {
        throw new Error('Invalid search ID format');
      }

      // Sanitize results if provided
      if (updateData.results) {
        updateData.results = this.sanitizeFlightResults(updateData.results);
      }

      return await this.flightSearchModel.updateSearch(searchId, updateData);
    } catch (error) {
      throw new Error(`Failed to update flight search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get flight searches for a user
   */
  async getUserFlightSearches(userId: string, limit: number = 20, offset: number = 0): Promise<FlightSearch[]> {
    try {
      if (!this.isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }

      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      if (offset < 0) {
        throw new Error('Offset must be non-negative');
      }

      return await this.flightSearchModel.getUserSearches(userId, limit, offset);
    } catch (error) {
      throw new Error(`Failed to get user flight searches: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get recent flight searches
   */
  async getRecentFlightSearches(limit: number = 50): Promise<FlightSearch[]> {
    try {
      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      return await this.flightSearchModel.getRecentSearches(limit);
    } catch (error) {
      throw new Error(`Failed to get recent flight searches: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a flight search
   */
  async deleteFlightSearch(searchId: string): Promise<boolean> {
    try {
      if (!this.isValidUUID(searchId)) {
        throw new Error('Invalid search ID format');
      }

      return await this.flightSearchModel.deleteSearch(searchId);
    } catch (error) {
      throw new Error(`Failed to delete flight search: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Filter flight results based on criteria
   */
  filterFlightResults(results: FlightResult[], filters: SearchFilters): FlightResult[] {
    return results.filter(result => {
      // Price filter
      if (filters.maxPrice && result.pricing.totalPrice > filters.maxPrice) {
        return false;
      }

      // Duration filter
      if (filters.maxDuration && result.duration > filters.maxDuration) {
        return false;
      }

      // Layovers filter
      if (filters.maxLayovers !== undefined && result.layovers > filters.maxLayovers) {
        return false;
      }

      // Preferred airlines filter
      if (filters.preferredAirlines && filters.preferredAirlines.length > 0) {
        if (!filters.preferredAirlines.includes(result.airline)) {
          return false;
        }
      }

      // Departure time filter
      if (filters.departureTimeRange && result.route.length > 0) {
        const departureTime = result.route[0].departureTime;
        const timeString = departureTime.toTimeString().substring(0, 5); // HH:MM format
        
        if (timeString < filters.departureTimeRange.earliest || 
            timeString > filters.departureTimeRange.latest) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort flight results
   */
  sortFlightResults(results: FlightResult[], sortBy: 'price' | 'duration' | 'score' = 'price', sortOrder: 'asc' | 'desc' = 'asc'): FlightResult[] {
    return [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'price':
          comparison = a.pricing.totalPrice - b.pricing.totalPrice;
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'score':
          comparison = (b.score || 0) - (a.score || 0); // Higher score is better
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Clean up expired searches
   */
  async cleanupExpiredSearches(): Promise<number> {
    try {
      return await this.flightSearchModel.deleteExpiredSearches();
    } catch (error) {
      throw new Error(`Failed to cleanup expired searches: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate search criteria and suggest corrections
   */
  validateAndSuggestCorrections(criteria: SearchCriteria): { isValid: boolean; errors: string[]; suggestions: string[] } {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Validate airport codes
    if (!this.isValidAirportCode(criteria.origin)) {
      errors.push('Invalid origin airport code');
      suggestions.push('Origin must be a valid 3-letter IATA airport code (e.g., JFK, LAX, LHR)');
    }

    if (!this.isValidAirportCode(criteria.destination)) {
      errors.push('Invalid destination airport code');
      suggestions.push('Destination must be a valid 3-letter IATA airport code (e.g., JFK, LAX, LHR)');
    }

    if (criteria.origin === criteria.destination) {
      errors.push('Origin and destination cannot be the same');
    }

    // Validate dates
    const now = new Date();
    const departureDate = new Date(criteria.departureDate);
    
    if (departureDate <= now) {
      errors.push('Departure date must be in the future');
      suggestions.push('Please select a departure date that is at least tomorrow');
    }

    if (criteria.returnDate) {
      const returnDate = new Date(criteria.returnDate);
      if (returnDate <= departureDate) {
        errors.push('Return date must be after departure date');
      }
    }

    // Validate passenger counts
    const totalPassengers = criteria.passengers.adults + criteria.passengers.children + criteria.passengers.infants;
    if (totalPassengers > 9) {
      errors.push('Total passengers cannot exceed 9');
      suggestions.push('For groups larger than 9, please make separate bookings');
    }

    if (criteria.passengers.infants > criteria.passengers.adults) {
      errors.push('Number of infants cannot exceed number of adults');
      suggestions.push('Each infant must be accompanied by an adult');
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }

  /**
   * Sanitize search criteria to prevent injection attacks
   */
  private sanitizeSearchCriteria(criteria: SearchCriteria): SearchCriteria {
    return {
      origin: criteria.origin.toUpperCase().trim().substring(0, 3),
      destination: criteria.destination.toUpperCase().trim().substring(0, 3),
      departureDate: new Date(criteria.departureDate),
      returnDate: criteria.returnDate ? new Date(criteria.returnDate) : undefined,
      passengers: {
        adults: Math.max(1, Math.min(9, Math.floor(criteria.passengers.adults))),
        children: Math.max(0, Math.min(8, Math.floor(criteria.passengers.children))),
        infants: Math.max(0, Math.min(2, Math.floor(criteria.passengers.infants)))
      },
      cabinClass: criteria.cabinClass,
      flexible: Boolean(criteria.flexible)
    };
  }

  /**
   * Sanitize flight results
   */
  private sanitizeFlightResults(results: FlightResult[]): FlightResult[] {
    return results.map(result => ({
      ...result,
      id: result.id.toString(),
      airline: result.airline.substring(0, 50),
      flightNumber: result.flightNumber.substring(0, 20),
      duration: Math.max(0, Math.floor(result.duration)),
      layovers: Math.max(0, Math.floor(result.layovers)),
      layoverDuration: result.layoverDuration ? Math.max(0, Math.floor(result.layoverDuration)) : undefined,
      score: result.score ? Math.max(0, Math.min(100, result.score)) : undefined
    }));
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate airport code format
   */
  private isValidAirportCode(code: string): boolean {
    return /^[A-Z]{3}$/.test(code);
  }
}