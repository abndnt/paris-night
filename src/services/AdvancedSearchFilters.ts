import { FlightResult, SearchCriteria } from '../models/FlightSearch';
import { logger } from '../utils/logger';

export interface PowerUserFilters {
  // Aircraft and airline preferences
  aircraftTypes?: string[]; // e.g., ['A350', 'B787', '777']
  excludeAircraftTypes?: string[];
  operatingAirlines?: string[]; // Different from marketing airline
  excludeOperatingAirlines?: string[];
  alliancePreference?: 'star-alliance' | 'oneworld' | 'skyteam';
  
  // Timing constraints
  departureTimeWindows?: TimeWindow[];
  arrivalTimeWindows?: TimeWindow[];
  maxTotalTravelTime?: number; // in minutes
  minLayoverTime?: number; // in minutes
  maxLayoverTime?: number; // in minutes
  preferredLayoverAirports?: string[];
  avoidLayoverAirports?: string[];
  
  // Routing preferences
  maxSegments?: number;
  directFlightsOnly?: boolean;
  avoidRedEyes?: boolean; // Flights departing 10PM-6AM
  preferDaytimeFlights?: boolean;
  maxBacktrackingDistance?: number; // in miles
  
  // Fare and booking class
  fareBasisCodes?: string[];
  bookingClasses?: string[]; // Y, J, F, etc.
  refundableOnly?: boolean;
  changeableOnly?: boolean;
  advancePurchaseRequirement?: number; // days
  
  // Points and miles
  awardAvailabilityOnly?: boolean;
  specificRewardPrograms?: string[];
  maxPointsRequired?: number;
  preferCashOverPoints?: boolean;
  
  // Seat and service preferences
  wifiRequired?: boolean;
  mealServiceRequired?: boolean;
  entertainmentRequired?: boolean;
  powerOutletsRequired?: boolean;
  lieFlat?: boolean; // For business/first class
  
  // Environmental and sustainability
  fuelEfficientAircraftOnly?: boolean;
  carbonOffsetAvailable?: boolean;
  sustainableAviationFuel?: boolean;
  
  // Advanced routing
  allowPositioning?: boolean;
  allowStopovers?: boolean;
  allowOpenJaw?: boolean;
  multiCityOptimization?: boolean;
}

export interface TimeWindow {
  start: string; // HH:MM format
  end: string;   // HH:MM format
  timezone?: string;
}

export interface FilterResult {
  originalCount: number;
  filteredCount: number;
  removedByFilter: Record<string, number>;
  appliedFilters: string[];
  warnings: string[];
  suggestions: string[];
}

export interface AircraftInfo {
  type: string;
  manufacturer: string;
  wifiAvailable: boolean;
  entertainmentSystem: boolean;
  powerOutlets: boolean;
  lieFlat: boolean;
  fuelEfficient: boolean;
}

export interface AirlineInfo {
  code: string;
  name: string;
  alliance: 'star-alliance' | 'oneworld' | 'skyteam' | 'none';
  operatesFor: string[]; // Airlines this carrier operates flights for
}

export class AdvancedSearchFilters {
  private readonly AIRCRAFT_DATABASE: Record<string, AircraftInfo> = {
    'A350': {
      type: 'A350',
      manufacturer: 'Airbus',
      wifiAvailable: true,
      entertainmentSystem: true,
      powerOutlets: true,
      lieFlat: true,
      fuelEfficient: true
    },
    'B787': {
      type: 'B787',
      manufacturer: 'Boeing',
      wifiAvailable: true,
      entertainmentSystem: true,
      powerOutlets: true,
      lieFlat: true,
      fuelEfficient: true
    },
    '777': {
      type: '777',
      manufacturer: 'Boeing',
      wifiAvailable: true,
      entertainmentSystem: true,
      powerOutlets: true,
      lieFlat: false,
      fuelEfficient: false
    },
    'A320': {
      type: 'A320',
      manufacturer: 'Airbus',
      wifiAvailable: false,
      entertainmentSystem: false,
      powerOutlets: false,
      lieFlat: false,
      fuelEfficient: true
    }
  };

