import { Pool } from 'pg';
import {
  FlightSearchModel,
  CreateFlightSearchData,
  UpdateFlightSearchData,
  FlightResult,
  SearchCriteriaSchema,
  CreateFlightSearchSchema,
  PassengerCountSchema
} from '../models/FlightSearch';
import { SearchService } from '../services/SearchService';

// Mock database pool
const mockDb = {
  query: jest.fn()
} as unknown as Pool;

describe('FlightSearch Data Models', () => {
  let flightSearchModel: FlightSearchModel;
  let searchService: SearchService;

  beforeEach(() => {
    flightSearchModel = new FlightSearchModel(mockDb);
    searchService = new SearchService(mockDb);
    jest.clearAllMocks();
  });

  describe('Validation Schemas', () => {
    describe('PassengerCountSchema', () => {
      it('should validate valid passenger counts', () => {
        const validPassengers = { adults: 2, children: 1, infants: 1 };
        const { error } = PassengerCountSchema.validate(validPassengers);
        expect(error).toBeUndefined();
      });

      it('should require at least 1 adult', () => {
        const invalidPassengers = { adults: 0, children: 1, infants: 0 };
        const { error } = PassengerCountSchema.validate(invalidPassengers);
        expect(error).toBeDefined();
        expect(error!.details[0]!.message).toContain('must be greater than or equal to 1');
      });

      it('should limit maximum passengers', () => {
        const invalidPassengers = { adults: 10, children: 0, infants: 0 };
        const { error } = PassengerCountSchema.validate(invalidPassengers);
        expect(error).toBeDefined();
        expect(error!.details[0]!.message).toContain('must be less than or equal to 9');
      });

      it('should default children and infants to 0', () => {
        const passengers = { adults: 2 };
        const { value } = PassengerCountSchema.validate(passengers);
        expect(value.children).toBe(0);
        expect(value.infants).toBe(0);
      });
    });

    describe('SearchCriteriaSchema', () => {
      const validCriteria = {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: new Date(Date.now() + 86400000), // tomorrow
        passengers: { adults: 2, children: 0, infants: 0 },
        cabinClass: 'economy',
        flexible: false
      };

      it('should validate valid search criteria', () => {
        const { error } = SearchCriteriaSchema.validate(validCriteria);
        expect(error).toBeUndefined();
      });

      it('should require valid airport codes', () => {
        const invalidCriteria = { ...validCriteria, origin: 'INVALID' };
        const { error } = SearchCriteriaSchema.validate(invalidCriteria);
        expect(error).toBeDefined();
        expect(error!.details[0]!.message).toContain('length must be 3 characters long');
      });

      it('should require future departure date', () => {
        const invalidCriteria = { ...validCriteria, departureDate: new Date(Date.now() - 86400000) };
        const { error } = SearchCriteriaSchema.validate(invalidCriteria);
        expect(error).toBeDefined();
        expect(error!.details[0]!.message).toContain('must be in the future');
      });

      it('should validate return date is after departure', () => {
        const invalidCriteria = { 
          ...validCriteria, 
          returnDate: new Date(validCriteria.departureDate.getTime() - 86400000)
        };
        const { error } = SearchCriteriaSchema.validate(invalidCriteria);
        expect(error).toBeDefined();
        expect(error!.details[0]!.message).toContain('must be after departure date');
      });

      it('should default cabin class to economy', () => {
        const criteria = { ...validCriteria };
        delete (criteria as any).cabinClass;
        const { value } = SearchCriteriaSchema.validate(criteria);
        expect(value.cabinClass).toBe('economy');
      });

      it('should default flexible to false', () => {
        const criteria = { ...validCriteria };
        delete (criteria as any).flexible;
        const { value } = SearchCriteriaSchema.validate(criteria);
        expect(value.flexible).toBe(false);
      });
    });

    describe('CreateFlightSearchSchema', () => {
      it('should validate complete search data', () => {
        const searchData = {
          userId: '123e4567-e89b-12d3-a456-426614174000',
          searchCriteria: {
            origin: 'JFK',
            destination: 'LAX',
            departureDate: new Date(Date.now() + 86400000),
            passengers: { adults: 2, children: 0, infants: 0 },
            cabinClass: 'economy' as const,
            flexible: false
          }
        };
        const { error } = CreateFlightSearchSchema.validate(searchData);
        expect(error).toBeUndefined();
      });

      it('should allow optional userId', () => {
        const searchData = {
          searchCriteria: {
            origin: 'JFK',
            destination: 'LAX',
            departureDate: new Date(Date.now() + 86400000),
            passengers: { adults: 1, children: 0, infants: 0 },
            cabinClass: 'economy' as const,
            flexible: false
          }
        };
        const { error } = CreateFlightSearchSchema.validate(searchData);
        expect(error).toBeUndefined();
      });
    });
  });

  describe('FlightSearchModel', () => {
    const mockSearchData: CreateFlightSearchData = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      searchCriteria: {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: new Date(Date.now() + 86400000), // tomorrow
        passengers: { adults: 2, children: 0, infants: 0 },
        cabinClass: 'economy',
        flexible: false
      }
    };

    const mockDbRow = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      user_id: '123e4567-e89b-12d3-a456-426614174000',
      origin: 'JFK',
      destination: 'LAX',
      departure_date: new Date(Date.now() + 86400000).toISOString(),
      return_date: null,
      passengers: { adults: 2, children: 0, infants: 0 },
      cabin_class: 'economy',
      flexible: false,
      status: 'pending',
      results: [],
      created_at: '2024-01-01T00:00:00Z',
      expires_at: '2024-01-01T01:00:00Z'
    };

    describe('createSearch', () => {
      it('should create a new flight search', async () => {
        (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockDbRow] });

        const result = await flightSearchModel.createSearch(mockSearchData);

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO flight_searches'),
          expect.arrayContaining([
            mockSearchData.userId,
            mockSearchData.searchCriteria.origin,
            mockSearchData.searchCriteria.destination,
            mockSearchData.searchCriteria.departureDate,
            null,
            JSON.stringify(mockSearchData.searchCriteria.passengers),
            mockSearchData.searchCriteria.cabinClass,
            mockSearchData.searchCriteria.flexible,
            'pending'
          ])
        );

        expect(result.id).toBe(mockDbRow.id);
        expect(result.userId).toBe(mockDbRow.user_id);
        expect(result.searchCriteria.origin).toBe(mockDbRow.origin);
        expect(result.status).toBe('pending');
      });

      it('should throw validation error for invalid data', async () => {
        const invalidData = {
          ...mockSearchData,
          searchCriteria: {
            ...mockSearchData.searchCriteria,
            origin: 'INVALID'
          }
        };

        await expect(flightSearchModel.createSearch(invalidData))
          .rejects.toThrow('Validation error');
      });
    });

    describe('getSearch', () => {
      it('should retrieve a flight search by ID', async () => {
        (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockDbRow] });

        const result = await flightSearchModel.getSearch(mockDbRow.id);

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT'),
          [mockDbRow.id]
        );

        expect(result).not.toBeNull();
        expect(result?.id).toBe(mockDbRow.id);
      });

      it('should return null for non-existent search', async () => {
        (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

        const result = await flightSearchModel.getSearch('non-existent-id');

        expect(result).toBeNull();
      });
    });

    describe('updateSearch', () => {
      const mockFlightResults: FlightResult[] = [{
        id: 'flight-1',
        airline: 'AA',
        flightNumber: 'AA123',
        route: [],
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
          fareBasis: 'YLOW'
        },
        duration: 360,
        layovers: 0
      }];

      it('should update search with results', async () => {
        const updateData: UpdateFlightSearchData = {
          results: mockFlightResults,
          status: 'completed'
        };

        (mockDb.query as jest.Mock).mockResolvedValue({ 
          rows: [{ ...mockDbRow, results: mockFlightResults, status: 'completed' }] 
        });

        const result = await flightSearchModel.updateSearch(mockDbRow.id, updateData);

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE flight_searches'),
          expect.arrayContaining([
            JSON.stringify(mockFlightResults),
            'completed',
            mockDbRow.id
          ])
        );

        expect(result?.status).toBe('completed');
        expect(result?.results).toEqual(mockFlightResults);
      });

      it('should throw error for invalid update data', async () => {
        const invalidData = { status: 'invalid-status' as any };

        await expect(flightSearchModel.updateSearch(mockDbRow.id, invalidData))
          .rejects.toThrow('Validation error');
      });
    });

    describe('getUserSearches', () => {
      it('should retrieve user searches with pagination', async () => {
        (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockDbRow] });

        const result = await flightSearchModel.getUserSearches(mockDbRow.user_id, 10, 0);

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('WHERE user_id = $1'),
          [mockDbRow.user_id, 10, 0]
        );

        expect(result).toHaveLength(1);
        expect(result[0]!.userId).toBe(mockDbRow.user_id);
      });
    });

    describe('deleteSearch', () => {
      it('should delete a search and return true', async () => {
        (mockDb.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

        const result = await flightSearchModel.deleteSearch(mockDbRow.id);

        expect(mockDb.query).toHaveBeenCalledWith(
          'DELETE FROM flight_searches WHERE id = $1',
          [mockDbRow.id]
        );

        expect(result).toBe(true);
      });

      it('should return false if search not found', async () => {
        (mockDb.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

        const result = await flightSearchModel.deleteSearch('non-existent-id');

        expect(result).toBe(false);
      });
    });

    describe('deleteExpiredSearches', () => {
      it('should delete expired searches and return count', async () => {
        (mockDb.query as jest.Mock).mockResolvedValue({ rowCount: 5 });

        const result = await flightSearchModel.deleteExpiredSearches();

        expect(mockDb.query).toHaveBeenCalledWith(
          'DELETE FROM flight_searches WHERE expires_at < CURRENT_TIMESTAMP'
        );

        expect(result).toBe(5);
      });
    });
  });

  describe('SearchService', () => {
    const validSearchData: CreateFlightSearchData = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      searchCriteria: {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: new Date(Date.now() + 86400000),
        passengers: { adults: 2, children: 0, infants: 0 },
        cabinClass: 'economy',
        flexible: false
      }
    };

    describe('createFlightSearch', () => {
      it('should create flight search with sanitized data', async () => {
        const mockResult = {
          id: '123e4567-e89b-12d3-a456-426614174001',
          userId: validSearchData.userId,
          searchCriteria: validSearchData.searchCriteria,
          results: [],
          status: 'pending' as const,
          createdAt: new Date(),
          expiresAt: new Date()
        };

        (mockDb.query as jest.Mock).mockResolvedValue({ 
          rows: [{
            id: mockResult.id,
            user_id: mockResult.userId,
            origin: 'JFK',
            destination: 'LAX',
            departure_date: validSearchData.searchCriteria.departureDate.toISOString(),
            return_date: null,
            passengers: validSearchData.searchCriteria.passengers,
            cabin_class: 'economy',
            flexible: false,
            status: 'pending',
            results: [],
            created_at: mockResult.createdAt,
            expires_at: mockResult.expiresAt
          }]
        });

        const result = await searchService.createFlightSearch(validSearchData);

        expect(result.id).toBe(mockResult.id);
        expect(result.searchCriteria.origin).toBe('JFK');
        expect(result.searchCriteria.destination).toBe('LAX');
      });

      it('should sanitize airport codes to uppercase', async () => {
        const searchDataWithLowercase = {
          ...validSearchData,
          searchCriteria: {
            ...validSearchData.searchCriteria,
            origin: 'jfk',
            destination: 'lax'
          }
        };

        (mockDb.query as jest.Mock).mockResolvedValue({ 
          rows: [{
            id: '123',
            user_id: validSearchData.userId,
            origin: 'JFK',
            destination: 'LAX',
            departure_date: validSearchData.searchCriteria.departureDate.toISOString(),
            return_date: null,
            passengers: validSearchData.searchCriteria.passengers,
            cabin_class: 'economy',
            flexible: false,
            status: 'pending',
            results: [],
            created_at: new Date(),
            expires_at: new Date()
          }]
        });

        await searchService.createFlightSearch(searchDataWithLowercase);

        expect(mockDb.query).toHaveBeenCalledWith(
          expect.any(String),
          expect.arrayContaining(['JFK', 'LAX'])
        );
      });

      it('should throw error for invalid search criteria', async () => {
        const invalidData = {
          ...validSearchData,
          searchCriteria: {
            ...validSearchData.searchCriteria,
            origin: 'INVALID'
          }
        };

        await expect(searchService.createFlightSearch(invalidData))
          .rejects.toThrow('Invalid search criteria');
      });
    });

    describe('validateAndSuggestCorrections', () => {
      it('should validate correct search criteria', () => {
        const result = searchService.validateAndSuggestCorrections(validSearchData.searchCriteria);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
      });

      it('should detect invalid airport codes', () => {
        const invalidCriteria = {
          ...validSearchData.searchCriteria,
          origin: 'INVALID'
        };

        const result = searchService.validateAndSuggestCorrections(invalidCriteria);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid origin airport code');
        expect(result.suggestions[0]).toContain('3-letter IATA airport code');
      });

      it('should detect same origin and destination', () => {
        const invalidCriteria = {
          ...validSearchData.searchCriteria,
          destination: validSearchData.searchCriteria.origin
        };

        const result = searchService.validateAndSuggestCorrections(invalidCriteria);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Origin and destination cannot be the same');
      });

      it('should detect past departure date', () => {
        const invalidCriteria = {
          ...validSearchData.searchCriteria,
          departureDate: new Date(Date.now() - 86400000)
        };

        const result = searchService.validateAndSuggestCorrections(invalidCriteria);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Departure date must be in the future');
      });

      it('should detect too many passengers', () => {
        const invalidCriteria = {
          ...validSearchData.searchCriteria,
          passengers: { adults: 10, children: 0, infants: 0 }
        };

        const result = searchService.validateAndSuggestCorrections(invalidCriteria);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Total passengers cannot exceed 9');
      });

      it('should detect infants exceeding adults', () => {
        const invalidCriteria = {
          ...validSearchData.searchCriteria,
          passengers: { adults: 1, children: 0, infants: 2 }
        };

        const result = searchService.validateAndSuggestCorrections(invalidCriteria);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Number of infants cannot exceed number of adults');
      });
    });

    describe('filterFlightResults', () => {
      const mockResults: FlightResult[] = [
        {
          id: 'flight-1',
          airline: 'AA',
          flightNumber: 'AA123',
          route: [{
            airline: 'AA',
            flightNumber: 'AA123',
            origin: 'JFK',
            destination: 'LAX',
            departureTime: new Date('2024-01-01T08:00:00Z'),
            arrivalTime: new Date('2024-01-01T14:00:00Z'),
            duration: 360
          }],
          pricing: { cashPrice: 500, currency: 'USD', pointsOptions: [], taxes: 50, fees: 25, totalPrice: 575 },
          availability: { availableSeats: 10, bookingClass: 'Y', fareBasis: 'YLOW' },
          duration: 360,
          layovers: 0
        },
        {
          id: 'flight-2',
          airline: 'DL',
          flightNumber: 'DL456',
          route: [{
            airline: 'DL',
            flightNumber: 'DL456',
            origin: 'JFK',
            destination: 'LAX',
            departureTime: new Date('2024-01-01T18:00:00Z'),
            arrivalTime: new Date('2024-01-02T01:00:00Z'),
            duration: 420
          }],
          pricing: { cashPrice: 600, currency: 'USD', pointsOptions: [], taxes: 60, fees: 30, totalPrice: 690 },
          availability: { availableSeats: 5, bookingClass: 'Y', fareBasis: 'YLOW' },
          duration: 420,
          layovers: 1
        }
      ];

      it('should filter by max price', () => {
        const filtered = searchService.filterFlightResults(mockResults, { maxPrice: 600 });
        expect(filtered).toHaveLength(1);
        expect(filtered[0]!.id).toBe('flight-1');
      });

      it('should filter by max duration', () => {
        const filtered = searchService.filterFlightResults(mockResults, { maxDuration: 400 });
        expect(filtered).toHaveLength(1);
        expect(filtered[0]!.id).toBe('flight-1');
      });

      it('should filter by max layovers', () => {
        const filtered = searchService.filterFlightResults(mockResults, { maxLayovers: 0 });
        expect(filtered).toHaveLength(1);
        expect(filtered[0]!.id).toBe('flight-1');
      });

      it('should filter by preferred airlines', () => {
        const filtered = searchService.filterFlightResults(mockResults, { preferredAirlines: ['AA'] });
        expect(filtered).toHaveLength(1);
        expect(filtered[0]!.airline).toBe('AA');
      });

      it('should filter by departure time range', () => {
        const filtered = searchService.filterFlightResults(mockResults, {
          departureTimeRange: { earliest: '06:00', latest: '12:00' }
        });
        expect(filtered).toHaveLength(1);
        // flight-2 departs at 18:00 UTC (12:00 local), which is within 06:00-12:00 range
        expect(filtered[0]!.id).toBe('flight-2');
      });
    });

    describe('sortFlightResults', () => {
      const mockResults: FlightResult[] = [
        {
          id: 'flight-1',
          airline: 'AA',
          flightNumber: 'AA123',
          route: [],
          pricing: { cashPrice: 600, currency: 'USD', pointsOptions: [], taxes: 60, fees: 30, totalPrice: 690 },
          availability: { availableSeats: 10, bookingClass: 'Y', fareBasis: 'YLOW' },
          duration: 420,
          layovers: 1,
          score: 85
        },
        {
          id: 'flight-2',
          airline: 'DL',
          flightNumber: 'DL456',
          route: [],
          pricing: { cashPrice: 500, currency: 'USD', pointsOptions: [], taxes: 50, fees: 25, totalPrice: 575 },
          availability: { availableSeats: 5, bookingClass: 'Y', fareBasis: 'YLOW' },
          duration: 360,
          layovers: 0,
          score: 90
        }
      ];

      it('should sort by price ascending', () => {
        const sorted = searchService.sortFlightResults(mockResults, 'price', 'asc');
        expect(sorted[0]!.id).toBe('flight-2');
        expect(sorted[1]!.id).toBe('flight-1');
      });

      it('should sort by price descending', () => {
        const sorted = searchService.sortFlightResults(mockResults, 'price', 'desc');
        expect(sorted[0]!.id).toBe('flight-1');
        expect(sorted[1]!.id).toBe('flight-2');
      });

      it('should sort by duration', () => {
        const sorted = searchService.sortFlightResults(mockResults, 'duration', 'asc');
        expect(sorted[0]!.id).toBe('flight-2');
        expect(sorted[1]!.id).toBe('flight-1');
      });

      it('should sort by score (higher is better)', () => {
        const sorted = searchService.sortFlightResults(mockResults, 'score', 'asc');
        expect(sorted[0]!.id).toBe('flight-2'); // Higher score comes first
        expect(sorted[1]!.id).toBe('flight-1');
      });
    });
  });
});