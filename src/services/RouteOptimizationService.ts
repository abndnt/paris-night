import { SearchCriteria, FlightResult, FlightSegment } from '../models/FlightSearch';
import { logger } from '../utils/logger';

export interface MultiCitySearchCriteria {
  cities: string[]; // Array of airport codes in order
  departureDate: Date;
  returnDate?: Date;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  cabinClass: 'economy' | 'premium' | 'business' | 'first';
  flexible: boolean;
  maxLayoverTime?: number; // in minutes
  minLayoverTime?: number; // in minutes
}

export interface PositioningFlightSuggestion {
  originalSearch: SearchCriteria;
  positioningFlight: FlightResult;
  mainFlight: FlightResult;
  totalCost: number;
  totalTime: number;
  savings: number;
  feasible: boolean;
  reason?: string;
}

export interface StopoverOption {
  city: string;
  minStayDuration: number; // in hours
  maxStayDuration: number; // in hours
  additionalCost: number;
  availableActivities?: string[];
}

export interface OpenJawItinerary {
  outboundOrigin: string;
  outboundDestination: string;
  returnOrigin: string;
  returnDestination: string;
  outboundFlight: FlightResult;
  returnFlight: FlightResult;
  groundTransport?: {
    method: 'train' | 'bus' | 'car' | 'flight';
    duration: number;
    cost: number;
  };
  totalCost: number;
  feasible: boolean;
}

export interface RouteOptimizationOptions {
  considerPositioning: boolean;
  maxPositioningDetour: number; // in miles
  allowStopovers: boolean;
  maxStopoverDuration: number; // in hours
  considerOpenJaw: boolean;
  maxGroundTransportTime: number; // in hours
  prioritizeTime: boolean;
  prioritizeCost: boolean;
  prioritizePoints: boolean;
}

export interface OptimizedRoute {
  originalCriteria: SearchCriteria;
  optimizedFlights: FlightResult[];
  routeType: 'direct' | 'multi-city' | 'positioning' | 'stopover' | 'open-jaw';
  totalCost: number;
  totalTime: number;
  pointsRequired?: number;
  savings: number;
  optimizationScore: number;
  recommendations: string[];
  alternatives: OptimizedRoute[];
}

export class RouteOptimizationService {
  private readonly POSITIONING_THRESHOLD_SAVINGS = 100; // Minimum savings to suggest positioning
  private readonly MAX_POSITIONING_DETOUR_MILES = 500;
  private readonly MIN_LAYOVER_TIME = 60; // 1 hour minimum
  private readonly MAX_LAYOVER_TIME = 1440; // 24 hours maximum
  private readonly STOPOVER_MIN_DURATION = 4; // 4 hours minimum for stopover
  private readonly MAJOR_HUBS = [
    'JFK', 'LAX', 'ORD', 'DFW', 'ATL', 'DEN', 'SFO', 'SEA', 'MIA', 'BOS',
    'LHR', 'CDG', 'FRA', 'AMS', 'ZUR', 'NRT', 'ICN', 'SIN', 'DXB', 'DOH'
  ];

