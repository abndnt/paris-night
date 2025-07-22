import { 
  AdvancedSearchFilters, 
  PowerUserFilters, 
  TimeWindow,
  FilterResult 
} from '../services/AdvancedSearchFilters';
import { FlightResult, SearchCriteria } from '../models/FlightSearch';

describe('AdvancedSearchFilters', () => {
  let advancedFilters: AdvancedSearchFilters;
  let mockFlightResults: FlightResult[];
  let mockSearchCriteria: SearchCriteria;

  beforeEach(() => {
    advancedFilters = new AdvancedSearchFilters();
    
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
          aircraft: 'A350'
        }],
        pricing: {
          cashPrice: 500,
          currency: 'USD',
          pointsOptions: [{
            program: 'AA',
            pointsRequired: 25000,
            cashComponent: 0,
            bestValue: true
          }],
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
            departureTime: new Date('2024-06-01T22:00:00Z'), // Red-eye
            arrivalTime: new Date('2024-06-02T01:00:00Z'),
            duration: 180,
            aircraft: 'B737'
          },
          {
            airline: 'DL',
            flightNumber: 'DL201',
            origin: 'ATL',
            destination: 'LAX',
            departureTime: new Date('2024-06-02T06:00:00Z'),
            arrivalTime: new Date('2024-06-02T08:00:00Z'),
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
        duration: 720, // Including layover
        layovers: 1,
        layoverDuration: 300 // 5 hours
      },
      {
        id: '3',
        airline: 'UA',
        flightNumber: 'UA300',
        route: [{
          airline: 'UA',
          flightNumber: 'UA300',
          origin: 'JFK',
          destination: 'LAX',
          departureTime: new Date('2024-06-01T14:00:00Z'),
          arrivalTime: new Date('2024-06-01T20:00:00Z'),
          duration: 360,
          aircraft: 'B787'
        }],
        pricing: {
          cashPrice: 600,
          currency: 'USD',
          pointsOptions: [{
            program: 'UA',
            pointsRequired: 30000,
            cashComponent: 0,
            bestValue: false
          }],
          taxes: 60,
          fees: 30,
          totalPrice: 690
        },
        availability: {
          availableSeats: 8,
          bookingClass: 'Y',
          fareBasis: 'Y'
        },
        duration: 360,
        layovers: 0
      }
    ];
  });

  describe('applyAdvancedFilters', () => {
    it('should filter by aircraft types', async () => {
      const filters: PowerUserFilters = {
        aircraftTypes: ['A350']
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(1);
      expect(filteredFlights[0].id).toBe('1');
      expect(filterResult.appliedFilters).toContain('Aircraft types');
      expect(filterResult.removedByFilter['aircraftTypes']).toBe(2);
    });

    it('should exclude aircraft types', async () => {
      const filters: PowerUserFilters = {
        excludeAircraftTypes: ['B737']
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(2);
      expect(filteredFlights.find(f => f.id === '2')).toBeUndefined();
      expect(filterResult.appliedFilters).toContain('Excluded aircraft types');
    });

    it('should filter by alliance preference', async () => {
      const filters: PowerUserFilters = {
        alliancePreference: 'oneworld'
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(1);
      expect(filteredFlights[0].airline).toBe('AA');
      expect(filterResult.appliedFilters).toContain('Alliance preference');
    });

    it('should filter by departure time windows', async () => {
      const filters: PowerUserFilters = {
        departureTimeWindows: [{
          start: '09:00',
          end: '12:00'
        }]
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(1);
      expect(filteredFlights[0].id).toBe('1'); // 10:00 departure
      expect(filterResult.appliedFilters).toContain('Departure time windows');
    });

    it('should filter by arrival time windows', async () => {
      const filters: PowerUserFilters = {
        arrivalTimeWindows: [{
          start: '15:00',
          end: '17:00'
        }]
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(1);
      expect(filteredFlights[0].id).toBe('1'); // 16:00 arrival
      expect(filterResult.appliedFilters).toContain('Arrival time windows');
    });

    it('should filter by maximum travel time', async () => {
      const filters: PowerUserFilters = {
        maxTotalTravelTime: 400 // 6 hours 40 minutes
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(2);
      expect(filteredFlights.find(f => f.id === '2')).toBeUndefined(); // 720 minutes
      expect(filterResult.appliedFilters).toContain('Maximum travel time');
    });

    it('should filter by layover time constraints', async () => {
      const filters: PowerUserFilters = {
        minLayoverTime: 60,
        maxLayoverTime: 240 // 4 hours
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      // Should exclude flight with 5-hour layover
      expect(filteredFlights.find(f => f.id === '2')).toBeUndefined();
      expect(filterResult.appliedFilters).toContain('Layover time constraints');
    });

    it('should filter by preferred layover airports', async () => {
      const filters: PowerUserFilters = {
        preferredLayoverAirports: ['ATL']
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      // Should include direct flights and flights with ATL layover
      expect(filteredFlights).toHaveLength(3); // All flights pass (direct flights always pass)
      expect(filterResult.appliedFilters).toContain('Preferred layover airports');
    });

    it('should avoid specific layover airports', async () => {
      const filters: PowerUserFilters = {
        avoidLayoverAirports: ['ATL']
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(2);
      expect(filteredFlights.find(f => f.id === '2')).toBeUndefined();
      expect(filterResult.appliedFilters).toContain('Avoided layover airports');
    });

    it('should filter by maximum segments', async () => {
      const filters: PowerUserFilters = {
        maxSegments: 1
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(2);
      expect(filteredFlights.find(f => f.id === '2')).toBeUndefined(); // 2 segments
      expect(filterResult.appliedFilters).toContain('Maximum segments');
    });

    it('should filter for direct flights only', async () => {
      const filters: PowerUserFilters = {
        directFlightsOnly: true
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(2);
      expect(filteredFlights.every(f => f.route.length === 1)).toBe(true);
      expect(filterResult.appliedFilters).toContain('Direct flights only');
    });

    it('should avoid red-eye flights', async () => {
      const filters: PowerUserFilters = {
        avoidRedEyes: true
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(2);
      expect(filteredFlights.find(f => f.id === '2')).toBeUndefined(); // 22:00 departure
      expect(filterResult.appliedFilters).toContain('Avoid red-eye flights');
    });

    it('should filter by WiFi requirement', async () => {
      const filters: PowerUserFilters = {
        wifiRequired: true
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      // A350 and B787 have WiFi, B737 doesn't
      expect(filteredFlights).toHaveLength(2);
      expect(filteredFlights.find(f => f.id === '2')).toBeUndefined();
      expect(filterResult.appliedFilters).toContain('WiFi required');
    });

    it('should filter by lie-flat seat requirement', async () => {
      const filters: PowerUserFilters = {
        lieFlat: true
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      // A350 and B787 have lie-flat, B737 doesn't
      expect(filteredFlights).toHaveLength(2);
      expect(filterResult.appliedFilters).toContain('Lie-flat seats');
    });

    it('should filter by fuel-efficient aircraft only', async () => {
      const filters: PowerUserFilters = {
        fuelEfficientAircraftOnly: true
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      // A350 and B787 are fuel-efficient
      expect(filteredFlights).toHaveLength(2);
      expect(filterResult.appliedFilters).toContain('Fuel-efficient aircraft only');
    });

    it('should filter by award availability only', async () => {
      const filters: PowerUserFilters = {
        awardAvailabilityOnly: true
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(2);
      expect(filteredFlights.find(f => f.id === '2')).toBeUndefined(); // No points options
      expect(filterResult.appliedFilters).toContain('Award availability only');
    });

    it('should apply multiple filters simultaneously', async () => {
      const filters: PowerUserFilters = {
        directFlightsOnly: true,
        avoidRedEyes: true,
        wifiRequired: true,
        maxTotalTravelTime: 400
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(2);
      expect(filterResult.appliedFilters).toHaveLength(4);
      expect(filterResult.originalCount).toBe(3);
      expect(filterResult.filteredCount).toBe(2);
    });

    it('should generate warnings when all flights are filtered out', async () => {
      const filters: PowerUserFilters = {
        aircraftTypes: ['NONEXISTENT']
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(0);
      expect(filterResult.warnings).toContain('All flights filtered out. Consider relaxing some constraints.');
    });

    it('should generate warnings when very few flights remain', async () => {
      const filters: PowerUserFilters = {
        aircraftTypes: ['A350'] // Only one flight has this
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toHaveLength(1);
      expect(filterResult.warnings).toContain('Very few flights remain after filtering. Consider relaxing constraints.');
    });

    it('should generate suggestions for direct flights', async () => {
      const filters: PowerUserFilters = {
        directFlightsOnly: true
      };

      // Mock scenario where no direct flights exist
      const connectingOnlyFlights = [mockFlightResults[1]]; // Only connecting flight

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        connectingOnlyFlights,
        filters
      );

      expect(filteredFlights).toHaveLength(0);
      expect(filterResult.suggestions).toContain('No direct flights available. Try allowing 1 stop.');
    });
  });

  describe('getAvailableFilterOptions', () => {
    it('should return available filter options from flight results', () => {
      const options = advancedFilters.getAvailableFilterOptions(mockFlightResults);

      expect(options.aircraftTypes).toContain('A350');
      expect(options.aircraftTypes).toContain('B787');
      expect(options.aircraftTypes).toContain('B737');
      
      expect(options.airlines).toContain('AA');
      expect(options.airlines).toContain('DL');
      expect(options.airlines).toContain('UA');
      
      expect(options.layoverAirports).toContain('ATL');
      
      expect(options.alliances).toContain('oneworld');
      expect(options.alliances).toContain('skyteam');
      expect(options.alliances).toContain('star-alliance');
      
      expect(options.maxTravelTime).toBeGreaterThan(0);
      expect(options.minTravelTime).toBeGreaterThan(0);
    });

    it('should handle empty flight results', () => {
      const options = advancedFilters.getAvailableFilterOptions([]);

      expect(options.aircraftTypes).toEqual([]);
      expect(options.airlines).toEqual([]);
      expect(options.layoverAirports).toEqual([]);
      expect(options.alliances).toEqual([]);
      expect(options.maxTravelTime).toBe(0);
      expect(options.minTravelTime).toBe(Infinity);
    });
  });

  describe('generateFilterRecommendations', () => {
    it('should recommend direct flights when many connecting flights exist', () => {
      // Create scenario with many connecting flights
      const manyConnectingFlights = Array(10).fill(mockFlightResults[1]);
      const mixedFlights = [mockFlightResults[0], ...manyConnectingFlights];

      const recommendations = advancedFilters.generateFilterRecommendations(
        mockSearchCriteria,
        mixedFlights
      );

      expect(recommendations).toContain('Consider filtering for direct flights only to save time');
    });

    it('should recommend avoiding red-eyes when many exist', () => {
      // Create scenario with many red-eye flights
      const manyRedEyes = Array(5).fill(mockFlightResults[1]); // Red-eye flight
      const mixedFlights = [mockFlightResults[0], ...manyRedEyes];

      const recommendations = advancedFilters.generateFilterRecommendations(
        mockSearchCriteria,
        mixedFlights
      );

      expect(recommendations).toContain('Many red-eye flights available - consider avoiding if you prefer daytime travel');
    });

    it('should recommend setting layover time limits for long layovers', () => {
      const recommendations = advancedFilters.generateFilterRecommendations(
        mockSearchCriteria,
        mockFlightResults
      );

      expect(recommendations).toContain('Some flights have long layovers - consider setting maximum layover time');
    });

    it('should recommend alliance filtering when multiple alliances exist', () => {
      const recommendations = advancedFilters.generateFilterRecommendations(
        mockSearchCriteria,
        mockFlightResults
      );

      expect(recommendations).toContain('Multiple airline alliances available - filter by alliance for status benefits');
    });

    it('should return empty recommendations for homogeneous results', () => {
      // All direct flights, same airline
      const homogeneousFlights = [mockFlightResults[0], mockFlightResults[0]];

      const recommendations = advancedFilters.generateFilterRecommendations(
        mockSearchCriteria,
        homogeneousFlights
      );

      // Should have fewer recommendations
      expect(recommendations.length).toBeLessThan(3);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle flights with missing aircraft information', async () => {
      const flightsWithoutAircraft = mockFlightResults.map(flight => ({
        ...flight,
        route: flight.route.map(segment => ({
          ...segment,
          aircraft: undefined
        }))
      }));

      const filters: PowerUserFilters = {
        aircraftTypes: ['A350']
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        flightsWithoutAircraft,
        filters
      );

      expect(filteredFlights).toHaveLength(0);
      expect(filterResult.appliedFilters).toContain('Aircraft types');
    });

    it('should handle flights with invalid time formats', async () => {
      const filters: PowerUserFilters = {
        departureTimeWindows: [{
          start: '09:00',
          end: '12:00'
        }]
      };

      // Should not throw error even with potentially invalid times
      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        filters
      );

      expect(filteredFlights).toBeDefined();
      expect(filterResult).toBeDefined();
    });

    it('should handle empty filter objects', async () => {
      const emptyFilters: PowerUserFilters = {};

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        emptyFilters
      );

      expect(filteredFlights).toEqual(mockFlightResults);
      expect(filterResult.appliedFilters).toHaveLength(0);
      expect(filterResult.originalCount).toBe(mockFlightResults.length);
      expect(filterResult.filteredCount).toBe(mockFlightResults.length);
    });

    it('should handle extreme filter values', async () => {
      const extremeFilters: PowerUserFilters = {
        maxTotalTravelTime: 1, // 1 minute - impossible
        minLayoverTime: 1000, // 16+ hours - very long
        maxLayoverTime: 5 // 5 minutes - very short
      };

      const { filteredFlights, filterResult } = await advancedFilters.applyAdvancedFilters(
        mockFlightResults,
        extremeFilters
      );

      expect(filteredFlights).toHaveLength(0);
      expect(filterResult.warnings).toContain('All flights filtered out. Consider relaxing some constraints.');
    });
  });
});