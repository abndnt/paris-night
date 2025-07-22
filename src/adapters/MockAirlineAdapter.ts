import { BaseAirlineAdapter, AirlineConfig, AirlineSearchRequest, AirlineSearchResponse, AirlineApiError, RateLimiter, AirlineCache } from './BaseAirlineAdapter';
import { FlightResult, FlightSegment, PricingInfo, AvailabilityInfo } from '../models/FlightSearch';

export class MockAirlineAdapter extends BaseAirlineAdapter {
  private mockDelay: number;
  private shouldSimulateError: boolean;
  private errorRate: number;

  constructor(
    config: AirlineConfig,
    rateLimiter: RateLimiter,
    cache: AirlineCache,
    options: {
      mockDelay?: number;
      shouldSimulateError?: boolean;
      errorRate?: number;
    } = {}
  ) {
    super('mock', config, rateLimiter, cache);
    this.mockDelay = options.mockDelay || 500; // 500ms default delay
    this.shouldSimulateError = options.shouldSimulateError || false;
    this.errorRate = options.errorRate || 0.1; // 10% error rate by default
  }

  protected async makeApiRequest(request: AirlineSearchRequest): Promise<any> {
    // Simulate network delay
    await this.sleep(this.mockDelay);

    // Simulate random errors based on error rate
    if (this.shouldSimulateError && Math.random() < this.errorRate) {
      const errorTypes = [
        { status: 500, message: 'Internal Server Error' },
        { status: 429, message: 'Rate Limit Exceeded' },
        { status: 503, message: 'Service Unavailable' },
        { code: 'ETIMEDOUT', message: 'Request Timeout' }
      ];
      
      const error = errorTypes[Math.floor(Math.random() * errorTypes.length)]!;
      const mockError = new Error(error.message);
      (mockError as any).response = 'status' in error ? { status: error.status } : undefined;
      (mockError as any).code = 'code' in error ? error.code : undefined;
      
      throw mockError;
    }

    // Generate mock flight data
    return this.generateMockFlightData(request);
  }

  protected async normalizeResponse(rawResponse: any, request: AirlineSearchRequest): Promise<AirlineSearchResponse> {
    const flights: FlightResult[] = rawResponse.flights.map((flight: any) => ({
      id: flight.id,
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      route: flight.route,
      pricing: flight.pricing,
      availability: flight.availability,
      duration: flight.duration,
      layovers: flight.layovers,
      layoverDuration: flight.layoverDuration,
      score: flight.score
    }));

    return {
      requestId: request.requestId,
      flights,
      totalResults: flights.length,
      searchTime: this.mockDelay,
      currency: 'USD',
      timestamp: new Date(),
      source: this.name
    };
  }

  protected handleApiError(error: any): AirlineApiError {
    return {
      code: error.code || 'MOCK_ERROR',
      message: error.message || 'Mock airline API error',
      details: {
        status: error.response?.status,
        originalError: error.message
      },
      retryable: this.isRetryableError(error),
      timestamp: new Date()
    };
  }

  private generateMockFlightData(request: AirlineSearchRequest): any {
    const { searchCriteria } = request;
    const flights = [];
    
    // Generate 3-8 mock flights
    const numFlights = Math.floor(Math.random() * 6) + 3;
    
    for (let i = 0; i < numFlights; i++) {
      const flight = this.generateMockFlight(searchCriteria, i);
      flights.push(flight);
    }

    return { flights };
  }