  /**
   * Optimize a route using various strategies
   */
  async optimizeRoute(
    searchCriteria: SearchCriteria,
    availableFlights: FlightResult[],
    options: RouteOptimizationOptions
  ): Promise<OptimizedRoute> {
    logger.info(`Starting route optimization for ${searchCriteria.origin} to ${searchCriteria.destination}`);

    const alternatives: OptimizedRoute[] = [];
    
    // Direct route (baseline)
    const directRoute = this.createDirectRoute(searchCriteria, availableFlights);
    
    // Try positioning flights if enabled
    if (options.considerPositioning) {
      const positioningOptions = await this.findPositioningFlights(
        searchCriteria,
        availableFlights,
        options.maxPositioningDetour
      );
      
      for (const positioning of positioningOptions) {
        if (positioning.feasible && positioning.savings >= this.POSITIONING_THRESHOLD_SAVINGS) {
          alternatives.push(this.createPositioningRoute(positioning));
        }
      }
    }

    // Try stopover options if enabled
    if (options.allowStopovers) {
      const stopoverOptions = await this.findStopoverOptions(
        searchCriteria,
        availableFlights,
        options.maxStopoverDuration
      );
      
      for (const stopover of stopoverOptions) {
        alternatives.push(this.createStopoverRoute(searchCriteria, stopover, availableFlights));
      }
    }

    // Try open-jaw options if enabled
    if (options.considerOpenJaw && searchCriteria.returnDate) {
      const openJawOptions = await this.findOpenJawOptions(
        searchCriteria,
        availableFlights,
        options.maxGroundTransportTime
      );
      
      for (const openJaw of openJawOptions) {
        if (openJaw.feasible) {
          alternatives.push(this.createOpenJawRoute(openJaw));
        }
      }
    }

    // Score and rank all alternatives
    const allRoutes = [directRoute, ...alternatives];
    const scoredRoutes = allRoutes.map(route => ({
      ...route,
      optimizationScore: this.calculateOptimizationScore(route, options)
    }));

    // Sort by optimization score
    scoredRoutes.sort((a, b) => b.optimizationScore - a.optimizationScore);

    const bestRoute = scoredRoutes[0]!;
    bestRoute.alternatives = scoredRoutes.slice(1);

    logger.info(`Route optimization completed. Best route type: ${bestRoute.routeType}, Score: ${bestRoute.optimizationScore}`);

    return bestRoute;
  }

  /**
   * Find positioning flight opportunities
   */
  async findPositioningFlights(
    searchCriteria: SearchCriteria,
    availableFlights: FlightResult[],
    maxDetourMiles: number = this.MAX_POSITIONING_DETOUR_MILES
  ): Promise<PositioningFlightSuggestion[]> {
    const suggestions: PositioningFlightSuggestion[] = [];
    
    // Get nearby airports within detour range
    const nearbyOrigins = this.getNearbyAirports(searchCriteria.origin, maxDetourMiles);
    const nearbyDestinations = this.getNearbyAirports(searchCriteria.destination, maxDetourMiles);

    for (const altOrigin of nearbyOrigins) {
      for (const altDestination of nearbyDestinations) {
        if (altOrigin === searchCriteria.origin && altDestination === searchCriteria.destination) {
          continue; // Skip original route
        }

        // Find positioning flight to alternative origin
        const positioningFlight = this.findBestPositioningFlight(
          searchCriteria.origin,
          altOrigin,
          searchCriteria.departureDate,
          availableFlights
        );

        // Find main flight from alternative origin to alternative destination
        const mainFlight = this.findBestMainFlight(
          altOrigin,
          altDestination,
          searchCriteria,
          availableFlights
        );

        if (positioningFlight && mainFlight) {
          const originalCost = this.getDirectFlightCost(searchCriteria, availableFlights);
          const totalCost = positioningFlight.pricing.totalPrice + mainFlight.pricing.totalPrice;
          const savings = originalCost - totalCost;

          suggestions.push({
            originalSearch: searchCriteria,
            positioningFlight,
            mainFlight,
            totalCost,
            totalTime: positioningFlight.duration + mainFlight.duration,
            savings,
            feasible: savings > 0 && this.isTimingFeasible(positioningFlight, mainFlight),
            reason: savings <= 0 ? 'No cost savings' : undefined
          });
        }
      }
    }

    return suggestions.filter(s => s.feasible).sort((a, b) => b.savings - a.savings);
  }

  /**
   * Find stopover opportunities
   */
  async findStopoverOptions(
    searchCriteria: SearchCriteria,
    availableFlights: FlightResult[],
    maxStopoverHours: number
  ): Promise<StopoverOption[]> {
    const stopovers: StopoverOption[] = [];

    // Find flights with long layovers that could be extended to stopovers
    const connectingFlights = availableFlights.filter(flight => 
      flight.route.length > 1 && 
      flight.layoverDuration && 
      flight.layoverDuration >= this.STOPOVER_MIN_DURATION * 60
    );

    for (const flight of connectingFlights) {
      for (let i = 0; i < flight.route.length - 1; i++) {
        const segment = flight.route[i]!;
        const nextSegment = flight.route[i + 1]!;
        
        const layoverTime = (nextSegment.departureTime.getTime() - segment.arrivalTime.getTime()) / (1000 * 60);
        
        if (layoverTime >= this.STOPOVER_MIN_DURATION * 60 && layoverTime <= maxStopoverHours * 60) {
          const stopoverCity = segment.destination;
          
          if (this.MAJOR_HUBS.includes(stopoverCity)) {
            stopovers.push({
              city: stopoverCity,
              minStayDuration: Math.max(this.STOPOVER_MIN_DURATION, layoverTime / 60),
              maxStayDuration: Math.min(maxStopoverHours, 72), // Max 3 days
              additionalCost: this.calculateStopoverCost(stopoverCity),
              availableActivities: this.getStopoverActivities(stopoverCity)
            });
          }
        }
      }
    }

    return stopovers;
  }

