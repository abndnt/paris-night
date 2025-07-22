import { PreferenceFilterService } from '../services/PreferenceFilterService';
import { TravelPreferences } from '../models/TravelPreferences';
import { FlightResult } from '../models/FlightSearch';

describe('PreferenceFilterService', () => {
  let service: PreferenceFilterService;

  beforeEach(() => {
    service = new PreferenceFilterService();
  });

  const mockFlightResults: FlightResult[] = [
    {
      id: 'flight-1',
      airline: 'AA',
      flightNumber: 'AA100',
      route: [
        {
          flightNumber: 'AA100',
          airline: 'AA',
          operatingAirline: 'AA',
          origin: 'JFK',
          destination: 'LAX',
          departureTime: new Date('2024-06-01T10:00:00Z'),
          arrivalTime: new Date('2024-06-01T13:00:00Z'),
          duration: 360,
          aircraft: 'Boeing 737',
        }
      ],
      pricing: {
        cashPrice: 300,
        currency: 'USD',
        pointsOptions: [],
        taxes: 50,
        fees: 0,
        totalPrice: 350,
      },
      availability: {
        availableSeats: 10,
        bookingClass: 'Y',
        fareBasis: 'Y',
      },
      duration: 360,
      layovers: 0,
    },
    {
      id: 'flight-2',
      airline: 'DL',
      flightNumber: 'DL200',
      route: [
        {
          flightNumber: 'DL200',
          airline: 'DL',
          operatingAirline: 'DL',
          origin: 'JFK',
          destination: 'ATL',
          departureTime: new Date('2024-06-01T08:00:00Z'),
          arrivalTime: new Date('2024-06-01T10:00:00Z'),
          duration: 120,
          aircraft: 'Airbus A320',
        },
        {
          flightNumber: 'DL201',
          airline: 'DL',
          operatingAirline: 'DL',
          origin: 'ATL',
          destination: 'LAX',
          departureTime: new Date('2024-06-01T11:00:00Z'),
          arrivalTime: new Date('2024-06-01T13:00:00Z'),
          duration: 240,
          aircraft: 'Airbus A320',
        }
      ],
      pricing: {
        cashPrice: 800,
        currency: 'USD',
        pointsOptions: [],
        taxes: 100,
        fees: 0,
        totalPrice: 900,
      },
      availability: {
        availableSeats: 5,
        bookingClass: 'J',
        fareBasis: 'J',
      },
      duration: 360,
      layovers: 1,
    },
    {
      id: 'flight-3',
      airline: 'UA',
      flightNumber: 'UA300',
      route: [
        {
          flightNumber: 'UA300',
          airline: 'UA',
          operatingAirline: 'UA',
          origin: 'LGA',
          destination: 'ORD',
          departureTime: new Date('2024-06-01T09:00:00Z'),
          arrivalTime: new Date('2024-06-01T11:00:00Z'),
          duration: 180,
          aircraft: 'Boeing 777',
        },
        {
          flightNumber: 'UA301',
          airline: 'UA',
          operatingAirline: 'UA',
          origin: 'ORD',
          destination: 'SFO',
          departureTime: new Date('2024-06-01T12:00:00Z'),
          arrivalTime: new Date('2024-06-01T14:00:00Z'),
          duration: 240,
          aircraft: 'Boeing 777',
        }
      ],
      pricing: {
        cashPrice: 350,
        currency: 'USD',
        pointsOptions: [],
        taxes: 50,
        fees: 0,
        totalPrice: 400,
      },
      availability: {
        availableSeats: 15,
        bookingClass: 'Y',
        fareBasis: 'Y',
      },
      duration: 420,
      layovers: 1,
    }
  ];

  const mockPreferences: TravelPreferences = {
    userId: 'user-123',
    preferredAirlines: ['AA', 'DL'],
    preferredAirports: ['JFK', 'LAX', 'ATL'],
    seatPreference: 'aisle',
    mealPreference: 'vegetarian',
    maxLayovers: 1,
    preferredCabinClass: 'economy',
  };

  describe('filterByPreferences', () => {
    it('should return all results when no preferences provided', async () => {
      const result = await service.filterByPreferences(mockFlightResults, null);

      expect(result.results).toHaveLength(3);
      expect(result.appliedFilters).toHaveLength(0);
      expect(result.totalResults).toBe(3);
      expect(result.filteredResults).toBe(3);
    });

    it('should rank results by preference score', async () => {
      const result = await service.filterByPreferences(mockFlightResults, mockPreferences);

      expect(result.results).toHaveLength(3);
      expect(result.appliedFilters).toContain('airline_preference');
      expect(result.appliedFilters).toContain('airport_preference');
      expect(result.appliedFilters).toContain('cabin_class_preference');
      expect(result.appliedFilters).toContain('layover_preference');

      // First result should be AA flight (preferred airline, preferred airports, preferred cabin class, no layovers)
      expect(result.results[0].airline).toBe('AA');
    });

    it('should apply strict filtering when enabled', async () => {
      const strictPreferences: TravelPreferences = {
        ...mockPreferences,
        maxLayovers: 0, // Only direct flights
      };

      const result = await service.filterByPreferences(
        mockFlightResults,
        strictPreferences,
        { strictFiltering: true }
      );

      expect(result.filteredResults).toBe(1); // Only the direct AA flight
      expect(result.results[0].layovers).toBe(0);
    });

    it('should handle empty results array', async () => {
      const result = await service.filterByPreferences([], mockPreferences);

      expect(result.results).toHaveLength(0);
      expect(result.totalResults).toBe(0);
      expect(result.filteredResults).toBe(0);
    });

    it('should apply selective filters based on options', async () => {
      const result = await service.filterByPreferences(
        mockFlightResults,
        mockPreferences,
        {
          applyAirlinePreference: true,
          applyAirportPreference: false,
          applyCabinClassPreference: false,
          applyLayoverPreference: false,
        }
      );

      expect(result.appliedFilters).toContain('airline_preference');
      expect(result.appliedFilters).not.toContain('airport_preference');
      expect(result.appliedFilters).not.toContain('cabin_class_preference');
      expect(result.appliedFilters).not.toContain('layover_preference');
    });
  });

  describe('getSearchRecommendations', () => {
    it('should return recommendations based on preferences', async () => {
      const result = await service.getSearchRecommendations(mockPreferences);

      expect(result.recommendedAirlines).toEqual(['AA', 'DL']);
      expect(result.recommendedAirports).toEqual(['JFK', 'LAX', 'ATL']);
      expect(result.recommendedCabinClass).toBe('economy');
      expect(result.recommendedMaxLayovers).toBe(1);
    });

    it('should return defaults when no preferences provided', async () => {
      const result = await service.getSearchRecommendations(null);

      expect(result.recommendedAirlines).toEqual([]);
      expect(result.recommendedAirports).toEqual([]);
      expect(result.recommendedCabinClass).toBe('economy');
      expect(result.recommendedMaxLayovers).toBe(2);
    });
  });

  describe('analyzeBookingPatterns', () => {
    const mockBookingHistory = [
      {
        flightDetails: {
          route: [
            { airline: 'AA', origin: 'JFK', destination: 'LAX', cabinClass: 'economy' },
          ],
          layovers: 0,
        },
      },
      {
        flightDetails: {
          route: [
            { airline: 'AA', origin: 'JFK', destination: 'ORD', cabinClass: 'economy' },
            { airline: 'AA', origin: 'ORD', destination: 'SFO', cabinClass: 'economy' },
          ],
          layovers: 1,
        },
      },
      {
        flightDetails: {
          route: [
            { airline: 'DL', origin: 'LGA', destination: 'ATL', cabinClass: 'business' },
            { airline: 'DL', origin: 'ATL', destination: 'LAX', cabinClass: 'business' },
          ],
          layovers: 1,
        },
      },
    ];

    it('should analyze booking patterns and suggest preferences', async () => {
      const result = await service.analyzeBookingPatterns(mockBookingHistory);

      expect(result.suggestedAirlines).toContain('AA');
      expect(result.suggestedAirlines).toContain('DL');
      expect(result.suggestedAirports).toContain('JFK');
      expect(result.suggestedAirports).toContain('LAX');
      expect(result.suggestedCabinClass).toBe('economy'); // Most frequent
      expect(result.suggestedMaxLayovers).toBe(1); // Average
      expect(result.confidence).toBe(0.3); // 3 bookings / 10 = 0.3
    });

    it('should return defaults for empty booking history', async () => {
      const result = await service.analyzeBookingPatterns([]);

      expect(result.suggestedAirlines).toEqual([]);
      expect(result.suggestedAirports).toEqual([]);
      expect(result.suggestedCabinClass).toBe('economy');
      expect(result.suggestedMaxLayovers).toBe(2);
      expect(result.confidence).toBe(0);
    });

    it('should handle malformed booking data gracefully', async () => {
      const malformedBookings = [
        { flightDetails: null },
        { flightDetails: { route: null } },
        { flightDetails: { route: [] } },
      ];

      const result = await service.analyzeBookingPatterns(malformedBookings);

      expect(result.suggestedAirlines).toEqual([]);
      expect(result.confidence).toBe(0.3); // Still based on booking count
    });

    it('should limit suggestions to top items', async () => {
      const manyBookings = Array.from({ length: 10 }, (_, i) => ({
        flightDetails: {
          route: [
            { 
              airline: `AIRLINE_${i}`, 
              origin: `AIRPORT_${i}`, 
              destination: `DEST_${i}`, 
              cabinClass: 'economy' 
            },
          ],
          layovers: 0,
        },
      }));

      const result = await service.analyzeBookingPatterns(manyBookings);

      expect(result.suggestedAirlines.length).toBeLessThanOrEqual(3);
      expect(result.suggestedAirports.length).toBeLessThanOrEqual(5);
    });
  });

  describe('preference matching methods', () => {
    it('should correctly match airline preferences', async () => {
      const result = await service.filterByPreferences(mockFlightResults, mockPreferences);
      
      // AA and DL flights should score higher than UA
      const aaFlight = result.results.find(r => r.airline === 'AA');
      const dlFlight = result.results.find(r => r.airline === 'DL');
      const uaFlight = result.results.find(r => r.airline === 'UA');
      
      const aaIndex = result.results.indexOf(aaFlight!);
      const dlIndex = result.results.indexOf(dlFlight!);
      const uaIndex = result.results.indexOf(uaFlight!);
      
      expect(aaIndex).toBeLessThan(uaIndex);
      expect(dlIndex).toBeLessThan(uaIndex);
    });

    it('should correctly match airport preferences', async () => {
      const airportPreferences: TravelPreferences = {
        ...mockPreferences,
        preferredAirports: ['JFK', 'LAX'], // JFK-LAX route preferred
      };

      const result = await service.filterByPreferences(mockFlightResults, airportPreferences);
      
      // Flights using JFK should score higher
      const jfkFlights = result.results.filter(r => 
        r.route.some(segment => segment.origin === 'JFK' || segment.destination === 'JFK')
      );
      
      expect(jfkFlights.length).toBeGreaterThan(0);
    });

    it('should correctly match cabin class preferences', async () => {
      const businessPreferences: TravelPreferences = {
        ...mockPreferences,
        preferredCabinClass: 'business',
      };

      const result = await service.filterByPreferences(mockFlightResults, businessPreferences);
      
      // Business class flight (DL with booking class J) should rank higher
      expect(result.results[0].availability.bookingClass).toBe('J');
    });

    it('should correctly match layover preferences', async () => {
      const directFlightPreferences: TravelPreferences = {
        ...mockPreferences,
        maxLayovers: 0,
      };

      const result = await service.filterByPreferences(mockFlightResults, directFlightPreferences);
      
      // Direct flight should rank highest
      expect(result.results[0].layovers).toBe(0);
    });
  });
});