  private generateMockFlight(searchCriteria: any, index: number): any {
    const airlines = ['AA', 'UA', 'DL', 'WN', 'B6', 'AS'];
    const aircraft = ['Boeing 737', 'Airbus A320', 'Boeing 777', 'Airbus A330', 'Boeing 787'];
    
    const airline = airlines[Math.floor(Math.random() * airlines.length)]!;
    const flightNumber = `${airline}${Math.floor(Math.random() * 9000) + 1000}`;
    
    // Generate departure time (random time during the day)
    const departureDate = new Date(searchCriteria.departureDate);
    departureDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
    
    // Generate flight duration (2-8 hours)
    const durationMinutes = Math.floor(Math.random() * 360) + 120;
    const arrivalTime = new Date(departureDate.getTime() + durationMinutes * 60000);
    
    // Determine if this is a direct flight or has layovers
    const hasLayover = Math.random() < 0.3; // 30% chance of layover
    const layovers = hasLayover ? 1 : 0;
    
    let route: FlightSegment[];
    
    if (hasLayover) {
      // Generate layover airport
      const layoverAirports = ['DFW', 'ATL', 'ORD', 'LAX', 'JFK', 'DEN', 'PHX'];
      const layoverAirport = layoverAirports[Math.floor(Math.random() * layoverAirports.length)] || 'DFW';
      
      const layoverDuration = Math.floor(Math.random() * 180) + 60; // 1-4 hours layover
      const firstSegmentDuration = Math.floor(durationMinutes * 0.6);
      const secondSegmentDuration = durationMinutes - firstSegmentDuration - layoverDuration;
      
      const firstArrival = new Date(departureDate.getTime() + firstSegmentDuration * 60000);
      const secondDeparture = new Date(firstArrival.getTime() + layoverDuration * 60000);
      const finalArrival = new Date(secondDeparture.getTime() + secondSegmentDuration * 60000);
      
      route = [
        {
          airline,
          flightNumber,
          origin: searchCriteria.origin,
          destination: layoverAirport,
          departureTime: departureDate,
          arrivalTime: firstArrival,
          duration: firstSegmentDuration,
          aircraft: aircraft[Math.floor(Math.random() * aircraft.length)]!
        },
        {
          airline,
          flightNumber: `${airline}${Math.floor(Math.random() * 9000) + 1000}`,
          origin: layoverAirport,
          destination: searchCriteria.destination,
          departureTime: secondDeparture,
          arrivalTime: finalArrival,
          duration: secondSegmentDuration,
          aircraft: aircraft[Math.floor(Math.random() * aircraft.length)]!
        }
      ];
    } else {
      // Direct flight
      route = [
        {
          airline,
          flightNumber,
          origin: searchCriteria.origin,
          destination: searchCriteria.destination,
          departureTime: departureDate,
          arrivalTime: arrivalTime,
          duration: durationMinutes,
          aircraft: aircraft[Math.floor(Math.random() * aircraft.length)]!
        }
      ];
    }

    // Generate pricing
    const baseCashPrice = Math.floor(Math.random() * 800) + 200; // $200-$1000
    const taxes = Math.floor(baseCashPrice * 0.15); // ~15% taxes
    const fees = Math.floor(Math.random() * 50) + 10; // $10-$60 fees
    
    const pricing: PricingInfo = {
      cashPrice: baseCashPrice,
      currency: 'USD',
      pointsOptions: [
        {
          program: 'Chase Ultimate Rewards',
          pointsRequired: Math.floor(baseCashPrice * 80), // ~1.25 cpp
          cashComponent: taxes + fees,
          transferRatio: 1.0,
          bestValue: true
        },
        {
          program: `${airline} Miles`,
          pointsRequired: Math.floor(baseCashPrice * 100), // ~1.0 cpp
          cashComponent: taxes + fees,
          transferRatio: 1.0,
          bestValue: false
        }
      ],
      taxes,
      fees,
      totalPrice: baseCashPrice + taxes + fees
    };

    // Generate availability
    const availability: AvailabilityInfo = {
      availableSeats: Math.floor(Math.random() * 9) + 1,
      bookingClass: searchCriteria.cabinClass === 'economy' ? 'Y' :
                   searchCriteria.cabinClass === 'business' ? 'J' : 'F',
      fareBasis: `${searchCriteria.cabinClass.toUpperCase()}${Math.floor(Math.random() * 9)}`
    };

    if (Math.random() < 0.5) {
      availability.restrictions = ['Non-refundable', '24hr cancellation'];
    }

    // Calculate score based on price, duration, and layovers
    const priceScore = Math.max(0, 100 - (baseCashPrice - 200) / 8); // Lower price = higher score
    const durationScore = Math.max(0, 100 - (durationMinutes - 120) / 3); // Shorter duration = higher score
    const layoverScore = layovers === 0 ? 100 : 50; // Direct flights score higher
    const score = Math.round((priceScore + durationScore + layoverScore) / 3);

    return {
      id: `mock-flight-${index + 1}`,
      airline,
      flightNumber,
      route,
      pricing,
      availability,
      duration: durationMinutes,
      layovers,
      layoverDuration: hasLayover ? route.reduce((total, segment, idx) => {
        if (idx < route.length - 1) {
          const nextSegment = route[idx + 1];
          if (nextSegment) {
            return total + (nextSegment.departureTime.getTime() - segment.arrivalTime.getTime()) / 60000;
          }
        }
        return total;
      }, 0) : undefined,
      score
    };
  }

  // Override health check for mock adapter
  override async healthCheck(): Promise<boolean> {
    // Mock adapter is always healthy unless explicitly configured otherwise
    return !this.shouldSimulateError || Math.random() > this.errorRate;
  }

  // Utility methods for testing
  setMockDelay(delay: number): void {
    this.mockDelay = delay;
  }

  setErrorSimulation(shouldSimulate: boolean, errorRate?: number): void {
    this.shouldSimulateError = shouldSimulate;
    if (errorRate !== undefined) {
      this.errorRate = errorRate;
    }
  }

  // Generate specific mock scenarios for testing
  async generateScenario(scenario: 'no-flights' | 'expensive-flights' | 'direct-only' | 'layovers-only'): Promise<any> {
    switch (scenario) {
      case 'no-flights':
        return { flights: [] };
      
      case 'expensive-flights':
        // Generate flights with high prices
        return {
          flights: Array.from({ length: 3 }, (_, i) => {
            const flight = this.generateMockFlight({
              origin: 'LAX',
              destination: 'JFK',
              departureDate: new Date(),
              cabinClass: 'economy'
            }, i);
            flight.pricing.cashPrice = Math.floor(Math.random() * 1000) + 1500; // $1500-$2500
            flight.pricing.totalPrice = flight.pricing.cashPrice + flight.pricing.taxes + flight.pricing.fees;
            return flight;
          })
        };
      
      case 'direct-only':
        // Generate only direct flights
        return {
          flights: Array.from({ length: 4 }, (_, i) => {
            const flight = this.generateMockFlight({
              origin: 'LAX',
              destination: 'JFK',
              departureDate: new Date(),
              cabinClass: 'economy'
            }, i);
            flight.layovers = 0;
            flight.route = [flight.route[0]]; // Keep only first segment
            return flight;
          })
        };
      
      case 'layovers-only':
        // Generate only flights with layovers
        return {
          flights: Array.from({ length: 3 }, (_, i) => {
            const flight = this.generateMockFlight({
              origin: 'LAX',
              destination: 'JFK',
              departureDate: new Date(),
              cabinClass: 'economy'
            }, i);
            // Ensure this flight has layovers by regenerating if it doesn't
            while (flight.layovers === 0) {
              Object.assign(flight, this.generateMockFlight({
                origin: 'LAX',
                destination: 'JFK',
                departureDate: new Date(),
                cabinClass: 'economy'
              }, i));
            }
            return flight;
          })
        };
      
      default:
        throw new Error(`Unknown scenario: ${scenario}`);
    }
  }
}