  /**
   * Find open-jaw routing opportunities
   */
  async findOpenJawOptions(
    searchCriteria: SearchCriteria,
    availableFlights: FlightResult[],
    maxGroundTransportHours: number
  ): Promise<OpenJawItinerary[]> {
    if (!searchCriteria.returnDate) {
      return [];
    }

    const openJawOptions: OpenJawItinerary[] = [];
    const nearbyDestinations = this.getNearbyAirports(searchCriteria.destination, 200);

    for (const altDestination of nearbyDestinations) {
      if (altDestination === searchCriteria.destination) continue;

      // Find outbound flight to alternative destination
      const outboundFlight = availableFlights.find(flight =>
        flight.route[0]?.origin === searchCriteria.origin &&
        flight.route[flight.route.length - 1]?.destination === altDestination
      );

      // Find return flight from original destination
      const returnFlight = availableFlights.find(flight =>
        flight.route[0]?.origin === searchCriteria.destination &&
        flight.route[flight.route.length - 1]?.destination === searchCriteria.origin
      );

      if (outboundFlight && returnFlight) {
        const groundTransport = this.calculateGroundTransport(
          altDestination,
          searchCriteria.destination,
          maxGroundTransportHours
        );

        if (groundTransport && groundTransport.duration <= maxGroundTransportHours) {
          const totalCost = outboundFlight.pricing.totalPrice + 
                           returnFlight.pricing.totalPrice + 
                           groundTransport.cost;

          openJawOptions.push({
            outboundOrigin: searchCriteria.origin,
            outboundDestination: altDestination,
            returnOrigin: searchCriteria.destination,
            returnDestination: searchCriteria.origin,
            outboundFlight,
            returnFlight,
            groundTransport,
            totalCost,
            feasible: true
          });
        }
      }
    }

    return openJawOptions.filter(option => option.feasible);
  }

  /**
   * Optimize multi-city itineraries
   */
  async optimizeMultiCityRoute(
    criteria: MultiCitySearchCriteria,
    availableFlights: FlightResult[]
  ): Promise<OptimizedRoute> {
    logger.info(`Optimizing multi-city route for ${criteria.cities.length} cities`);

    const segments: FlightResult[] = [];
    let totalCost = 0;
    let totalTime = 0;

    // Find optimal flights for each segment
    for (let i = 0; i < criteria.cities.length - 1; i++) {
      const origin = criteria.cities[i]!;
      const destination = criteria.cities[i + 1]!;

      const segmentFlights = availableFlights.filter(flight =>
        flight.route[0]?.origin === origin &&
        flight.route[flight.route.length - 1]?.destination === destination
      );

      if (segmentFlights.length === 0) {
        throw new Error(`No flights available from ${origin} to ${destination}`);
      }

      // Select best flight for this segment
      const bestFlight = this.selectBestSegmentFlight(segmentFlights, criteria);
      segments.push(bestFlight);
      totalCost += bestFlight.pricing.totalPrice;
      totalTime += bestFlight.duration;
    }

    // Calculate savings compared to individual bookings
    const individualCosts = segments.reduce((sum, flight) => sum + flight.pricing.totalPrice, 0);
    const savings = individualCosts - totalCost;

    return {
      originalCriteria: this.convertMultiCityToSearchCriteria(criteria),
      optimizedFlights: segments,
      routeType: 'multi-city',
      totalCost,
      totalTime,
      savings,
      optimizationScore: this.calculateMultiCityScore(segments, criteria),
      recommendations: this.generateMultiCityRecommendations(segments, criteria),
      alternatives: []
    };
  }

