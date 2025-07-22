import { 
  RouteOptimizationService, 
  RouteOptimizationOptions,
  MultiCitySearchCriteria
} from '../services/RouteOptimizationService';
import { SearchCriteria, FlightResult } from '../models/FlightSearch';

describe('RouteOptimizationService', () => {
  let routeOptimizer: RouteOptimizationService;
  let mockSearchCriteria: SearchCriteria;
  let mockFlightResults: FlightResult[];

  beforeEach(() => {
    routeOptimizer = new RouteOptimizationService();
    
    mockSearchCriteria = {
      origin: 'JFK',
      destination: 'LAX',
      departureDate: new Date('2024-06-01T10:00:00Z'),
      passengers: { adults: 1, children: 0, infants: 0 },
      cabinClass: 'economy',
      flexible: false
    };

    mockFlightResults = [
      {
        id: '1',
        airline: 'AA',
        flightNumber: 'AA100',
        route: [{
          airline: 'AA',
          flightNumber: 'AA100',
          origin: 'JFK',
          destination: 'LAX',
          departureTime: new Date('2024-06-01T10:00:00Z'),
          arrivalTime: new Date('2024-06-01T16:00:00Z'),
          duration: 360,
          aircraft: 'A321'
        }],
        pricing: {
          cashPrice: 500,
          currency: 'USD',
          pointsOptions: [],
          taxes: 50,
          fees: 25,
          totalPrice: 575
        },
        availability: {
          availableSeats: 10,
          bookingClass: 'Y',
          fareBasis: 'Y'
        },
        duration: 360,
        layovers: 0
      },
      {
        id: '2',
        airline: 'DL',
        flightNumber: 'DL200',
        route: [
          {
            airline: 'DL',
            flightNumber: 'DL200',
            origin: 'JFK',
            destination: 'ATL',
            departureTime: new Date('2024-06-01T08:00:00Z'),
            arrivalTime: new Date('2024-06-01T11:00:00Z'),
            duration: 180,
            aircraft: 'B737'
          },
          {
            airline: 'DL',
            flightNumber: 'DL201',
            origin: 'ATL',
            destination: 'LAX',
            departureTime: new Date('2024-06-01T13:00:00Z'),
            arrivalTime: new Date('2024-06-01T15:00:00Z'),
            duration: 240,
            aircraft: 'B737'
          }
        ],
        pricing: {
          cashPrice: 450,
          currency: 'USD',
          pointsOptions: [],
          taxes: 45,
          fees: 20,
          totalPrice: 515
        },
        availability: {
          availableSeats: 15,
          bookingClass: 'Y',
          fareBasis: 'Y'
        },
        duration: 540, // Including layover
        layovers: 1,
        layoverDuration: 120
      }
    ];
  });

  describe('optimizeRoute', () => {
    it('should create a direct route baseline', async () => {
      const options: RouteOptimizationOptions = {
        considerPositioning: false,
        maxPositioningDetour: 500,
        allowStopovers: false,
        maxStopoverDuration: 24,
        considerOpenJaw: false,
        maxGroundTransportTime: 6,
        prioritizeTime: false,
        prioritizeCost: true,
        prioritizePoints: false
      };

      const result = await routeOptimizer.optimizeRoute(
        mockSearchCriteria,
        mockFlightResults,
        options
      );

      expect(result).toBeDefined();
      expect(result.routeType).toBe('direct');
      expect(result.optimizedFlights).toHaveLength(1);
      expect(result.totalCost).toBe(575); // Direct flight cost
      expect(result.savings).toBe(0); // Baseline has no savings
      expect(result.recommendations).toContain('Direct flight - fastest and simplest option');
    });

    it('should consider connecting flights for cost savings', async () => {
      const options: RouteOptimizationOptions = {
        considerPositioning: false,
        maxPositioningDetour: 500,
        allowStopovers: false,
        maxStopoverDuration: 24,
        considerOpenJaw: false,
        maxGroundTransportTime: 6,
        prioritizeTime: false,
        prioritizeCost: true,
        prioritizePoints: false
      };

      const result = await routeOptimizer.optimizeRoute(
        mockSearchCriteria,
        mockFlightResults,
        options
      );

      expect(result).toBeDefined();
      expect(result.optimizationScore).toBeGreaterThan(0);
      expect(result.alternatives).toBeDefined();
    });

    it('should prioritize time when specified', async () => {
      const options: RouteOptimizationOptions = {
        considerPositioning: false,
        maxPositioningDetour: 500,
        allowStopovers: false,
        maxStopoverDuration: 24,
        considerOpenJaw: false,
        maxGroundTransportTime: 6,
        prioritizeTime: true,
        prioritizeCost: false,
        prioritizePoints: false
      };

      const result = await routeOptimizer.optimizeRoute(
        mockSearchCriteria,
        mockFlightResults,
        options
      );

      expect(result).toBeDefined();
      expect(result.optimizationScore).toBeGreaterThan(0);
      // Should prefer direct flight when prioritizing time
      expect(result.routeType).toBe('direct');
    });

    it('should handle empty flight results', async () => {
      const options: RouteOptimizationOptions = {
        considerPositioning: false,
        maxPositioningDetour: 500,
        allowStopovers: false,
        maxStopoverDuration: 24,
        considerOpenJaw: false,
        maxGroundTransportTime: 6,
        prioritizeTime: false,
        prioritizeCost: true,
        prioritizePoints: false
      };

      await expect(
        routeOptimizer.optimizeRoute(mockSearchCriteria, [], options)
      ).rejects.toThrow();
    });
  });

  describe('findPositioningFlights', () => {
    it('should find positioning flight opportunities', async () => {
      // Add positioning flights to mock data
      const positioningFlights = [
        {
          ...mockFlightResults[0]!,
          id: '3',
          route: [{
            ...mockFlightResults[0]!.route[0]!,
            origin: 'JFK',
            destination: 'LGA'
          }],
          pricing: { ...mockFlightResults[0]!.pricing, totalPrice: 100 }
        },
        {
          ...mockFlightResults[0]!,
          id: '4',
          route: [{
            ...mockFlightResults[0]!.route[0]!,
            origin: 'LGA',
            destination: 'LAX'
          }],
          pricing: { ...mockFlightResults[0]!.pricing, totalPrice: 400 }
        }
      ];

      const allFlights = [...mockFlightResults, ...positioningFlights];
      
      const suggestions = await routeOptimizer.findPositioningFlights(
        mockSearchCriteria,
        allFlights,
        500
      );

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      // Should find feasible positioning options
      suggestions.forEach(suggestion => {
        expect(suggestion.feasible).toBeDefined();
        expect(suggestion.totalCost).toBeGreaterThan(0);
        expect(suggestion.savings).toBeDefined();
      });
    });

    it('should filter out infeasible positioning flights', async () => {
      const suggestions = await routeOptimizer.findPositioningFlights(
        mockSearchCriteria,
        mockFlightResults,
        50 // Very small detour limit
      );

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      // With limited detour, should have fewer or no suggestions
    });

    it('should sort suggestions by savings', async () => {
      const positioningFlights = [
        {
          ...mockFlightResults[0],
          id: '3',
          route: [{
            ...mockFlightResults[0].route[0],
            origin: 'JFK',
            destination: 'EWR'
          }],
          pricing: { ...mockFlightResults[0].pricing, totalPrice: 50 }
        },
        {
          ...mockFlightResults[0],
          id: '4',
          route: [{
            ...mockFlightResults[0].route[0],
            origin: 'EWR',
            destination: 'LAX'
          }],
          pricing: { ...mockFlightResults[0].pricing, totalPrice: 300 }
        }
      ];

      const allFlights = [...mockFlightResults, ...positioningFlights];
      
      const suggestions = await routeOptimizer.findPositioningFlights(
        mockSearchCriteria,
        allFlights,
        500
      );

      if (suggestions.length > 1) {
        // Should be sorted by savings (highest first)
        for (let i = 0; i < suggestions.length - 1; i++) {
          expect(suggestions[i].savings).toBeGreaterThanOrEqual(suggestions[i + 1].savings);
        }
      }
    });
  });

  describe('findStopoverOptions', () => {
    it('should find stopover opportunities in connecting flights', async () => {
      const stopovers = await routeOptimizer.findStopoverOptions(
        mockSearchCriteria,
        mockFlightResults,
        24
      );

      expect(stopovers).toBeDefined();
      expect(Array.isArray(stopovers)).toBe(true);
      
      stopovers.forEach(stopover => {
        expect(stopover.city).toBeDefined();
        expect(stopover.minStayDuration).toBeGreaterThan(0);
        expect(stopover.maxStayDuration).toBeGreaterThan(stopover.minStayDuration);
        expect(stopover.additionalCost).toBeGreaterThan(0);
      });
    });

    it('should only suggest stopovers in major hubs', async () => {
      const stopovers = await routeOptimizer.findStopoverOptions(
        mockSearchCriteria,
        mockFlightResults,
        24
      );

      stopovers.forEach(stopover => {
        // Should be a major hub (3-letter airport code)
        expect(stopover.city).toMatch(/^[A-Z]{3}$/);
      });
    });

    it('should respect maximum stopover duration', async () => {
      const maxDuration = 12;
      const stopovers = await routeOptimizer.findStopoverOptions(
        mockSearchCriteria,
        mockFlightResults,
        maxDuration
      );

      stopovers.forEach(stopover => {
        expect(stopover.maxStayDuration).toBeLessThanOrEqual(maxDuration);
      });
    });
  });

  describe('optimizeMultiCityRoute', () => {
    it('should optimize multi-city itinerary', async () => {
      const multiCityCriteria: MultiCitySearchCriteria = {
        cities: ['JFK', 'LAX', 'SFO', 'JFK'],
        departureDate: new Date('2024-06-01T10:00:00Z'),
        passengers: { adults: 1, children: 0, infants: 0 },
        cabinClass: 'economy',
        flexible: false
      };

      // Create multi-city flight segments
      const multiCityFlights = [
        {
          ...mockFlightResults[0],
          id: 'mc1',
          route: [{
            ...mockFlightResults[0].route[0],
            origin: 'JFK',
            destination: 'LAX'
          }]
        },
        {
          ...mockFlightResults[0],
          id: 'mc2',
          route: [{
            ...mockFlightResults[0].route[0],
            origin: 'LAX',
            destination: 'SFO'
          }]
        },
        {
          ...mockFlightResults[0],
          id: 'mc3',
          route: [{
            ...mockFlightResults[0].route[0],
            origin: 'SFO',
            destination: 'JFK'
          }]
        }
      ];

      const result = await routeOptimizer.optimizeMultiCityRoute(
        multiCityCriteria,
        multiCityFlights
      );

      expect(result).toBeDefined();
      expect(result.routeType).toBe('multi-city');
      expect(result.optimizedFlights).toHaveLength(3); // 3 segments for 4 cities
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should throw error for insufficient flight segments', async () => {
      const multiCityCriteria: MultiCitySearchCriteria = {
        cities: ['JFK', 'LAX', 'SFO'],
        departureDate: new Date('2024-06-01T10:00:00Z'),
        passengers: { adults: 1, children: 0, infants: 0 },
        cabinClass: 'economy',
        flexible: false
      };

      // Only provide one flight segment when two are needed
      const insufficientFlights = [mockFlightResults[0]];

      await expect(
        routeOptimizer.optimizeMultiCityRoute(multiCityCriteria, insufficientFlights)
      ).rejects.toThrow();
    });

    it('should calculate multi-city optimization score', async () => {
      const multiCityCriteria: MultiCitySearchCriteria = {
        cities: ['JFK', 'LAX', 'SFO'],
        departureDate: new Date('2024-06-01T10:00:00Z'),
        passengers: { adults: 1, children: 0, infants: 0 },
        cabinClass: 'economy',
        flexible: false
      };

      const multiCityFlights = [
        {
          ...mockFlightResults[0],
          id: 'mc1',
          route: [{
            ...mockFlightResults[0].route[0],
            origin: 'JFK',
            destination: 'LAX'
          }]
        },
        {
          ...mockFlightResults[0],
          id: 'mc2',
          route: [{
            ...mockFlightResults[0].route[0],
            origin: 'LAX',
            destination: 'SFO'
          }]
        }
      ];

      const result = await routeOptimizer.optimizeMultiCityRoute(
        multiCityCriteria,
        multiCityFlights
      );

      expect(result.optimizationScore).toBeGreaterThan(0);
      expect(result.optimizationScore).toBeLessThanOrEqual(100);
    });
  });

  describe('findOpenJawOptions', () => {
    it('should find open-jaw routing opportunities', async () => {
      const searchWithReturn = {
        ...mockSearchCriteria,
        returnDate: new Date('2024-06-08T10:00:00Z')
      };

      // Add return flights to mock data
      const returnFlights = [
        {
          ...mockFlightResults[0],
          id: '5',
          route: [{
            ...mockFlightResults[0].route[0],
            origin: 'LAX',
            destination: 'JFK'
          }]
        }
      ];

      const allFlights = [...mockFlightResults, ...returnFlights];

      const openJawOptions = await routeOptimizer.findOpenJawOptions(
        searchWithReturn,
        allFlights,
        6
      );

      expect(openJawOptions).toBeDefined();
      expect(Array.isArray(openJawOptions)).toBe(true);
      
      openJawOptions.forEach(option => {
        expect(option.outboundOrigin).toBeDefined();
        expect(option.outboundDestination).toBeDefined();
        expect(option.returnOrigin).toBeDefined();
        expect(option.returnDestination).toBeDefined();
        expect(option.totalCost).toBeGreaterThan(0);
        expect(option.feasible).toBeDefined();
      });
    });

    it('should return empty array for one-way trips', async () => {
      const openJawOptions = await routeOptimizer.findOpenJawOptions(
        mockSearchCriteria, // No return date
        mockFlightResults,
        6
      );

      expect(openJawOptions).toEqual([]);
    });

    it('should respect ground transport time limits', async () => {
      const searchWithReturn = {
        ...mockSearchCriteria,
        returnDate: new Date('2024-06-08T10:00:00Z')
      };

      const returnFlights = [
        {
          ...mockFlightResults[0],
          id: '5',
          route: [{
            ...mockFlightResults[0].route[0],
            origin: 'LAX',
            destination: 'JFK'
          }]
        }
      ];

      const allFlights = [...mockFlightResults, ...returnFlights];

      const openJawOptions = await routeOptimizer.findOpenJawOptions(
        searchWithReturn,
        allFlights,
        1 // Very short ground transport limit
      );

      // Should have fewer or no options with strict time limit
      openJawOptions.forEach(option => {
        if (option.groundTransport) {
          expect(option.groundTransport.duration).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null or undefined flight results', async () => {
      const options: RouteOptimizationOptions = {
        considerPositioning: false,
        maxPositioningDetour: 500,
        allowStopovers: false,
        maxStopoverDuration: 24,
        considerOpenJaw: false,
        maxGroundTransportTime: 6,
        prioritizeTime: false,
        prioritizeCost: true,
        prioritizePoints: false
      };

      await expect(
        routeOptimizer.optimizeRoute(mockSearchCriteria, [], options)
      ).rejects.toThrow();
    });

    it('should handle flights with missing route information', async () => {
      const invalidFlights = [
        {
          ...mockFlightResults[0],
          route: [] // Empty route
        }
      ];

      const options: RouteOptimizationOptions = {
        considerPositioning: false,
        maxPositioningDetour: 500,
        allowStopovers: false,
        maxStopoverDuration: 24,
        considerOpenJaw: false,
        maxGroundTransportTime: 6,
        prioritizeTime: false,
        prioritizeCost: true,
        prioritizePoints: false
      };

      await expect(
        routeOptimizer.optimizeRoute(mockSearchCriteria, invalidFlights, options)
      ).rejects.toThrow();
    });

    it('should handle extreme optimization options', async () => {
      const extremeOptions: RouteOptimizationOptions = {
        considerPositioning: true,
        maxPositioningDetour: 0, // No detour allowed
        allowStopovers: true,
        maxStopoverDuration: 0, // No stopover time
        considerOpenJaw: true,
        maxGroundTransportTime: 0, // No ground transport
        prioritizeTime: true,
        prioritizeCost: true,
        prioritizePoints: true
      };

      const result = await routeOptimizer.optimizeRoute(
        mockSearchCriteria,
        mockFlightResults,
        extremeOptions
      );

      expect(result).toBeDefined();
      expect(result.routeType).toBe('direct'); // Should fall back to direct
    });
  });
});