  private readonly AIRLINE_DATABASE: Record<string, AirlineInfo> = {
    'AA': {
      code: 'AA',
      name: 'American Airlines',
      alliance: 'oneworld',
      operatesFor: ['AA', 'US']
    },
    'DL': {
      code: 'DL',
      name: 'Delta Air Lines',
      alliance: 'skyteam',
      operatesFor: ['DL', 'NW']
    },
    'UA': {
      code: 'UA',
      name: 'United Airlines',
      alliance: 'star-alliance',
      operatesFor: ['UA', 'CO']
    },
    'BA': {
      code: 'BA',
      name: 'British Airways',
      alliance: 'oneworld',
      operatesFor: ['BA']
    },
    'LH': {
      code: 'LH',
      name: 'Lufthansa',
      alliance: 'star-alliance',
      operatesFor: ['LH']
    }
  };

  /**
   * Apply advanced filters to flight results
   */
  async applyAdvancedFilters(
    flights: FlightResult[],
    filters: PowerUserFilters
  ): Promise<{ filteredFlights: FlightResult[]; filterResult: FilterResult }> {
    logger.info(`Applying advanced filters to ${flights.length} flights`);

    const originalCount = flights.length;
    let filteredFlights = [...flights];
    const removedByFilter: Record<string, number> = {};
    const appliedFilters: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Aircraft type filters
    if (filters.aircraftTypes && filters.aircraftTypes.length > 0) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByAircraftTypes(filteredFlights, filters.aircraftTypes);
      removedByFilter['aircraftTypes'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Aircraft types');
    }

    if (filters.excludeAircraftTypes && filters.excludeAircraftTypes.length > 0) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.excludeAircraftTypes(filteredFlights, filters.excludeAircraftTypes);
      removedByFilter['excludeAircraftTypes'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Excluded aircraft types');
    }

    // Alliance preference
    if (filters.alliancePreference) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByAlliance(filteredFlights, filters.alliancePreference);
      removedByFilter['alliance'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Alliance preference');
    }

    // Timing filters
    if (filters.departureTimeWindows && filters.departureTimeWindows.length > 0) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByDepartureTimeWindows(filteredFlights, filters.departureTimeWindows);
      removedByFilter['departureTimeWindows'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Departure time windows');
    }

    if (filters.arrivalTimeWindows && filters.arrivalTimeWindows.length > 0) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByArrivalTimeWindows(filteredFlights, filters.arrivalTimeWindows);
      removedByFilter['arrivalTimeWindows'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Arrival time windows');
    }

    if (filters.maxTotalTravelTime) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByMaxTravelTime(filteredFlights, filters.maxTotalTravelTime);
      removedByFilter['maxTravelTime'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Maximum travel time');
    }

    // Layover filters
    if (filters.minLayoverTime || filters.maxLayoverTime) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByLayoverTime(
        filteredFlights,
        filters.minLayoverTime,
        filters.maxLayoverTime
      );
      removedByFilter['layoverTime'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Layover time constraints');
    }

    if (filters.preferredLayoverAirports && filters.preferredLayoverAirports.length > 0) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByPreferredLayoverAirports(
        filteredFlights,
        filters.preferredLayoverAirports
      );
      removedByFilter['preferredLayovers'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Preferred layover airports');
    }

    if (filters.avoidLayoverAirports && filters.avoidLayoverAirports.length > 0) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByAvoidLayoverAirports(
        filteredFlights,
        filters.avoidLayoverAirports
      );
      removedByFilter['avoidLayovers'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Avoided layover airports');
    }

    // Routing preferences
    if (filters.maxSegments) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByMaxSegments(filteredFlights, filters.maxSegments);
      removedByFilter['maxSegments'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Maximum segments');
    }

    if (filters.directFlightsOnly) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterDirectFlightsOnly(filteredFlights);
      removedByFilter['directOnly'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Direct flights only');
    }

    if (filters.avoidRedEyes) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterAvoidRedEyes(filteredFlights);
      removedByFilter['avoidRedEyes'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Avoid red-eye flights');
    }

    // Service and amenity filters
    if (filters.wifiRequired) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByWifiRequired(filteredFlights);
      removedByFilter['wifiRequired'] = beforeCount - filteredFlights.length;
      appliedFilters.push('WiFi required');
    }