  /**
   * Create direct route baseline
   */
  private createDirectRoute(
    searchCriteria: SearchCriteria,
    availableFlights: FlightResult[]
  ): OptimizedRoute {
    const directFlights = availableFlights.filter(flight =>
      flight.route[0]?.origin === searchCriteria.origin &&
      flight.route[flight.route.length - 1]?.destination === searchCriteria.destination
    );

    const bestDirect = directFlights.reduce((best, current) =>
      current.pricing.totalPrice < best.pricing.totalPrice ? current : best
    );

    return {
      originalCriteria: searchCriteria,
      optimizedFlights: [bestDirect],
      routeType: 'direct',
      totalCost: bestDirect.pricing.totalPrice,
      totalTime: bestDirect.duration,
      savings: 0,
      optimizationScore: 50, // Baseline score
      recommendations: ['Direct flight - fastest and simplest option'],
      alternatives: []
    };
  }

  /**
   * Calculate optimization score based on priorities
   */
  private calculateOptimizationScore(
    route: OptimizedRoute,
    options: RouteOptimizationOptions
  ): number {
    let score = 0;

    // Cost factor (0-40 points)
    if (options.prioritizeCost) {
      const costScore = Math.max(0, 40 - (route.totalCost / 100));
      score += costScore;
    }

    // Time factor (0-30 points)
    if (options.prioritizeTime) {
      const timeScore = Math.max(0, 30 - (route.totalTime / 60));
      score += timeScore;
    }

    // Points factor (0-20 points)
    if (options.prioritizePoints && route.pointsRequired) {
      const pointsScore = Math.max(0, 20 - (route.pointsRequired / 1000));
      score += pointsScore;
    }

    // Savings bonus (0-10 points)
    if (route.savings > 0) {
      score += Math.min(10, route.savings / 50);
    }

    return Math.round(score);
  }

  /**
   * Get nearby airports within specified distance
   */
  private getNearbyAirports(airportCode: string, maxDistanceMiles: number): string[] {
    // This would typically query a database of airport distances
    // For now, return some common nearby airports for major hubs
    const nearbyMap: Record<string, string[]> = {
      'JFK': ['LGA', 'EWR'],
      'LAX': ['BUR', 'LGB', 'SNA'],
      'ORD': ['MDW'],
      'DFW': ['DAL'],
      'SFO': ['SJC', 'OAK'],
      'LHR': ['LGW', 'STN', 'LTN'],
      'CDG': ['ORY'],
      'NRT': ['HND']
    };

    return [airportCode, ...(nearbyMap[airportCode] || [])];
  }

  /**
   * Find best positioning flight
   */
  private findBestPositioningFlight(
    origin: string,
    destination: string,
    departureDate: Date,
    availableFlights: FlightResult[]
  ): FlightResult | null {
    const positioningFlights = availableFlights.filter(flight =>
      flight.route[0]?.origin === origin &&
      flight.route[flight.route.length - 1]?.destination === destination
    );

    if (positioningFlights.length === 0) return null;

    return positioningFlights.reduce((best, current) =>
      current.pricing.totalPrice < best.pricing.totalPrice ? current : best
    );
  }

  /**
   * Find best main flight for positioning strategy
   */
  private findBestMainFlight(
    origin: string,
    destination: string,
    searchCriteria: SearchCriteria,
    availableFlights: FlightResult[]
  ): FlightResult | null {
    const mainFlights = availableFlights.filter(flight =>
      flight.route[0]?.origin === origin &&
      flight.route[flight.route.length - 1]?.destination === destination
    );

    if (mainFlights.length === 0) return null;

    return mainFlights.reduce((best, current) =>
      current.pricing.totalPrice < best.pricing.totalPrice ? current : best
    );
  }

  /**
   * Get direct flight cost for comparison
   */
  private getDirectFlightCost(
    searchCriteria: SearchCriteria,
    availableFlights: FlightResult[]
  ): number {
    const directFlights = availableFlights.filter(flight =>
      flight.route[0]?.origin === searchCriteria.origin &&
      flight.route[flight.route.length - 1]?.destination === searchCriteria.destination
    );

    if (directFlights.length === 0) return Infinity;

    return Math.min(...directFlights.map(f => f.pricing.totalPrice));
  }

