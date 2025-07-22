import { Pool } from 'pg';
import { PreferenceLearningService } from '../services/PreferenceLearningService';
import { TravelPreferences } from '../models/TravelPreferences';

// Mock database
const mockDb = {
  query: jest.fn(),
} as unknown as Pool;

// Mock TravelPreferencesModel
const mockPreferencesModel = {
  findByUserId: jest.fn(),
  upsert: jest.fn(),
};

jest.mock('../models/TravelPreferences', () => ({
  TravelPreferencesModel: jest.fn().mockImplementation(() => mockPreferencesModel),
}));

describe('PreferenceLearningService', () => {
  let service: PreferenceLearningService;

  beforeEach(() => {
    service = new PreferenceLearningService(mockDb);
    jest.clearAllMocks();
  });

  const mockBookingHistory = [
    {
      flight_details: {
        route: [
          { airline: 'AA', origin: 'JFK', destination: 'LAX', cabinClass: 'economy' },
        ],
        layovers: 0,
      },
      travel_date: '2024-06-01',
      created_at: '2024-05-15T10:00:00Z',
    },
    {
      flight_details: {
        route: [
          { airline: 'AA', origin: 'JFK', destination: 'ORD', cabinClass: 'economy' },
          { airline: 'AA', origin: 'ORD', destination: 'SFO', cabinClass: 'economy' },
        ],
        layovers: 1,
      },
      travel_date: '2024-07-01',
      created_at: '2024-06-10T10:00:00Z',
    },
    {
      flight_details: {
        route: [
          { airline: 'DL', origin: 'LGA', destination: 'ATL', cabinClass: 'business' },
          { airline: 'DL', origin: 'ATL', destination: 'LAX', cabinClass: 'business' },
        ],
        layovers: 1,
      },
      travel_date: '2024-08-01',
      created_at: '2024-07-15T10:00:00Z',
    },
    {
      flight_details: {
        route: [
          { airline: 'AA', origin: 'JFK', destination: 'MIA', cabinClass: 'economy' },
        ],
        layovers: 0,
      },
      travel_date: '2024-09-01',
      created_at: '2024-08-10T10:00:00Z',
    },
  ];

  const mockSearchHistory = [
    { origin: 'JFK', destination: 'LAX', created_at: '2024-05-01T10:00:00Z' },
    { origin: 'LGA', destination: 'ORD', created_at: '2024-06-01T10:00:00Z' },
  ];

  const mockCurrentPreferences: TravelPreferences = {
    userId: 'user-123',
    preferredAirlines: ['UA'],
    preferredAirports: ['ORD'],
    seatPreference: 'window',
    maxLayovers: 2,
    preferredCabinClass: 'premium',
  };

  describe('learnAndUpdatePreferences', () => {
    beforeEach(() => {
      mockPreferencesModel.findByUserId.mockResolvedValue(mockCurrentPreferences);
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockBookingHistory }) // getBookingHistory
        .mockResolvedValueOnce({ rows: mockSearchHistory }); // getSearchHistory
    });

    it('should learn preferences from booking history', async () => {
      const mockUpdatedPreferences = {
        ...mockCurrentPreferences,
        preferredAirlines: ['UA', 'AA', 'DL'],
        preferredAirports: ['ORD', 'JFK', 'LAX', 'LGA', 'ATL'],
      };
      mockPreferencesModel.upsert.mockResolvedValue(mockUpdatedPreferences);

      const result = await service.learnAndUpdatePreferences('user-123');

      expect(result.updatedPreferences).toBeDefined();
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.learningConfidence).toBe(0.4); // 4 bookings / 10 = 0.4

      // Should have airline insights
      const airlineInsights = result.insights.filter(i => i.type === 'airline');
      expect(airlineInsights.length).toBeGreaterThan(0);
      expect(airlineInsights[0].insight).toContain('AA');

      // Should have airport insights
      const airportInsights = result.insights.filter(i => i.type === 'airport');
      expect(airportInsights.length).toBeGreaterThan(0);

      // Should have cabin class insights
      const cabinInsights = result.insights.filter(i => i.type === 'cabin_class');
      expect(cabinInsights.length).toBeGreaterThan(0);

      // Should have layover insights
      const layoverInsights = result.insights.filter(i => i.type === 'layover');
      expect(layoverInsights.length).toBeGreaterThan(0);
    });

    it('should return current preferences when no booking history', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // empty booking history
        .mockResolvedValueOnce({ rows: [] }); // empty search history

      const result = await service.learnAndUpdatePreferences('user-123');

      expect(result.updatedPreferences).toEqual(mockCurrentPreferences);
      expect(result.learningConfidence).toBe(0);
      expect(result.insights[0].insight).toContain('No booking history');
    });

    it('should not update preferences when confidence is too low', async () => {
      const singleBooking = [mockBookingHistory[0]];
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: singleBooking })
        .mockResolvedValueOnce({ rows: mockSearchHistory });

      const result = await service.learnAndUpdatePreferences('user-123');

      expect(result.learningConfidence).toBe(0.1); // 1 booking / 10 = 0.1
      // With low confidence, should return current preferences
      expect(result.updatedPreferences).toEqual(mockCurrentPreferences);
    });
  });

  describe('learnAirlinePreferences', () => {
    it('should identify frequently used airlines', () => {
      const result = (service as any).learnAirlinePreferences(mockBookingHistory, mockCurrentPreferences);

      expect(result.suggestions).toContain('AA');
      expect(result.suggestions).toContain('DL');
      
      const insights = result.insights;
      const frequentAirlineInsight = insights.find((i: any) => i.insight.includes('frequently book'));
      expect(frequentAirlineInsight).toBeDefined();
      expect(frequentAirlineInsight.data.airline).toBe('AA');
    });

    it('should suggest new airlines not in current preferences', () => {
      const result = (service as any).learnAirlinePreferences(mockBookingHistory, mockCurrentPreferences);

      const newAirlineInsight = result.insights.find((i: any) => i.insight.includes('Consider adding'));
      expect(newAirlineInsight).toBeDefined();
      expect(newAirlineInsight.data.newAirlines).toContain('AA');
      expect(newAirlineInsight.data.newAirlines).toContain('DL');
    });

    it('should handle empty booking history', () => {
      const result = (service as any).learnAirlinePreferences([], mockCurrentPreferences);

      expect(result.suggestions).toEqual([]);
      expect(result.insights).toEqual([]);
    });
  });

  describe('learnAirportPreferences', () => {
    it('should identify frequently used airports', () => {
      const result = (service as any).learnAirportPreferences(
        mockBookingHistory, 
        mockSearchHistory, 
        mockCurrentPreferences
      );

      expect(result.suggestions).toContain('JFK');
      expect(result.suggestions).toContain('LAX');
      
      const insights = result.insights;
      const frequentAirportInsight = insights.find((i: any) => i.insight.includes('most used airports'));
      expect(frequentAirportInsight).toBeDefined();
    });

    it('should identify hub airports', () => {
      const hubBookingHistory = [
        {
          flight_details: {
            route: [
              { airline: 'AA', origin: 'ATL', destination: 'DFW', cabinClass: 'economy' },
            ],
            layovers: 0,
          },
        },
        {
          flight_details: {
            route: [
              { airline: 'DL', origin: 'ATL', destination: 'ORD', cabinClass: 'economy' },
            ],
            layovers: 0,
          },
        },
      ];

      const result = (service as any).learnAirportPreferences(
        hubBookingHistory, 
        [], 
        mockCurrentPreferences
      );

      const hubInsight = result.insights.find((i: any) => i.insight.includes('hub airports'));
      expect(hubInsight).toBeDefined();
      expect(hubInsight.data.hubAirports).toContain('ATL');
    });
  });

  describe('learnCabinClassPreferences', () => {
    it('should identify consistent cabin class usage', () => {
      const economyBookings = mockBookingHistory.filter(b => 
        b.flight_details.route.some((r: any) => r.cabinClass === 'economy')
      );

      const result = (service as any).learnCabinClassPreferences(economyBookings, mockCurrentPreferences);

      expect(result.suggestion).toBe('economy');
      expect(result.insights[0].insight).toContain('consistently book economy');
    });

    it('should not suggest when usage is inconsistent', () => {
      const result = (service as any).learnCabinClassPreferences(mockBookingHistory, mockCurrentPreferences);

      // Mixed economy and business bookings should not result in a strong suggestion
      expect(result.suggestion).toBeNull();
    });
  });

  describe('learnLayoverPreferences', () => {
    it('should identify direct flight preference', () => {
      const directFlightBookings = [
        {
          flight_details: { layovers: 0 },
        },
        {
          flight_details: { layovers: 0 },
        },
        {
          flight_details: { layovers: 0 },
        },
      ];

      const result = (service as any).learnLayoverPreferences(directFlightBookings, mockCurrentPreferences);

      expect(result.suggestion).toBe(0);
      expect(result.insights[0].insight).toContain('prefer direct flights');
    });

    it('should calculate average layovers', () => {
      const result = (service as any).learnLayoverPreferences(mockBookingHistory, mockCurrentPreferences);

      // Average layovers: (0 + 1 + 1 + 0) / 4 = 0.5, rounded up to 1
      expect(result.suggestion).toBe(1);
      expect(result.insights[0].insight).toContain('typically accept up to 1 layovers');
    });

    it('should handle insufficient data', () => {
      const result = (service as any).learnLayoverPreferences([mockBookingHistory[0]], mockCurrentPreferences);

      expect(result.suggestion).toBeNull();
      expect(result.insights).toEqual([]);
    });
  });

  describe('learnTimingPreferences', () => {
    it('should analyze advance booking patterns', () => {
      const result = (service as any).learnTimingPreferences(mockBookingHistory);

      const timingInsights = result.insights.filter((i: any) => i.type === 'timing');
      const advanceBookingInsight = timingInsights.find((i: any) => i.insight.includes('days in advance'));
      
      expect(advanceBookingInsight).toBeDefined();
      expect(advanceBookingInsight.data.bookingPattern).toBeDefined();
    });

    it('should analyze seasonal patterns', () => {
      const result = (service as any).learnTimingPreferences(mockBookingHistory);

      const seasonalInsight = result.insights.find((i: any) => i.insight.includes('often travel in'));
      expect(seasonalInsight).toBeDefined();
    });

    it('should handle insufficient data', () => {
      const result = (service as any).learnTimingPreferences([mockBookingHistory[0]]);

      expect(result.insights).toEqual([]);
    });
  });

  describe('createUpdatedPreferences', () => {
    it('should merge preferences with high confidence', async () => {
      const suggestions = {
        airlines: ['AA', 'DL'],
        airports: ['JFK', 'LAX'],
        cabinClass: 'economy',
        maxLayovers: 1,
      };

      mockPreferencesModel.upsert.mockResolvedValue({
        ...mockCurrentPreferences,
        preferredAirlines: ['UA', 'AA', 'DL'],
        preferredAirports: ['ORD', 'JFK', 'LAX'],
        preferredCabinClass: 'economy',
        maxLayovers: 1,
      });

      const result = await (service as any).createUpdatedPreferences(
        'user-123',
        mockCurrentPreferences,
        suggestions,
        0.8 // High confidence
      );

      expect(result.preferredAirlines).toContain('AA');
      expect(result.preferredAirlines).toContain('DL');
      expect(result.preferredCabinClass).toBe('economy');
      expect(result.maxLayovers).toBe(1);
    });

    it('should not update with low confidence', async () => {
      const suggestions = {
        airlines: ['AA', 'DL'],
        airports: ['JFK', 'LAX'],
        cabinClass: 'economy',
        maxLayovers: 1,
      };

      const result = await (service as any).createUpdatedPreferences(
        'user-123',
        mockCurrentPreferences,
        suggestions,
        0.2 // Low confidence
      );

      expect(result).toEqual(mockCurrentPreferences);
    });
  });

  describe('mergeArrayPreferences', () => {
    it('should merge arrays with sufficient confidence', () => {
      const existing = ['UA', 'SW'];
      const suggested = ['AA', 'DL'];
      const confidence = 0.7;

      const result = (service as any).mergeArrayPreferences(existing, suggested, confidence);

      expect(result).toContain('UA');
      expect(result).toContain('SW');
      expect(result).toContain('AA');
      expect(result).toContain('DL');
    });

    it('should not merge with low confidence', () => {
      const existing = ['UA', 'SW'];
      const suggested = ['AA', 'DL'];
      const confidence = 0.3;

      const result = (service as any).mergeArrayPreferences(existing, suggested, confidence);

      expect(result).toEqual(existing);
    });

    it('should limit merged results to 5 items', () => {
      const existing = ['A', 'B', 'C'];
      const suggested = ['D', 'E', 'F', 'G', 'H'];
      const confidence = 0.8;

      const result = (service as any).mergeArrayPreferences(existing, suggested, confidence);

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });
});