    if (filters.lieFlat) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByLieFlat(filteredFlights);
      removedByFilter['lieFlat'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Lie-flat seats');
    }

    // Environmental filters
    if (filters.fuelEfficientAircraftOnly) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByFuelEfficiency(filteredFlights);
      removedByFilter['fuelEfficient'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Fuel-efficient aircraft only');
    }

    // Award availability
    if (filters.awardAvailabilityOnly) {
      const beforeCount = filteredFlights.length;
      filteredFlights = this.filterByAwardAvailability(filteredFlights);
      removedByFilter['awardAvailability'] = beforeCount - filteredFlights.length;
      appliedFilters.push('Award availability only');
    }

    // Generate warnings and suggestions
    if (filteredFlights.length === 0) {
      warnings.push('All flights filtered out. Consider relaxing some constraints.');
    } else if (filteredFlights.length < originalCount * 0.1) {
      warnings.push('Very few flights remain after filtering. Consider relaxing constraints.');
    }

    if (filters.directFlightsOnly && filteredFlights.length === 0) {
      suggestions.push('No direct flights available. Try allowing 1 stop.');
    }

    if (filters.maxTotalTravelTime && (removedByFilter['maxTravelTime'] || 0) > originalCount * 0.5) {
      suggestions.push('Travel time constraint removed many options. Consider increasing limit.');
    }

    const filterResult: FilterResult = {
      originalCount,
      filteredCount: filteredFlights.length,
      removedByFilter,
      appliedFilters,
      warnings,
      suggestions
    };

    logger.info(`Advanced filtering complete: ${originalCount} → ${filteredFlights.length} flights`);