  /**
   * Check if timing between flights is feasible
   */
  private isTimingFeasible(
    positioningFlight: FlightResult,
    mainFlight: FlightResult
  ): boolean {
    const positioningArrival = positioningFlight.route[positioningFlight.route.length - 1]!.arrivalTime;
    const mainDeparture = mainFlight.route[0]!.departureTime;
    
    const layoverTime = (mainDeparture.getTime() - positioningArrival.getTime()) / (1000 * 60);
    
    return layoverTime >= this.MIN_LAYOVER_TIME && layoverTime <= this.MAX_LAYOVER_TIME;
  }

  /**
   * Calculate additional cost for stopover
   */
  private calculateStopoverCost(city: string): number {
    // Base cost for extending layover to stopover
    const baseCost = 50;
    
    // City-specific multipliers
    const cityMultipliers: Record<string, number> = {
      'LHR': 1.5, 'CDG': 1.4, 'FRA': 1.3, 'AMS': 1.2,
      'NRT': 1.6, 'ICN': 1.3, 'SIN': 1.4, 'DXB': 1.5
    };

    return baseCost * (cityMultipliers[city] || 1.0);
  }

  /**
   * Get available activities for stopover city
   */
  private getStopoverActivities(city: string): string[] {
    const activities: Record<string, string[]> = {
      'LHR': ['London city tour', 'Museums', 'Shopping'],
      'CDG': ['Paris city center', 'Louvre', 'Eiffel Tower'],
      'AMS': ['Canal cruise', 'Museums', 'City center'],
      'NRT': ['Tokyo city tour', 'Traditional temples', 'Shopping'],
      'ICN': ['Seoul city tour', 'Palaces', 'Shopping'],
      'SIN': ['City tour', 'Gardens by the Bay', 'Shopping'],
      'DXB': ['Dubai Mall', 'Burj Khalifa', 'Desert safari']
    };

    return activities[city] || ['City tour', 'Local attractions'];
  }

  /**
   * Calculate ground transport options
   */
  private calculateGroundTransport(
    from: string,
    to: string,
    maxHours: number
  ): { method: 'train' | 'bus' | 'car' | 'flight'; duration: number; cost: number; } | null {
    // This would typically query a transport database
    // For now, return estimated values for common routes
    const routes: Record<string, Record<string, any>> = {
      'LGW': {
        'LHR': { method: 'train', duration: 1.5, cost: 25 }
      },
      'ORY': {
        'CDG': { method: 'train', duration: 1, cost: 15 }
      },
      'SJC': {
        'SFO': { method: 'car', duration: 1, cost: 30 }
      }
    };

    const route = routes[from]?.[to];
    if (!route || route.duration > maxHours) {
      return null;
    }

    return route;
  }

  /**
   * Create positioning route result
   */
  private createPositioningRoute(positioning: PositioningFlightSuggestion): OptimizedRoute {
    return {
      originalCriteria: positioning.originalSearch,
      optimizedFlights: [positioning.positioningFlight, positioning.mainFlight],
      routeType: 'positioning',
      totalCost: positioning.totalCost,
      totalTime: positioning.totalTime,
      savings: positioning.savings,
      optimizationScore: 0, // Will be calculated later
      recommendations: [
        `Save $${positioning.savings} with positioning flight`,
        'Requires additional travel time but significant savings'
      ],
      alternatives: []
    };
  }

  /**
   * Create stopover route result
   */
  private createStopoverRoute(
    searchCriteria: SearchCriteria,
    stopover: StopoverOption,
    availableFlights: FlightResult[]
  ): OptimizedRoute {
    // Find flight with stopover
    const stopoverFlight = availableFlights.find(flight =>
      flight.route.some(segment => segment.destination === stopover.city)
    );

    if (!stopoverFlight) {
      throw new Error(`No flight found with stopover in ${stopover.city}`);
    }

    return {
      originalCriteria: searchCriteria,
      optimizedFlights: [stopoverFlight],
      routeType: 'stopover',
      totalCost: stopoverFlight.pricing.totalPrice + stopover.additionalCost,
      totalTime: stopoverFlight.duration + (stopover.minStayDuration * 60),
      savings: -stopover.additionalCost, // Negative because it costs more
      optimizationScore: 0,
      recommendations: [
        `Explore ${stopover.city} during your journey`,
        `Activities: ${stopover.availableActivities?.join(', ')}`
      ],
      alternatives: []
    };
  }

  /**
   * Create open-jaw route result
   */
  private createOpenJawRoute(openJaw: OpenJawItinerary): OptimizedRoute {
    return {
      originalCriteria: {
        origin: openJaw.outboundOrigin,
        destination: openJaw.outboundDestination,
        departureDate: openJaw.outboundFlight.route[0]!.departureTime,
        returnDate: openJaw.returnFlight.route[0]!.departureTime,
        passengers: { adults: 1, children: 0, infants: 0 },
        cabinClass: 'economy',
        flexible: false
      },
      optimizedFlights: [openJaw.outboundFlight, openJaw.returnFlight],
      routeType: 'open-jaw',
      totalCost: openJaw.totalCost,
      totalTime: openJaw.outboundFlight.duration + openJaw.returnFlight.duration + (openJaw.groundTransport?.duration || 0) * 60,
      savings: 0, // Would need to calculate vs round-trip
      optimizationScore: 0,
      recommendations: [
        'Open-jaw routing allows flexible ground travel',
        `Ground transport: ${openJaw.groundTransport?.method} (${openJaw.groundTransport?.duration}h)`
      ],
      alternatives: []
    };
  }

  /**
   * Select best flight for multi-city segment
   */
  private selectBestSegmentFlight(
    flights: FlightResult[],
    criteria: MultiCitySearchCriteria
  ): FlightResult {
    // Score flights based on price, time, and layovers
    return flights.reduce((best, current) => {
      const bestScore = this.calculateSegmentScore(best, criteria);
      const currentScore = this.calculateSegmentScore(current, criteria);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Calculate score for individual segment
   */
  private calculateSegmentScore(flight: FlightResult, criteria: MultiCitySearchCriteria): number {
    let score = 100;
    
    // Price factor (lower is better)
    score -= flight.pricing.totalPrice / 10;
    
    // Duration factor (shorter is better)
    score -= flight.duration / 60;
    
    // Layover factor (fewer is better)
    score -= flight.layovers * 5;
    
    return score;
  }

  /**
   * Calculate multi-city optimization score
   */
  private calculateMultiCityScore(
    segments: FlightResult[],
    criteria: MultiCitySearchCriteria
  ): number {
    let score = 70; // Base score for multi-city
    
    // Bonus for efficient routing
    const avgLayovers = segments.reduce((sum, s) => sum + s.layovers, 0) / segments.length;
    score += Math.max(0, 10 - avgLayovers * 2);
    
    // Bonus for reasonable total cost
    const totalCost = segments.reduce((sum, s) => sum + s.pricing.totalPrice, 0);
    const avgCost = totalCost / segments.length;
    if (avgCost < 500) score += 10;
    
    return Math.round(score);
  }

  /**
   * Generate recommendations for multi-city route
   */
  private generateMultiCityRecommendations(
    segments: FlightResult[],
    criteria: MultiCitySearchCriteria
  ): string[] {
    const recommendations: string[] = [];
    
    recommendations.push(`Multi-city itinerary covering ${criteria.cities.length} cities`);
    
    const totalLayovers = segments.reduce((sum, s) => sum + s.layovers, 0);
    if (totalLayovers === 0) {
      recommendations.push('All direct flights - optimal routing');
    } else {
      recommendations.push(`${totalLayovers} total layovers across all segments`);
    }
    
    const airlines = [...new Set(segments.map(s => s.airline))];
    if (airlines.length === 1) {
      recommendations.push(`Single airline (${airlines[0]}) - easier for changes and status`);
    } else {
      recommendations.push(`Multiple airlines - may require separate check-ins`);
    }
    
    return recommendations;
  }

  /**
   * Convert multi-city criteria to standard search criteria
   */
  private convertMultiCityToSearchCriteria(criteria: MultiCitySearchCriteria): SearchCriteria {
    return {
      origin: criteria.cities[0]!,
      destination: criteria.cities[criteria.cities.length - 1]!,
      departureDate: criteria.departureDate,
      returnDate: criteria.returnDate,
      passengers: criteria.passengers,
      cabinClass: criteria.cabinClass,
      flexible: criteria.flexible
    };
  }
}