    return { filteredFlights, filterResult };
  }

  /**
   * Get available filter options based on current flight results
   */
  getAvailableFilterOptions(flights: FlightResult[]): {
    aircraftTypes: string[];
    airlines: string[];
    layoverAirports: string[];
    alliances: string[];
    maxTravelTime: number;
    minTravelTime: number;
  } {
    const aircraftTypes = new Set<string>();
    const airlines = new Set<string>();
    const layoverAirports = new Set<string>();
    const alliances = new Set<string>();
    let maxTravelTime = 0;
    let minTravelTime = Infinity;

    flights.forEach(flight => {
      // Collect aircraft types
      flight.route.forEach(segment => {
        if (segment.aircraft) {
          aircraftTypes.add(segment.aircraft);
        }
      });

      // Collect airlines and alliances
      airlines.add(flight.airline);
      const airlineInfo = this.AIRLINE_DATABASE[flight.airline];
      if (airlineInfo) {
        alliances.add(airlineInfo.alliance);
      }

      // Collect layover airports
      if (flight.route.length > 1) {
        for (let i = 0; i < flight.route.length - 1; i++) {
          layoverAirports.add(flight.route[i]!.destination);
        }
      }

      // Track travel time range
      maxTravelTime = Math.max(maxTravelTime, flight.duration);
      minTravelTime = Math.min(minTravelTime, flight.duration);
    });

    return {
      aircraftTypes: Array.from(aircraftTypes).sort(),
      airlines: Array.from(airlines).sort(),
      layoverAirports: Array.from(layoverAirports).sort(),
      alliances: Array.from(alliances).sort(),
      maxTravelTime,
      minTravelTime
    };
  }

  /**
   * Filter by aircraft types
   */
  private filterByAircraftTypes(flights: FlightResult[], aircraftTypes: string[]): FlightResult[] {
    return flights.filter(flight =>
      flight.route.some(segment =>
        segment.aircraft && aircraftTypes.includes(segment.aircraft)
      )
    );
  }

  /**
   * Exclude aircraft types
   */
  private excludeAircraftTypes(flights: FlightResult[], excludeTypes: string[]): FlightResult[] {
    return flights.filter(flight =>
      !flight.route.some(segment =>
        segment.aircraft && excludeTypes.includes(segment.aircraft)
      )
    );
  }

  /**
   * Filter by airline alliance
   */
  private filterByAlliance(flights: FlightResult[], alliance: string): FlightResult[] {
    return flights.filter(flight => {
      const airlineInfo = this.AIRLINE_DATABASE[flight.airline];
      return airlineInfo && airlineInfo.alliance === alliance;
    });
  }

  /**
   * Filter by departure time windows
   */
  private filterByDepartureTimeWindows(flights: FlightResult[], timeWindows: TimeWindow[]): FlightResult[] {
    return flights.filter(flight => {
      const departureTime = flight.route[0]?.departureTime;
      if (!departureTime) return false;

      const timeString = departureTime.toTimeString().substring(0, 5); // HH:MM
      
      return timeWindows.some(window =>
        timeString >= window.start && timeString <= window.end
      );
    });
  }

  /**
   * Filter by arrival time windows
   */
  private filterByArrivalTimeWindows(flights: FlightResult[], timeWindows: TimeWindow[]): FlightResult[] {
    return flights.filter(flight => {
      const arrivalTime = flight.route[flight.route.length - 1]?.arrivalTime;
      if (!arrivalTime) return false;

      const timeString = arrivalTime.toTimeString().substring(0, 5); // HH:MM
      
      return timeWindows.some(window =>
        timeString >= window.start && timeString <= window.end
      );
    });
  }

  /**
   * Filter by maximum travel time
   */
  private filterByMaxTravelTime(flights: FlightResult[], maxTime: number): FlightResult[] {
    return flights.filter(flight => flight.duration <= maxTime);
  }

  /**
   * Filter by layover time constraints
   */
  private filterByLayoverTime(
    flights: FlightResult[],
    minTime?: number,
    maxTime?: number
  ): FlightResult[] {
    return flights.filter(flight => {
      if (flight.route.length <= 1) return true; // Direct flights pass

      for (let i = 0; i < flight.route.length - 1; i++) {
        const segment = flight.route[i]!;
        const nextSegment = flight.route[i + 1]!;
        
        const layoverTime = (nextSegment.departureTime.getTime() - segment.arrivalTime.getTime()) / (1000 * 60);
        
        if (minTime && layoverTime < minTime) return false;
        if (maxTime && layoverTime > maxTime) return false;
      }

      return true;
    });
  }

  /**
   * Filter by preferred layover airports
   */
  private filterByPreferredLayoverAirports(flights: FlightResult[], preferredAirports: string[]): FlightResult[] {
    return flights.filter(flight => {
      if (flight.route.length <= 1) return true; // Direct flights pass

      const layoverAirports = flight.route.slice(0, -1).map(segment => segment.destination);
      return layoverAirports.some(airport => preferredAirports.includes(airport));
    });
  }

  /**
   * Filter to avoid specific layover airports
   */
  private filterByAvoidLayoverAirports(flights: FlightResult[], avoidAirports: string[]): FlightResult[] {
    return flights.filter(flight => {
      if (flight.route.length <= 1) return true; // Direct flights pass

      const layoverAirports = flight.route.slice(0, -1).map(segment => segment.destination);
      return !layoverAirports.some(airport => avoidAirports.includes(airport));
    });
  }

  /**
   * Filter by maximum number of segments
   */
  private filterByMaxSegments(flights: FlightResult[], maxSegments: number): FlightResult[] {
    return flights.filter(flight => flight.route.length <= maxSegments);
  }

  /**
   * Filter for direct flights only
   */
  private filterDirectFlightsOnly(flights: FlightResult[]): FlightResult[] {
    return flights.filter(flight => flight.route.length === 1);
  }

  /**
   * Filter to avoid red-eye flights
   */
  private filterAvoidRedEyes(flights: FlightResult[]): FlightResult[] {
    return flights.filter(flight => {
      const departureTime = flight.route[0]?.departureTime;
      if (!departureTime) return false;

      const hour = departureTime.getHours();
      return !(hour >= 22 || hour <= 6); // Avoid 10PM-6AM departures
    });
  }

  /**
   * Filter by WiFi requirement
   */
  private filterByWifiRequired(flights: FlightResult[]): FlightResult[] {
    return flights.filter(flight =>
      flight.route.every(segment => {
        const aircraftInfo = this.AIRCRAFT_DATABASE[segment.aircraft || ''];
        return aircraftInfo && aircraftInfo.wifiAvailable;
      })
    );
  }

  /**
   * Filter by lie-flat seat requirement
   */
  private filterByLieFlat(flights: FlightResult[]): FlightResult[] {
    return flights.filter(flight =>
      flight.route.every(segment => {
        const aircraftInfo = this.AIRCRAFT_DATABASE[segment.aircraft || ''];
        return aircraftInfo && aircraftInfo.lieFlat;
      })
    );
  }

  /**
   * Filter by fuel-efficient aircraft only
   */
  private filterByFuelEfficiency(flights: FlightResult[]): FlightResult[] {
    return flights.filter(flight =>
      flight.route.every(segment => {
        const aircraftInfo = this.AIRCRAFT_DATABASE[segment.aircraft || ''];
        return aircraftInfo && aircraftInfo.fuelEfficient;
      })
    );
  }

  /**
   * Filter by award availability
   */
  private filterByAwardAvailability(flights: FlightResult[]): FlightResult[] {
    return flights.filter(flight =>
      flight.pricing.pointsOptions && flight.pricing.pointsOptions.length > 0
    );
  }

  /**
   * Generate filter recommendations based on search criteria
   */
  generateFilterRecommendations(
    _searchCriteria: SearchCriteria,
    flights: FlightResult[]
  ): string[] {
    const recommendations: string[] = [];

    // Analyze flight patterns
    const directFlights = flights.filter(f => f.route.length === 1);
    const connectingFlights = flights.filter(f => f.route.length > 1);

    if (directFlights.length > 0 && connectingFlights.length > directFlights.length * 3) {
      recommendations.push('Consider filtering for direct flights only to save time');
    }

    // Check for red-eye flights
    const redEyeFlights = flights.filter(flight => {
      const hour = flight.route[0]?.departureTime.getHours() || 0;
      return hour >= 22 || hour <= 6;
    });

    if (redEyeFlights.length > flights.length * 0.3) {
      recommendations.push('Many red-eye flights available - consider avoiding if you prefer daytime travel');
    }

    // Check for long layovers
    const longLayoverFlights = flights.filter(flight =>
      flight.layoverDuration && flight.layoverDuration > 4 * 60
    );

    if (longLayoverFlights.length > 0) {
      recommendations.push('Some flights have long layovers - consider setting maximum layover time');
    }

    // Alliance recommendations
    const airlines = [...new Set(flights.map(f => f.airline))];
    const alliances = airlines.map(airline => this.AIRLINE_DATABASE[airline]?.alliance).filter(Boolean);
    const uniqueAlliances = [...new Set(alliances)];

    if (uniqueAlliances.length > 1) {
      recommendations.push('Multiple airline alliances available - filter by alliance for status benefits');
    }

    return recommendations;
  }
}