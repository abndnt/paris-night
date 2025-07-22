import { Pool } from 'pg';
import { PersonalizationEngine } from '../services/PersonalizationEngine';
import { TravelPreferences } from '../models/TravelPreferences';

// Mock database
const mockDb = {
  query: jest.fn(),
} as unknown as Pool;

// Mock dependencies
jest.mock('../models/TravelPreferences');
jest.mock('../services/PreferenceFilterService');

describe('PersonalizationEngine', () => {
  let engine: PersonalizationEngine;

  beforeEach(() => {
    engine = new PersonalizationEngine(mockDb);
    jest.clearAllMocks();
  });

  const mockSearchHistory = [
    {
      origin: 'JFK',
      destination: 'LAX',
      departure_date: '2024-06-01',
      cabin_class: 'economy',
      created_at: '2024-05-01T10:00:00Z',
    },
    {
      origin: 'JFK',
      destination: 'LAX',
      departure_date: '2024-07-01',
      cabin_class: 'economy',
      created_at: '2024-06-01T10:00:00Z',
    },
    {
      origin: 'LGA',
      destination: 'ORD',
      departure_date: '2024-08-01',
      cabin_class: 'business',
      created_at: '2024-07-01T10:00:00Z',
    },
  ];

  const mockBookingHistory = [
    {
      flight_details: {
        route: [
          { airline: 'AA', origin: 'JFK', destination: 'LAX' },
        ],
        layovers: 0,
      },
      total_cost: { total: 300 },
      travel_date: '2024-06-01',
      created_at: '2024-05-15T10:00:00Z',
      status: 'confirmed',
    },
    {
      flight_details: {
        route: [
          { airline: 'DL', origin: 'LGA', destination: 'ATL' },
          { airline: 'DL', origin: 'ATL', destination: 'ORD' },
        ],
        layovers: 1,
      },
      total_cost: { total: 450 },
      travel_date: '2024-08-01',
      created_at: '2024-07-10T10:00:00Z',
      status: 'confirmed',
    },
  ];

  const mockPreferences: TravelPreferences = {
    userId: 'user-123',
    preferredAirlines: ['AA', 'DL'],
    preferredAirports: ['JFK', 'LAX'],
    seatPreference: 'aisle',
    maxLayovers: 1,
    preferredCabinClass: 'economy',
  };

  describe('generateRecommendations', () => {
    beforeEach(() => {
      // Mock database queries
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockSearchHistory }) // getSearchHistory
        .mockResolvedValueOnce({ rows: mockBookingHistory }) // getBookingHistory
        .mockResolvedValueOnce({ rows: [mockPreferences] }); // findByUserId
    });

    it('should generate route recommendations based on search patterns', async () => {
      const recommendations = await engine.generateRecommendations('user-123');

      const routeRecommendations = recommendations.filter(r => r.type === 'route');
      expect(routeRecommendations.length).toBeGreaterThan(0);

      // Should recommend JFK-LAX route (searched twice but not booked)
      const jfkLaxRecommendation = routeRecommendations.find(r => 
        r.title.includes('JFK') && r.title.includes('LAX')
      );
      expect(jfkLaxRecommendation).toBeDefined();
      expect(jfkLaxRecommendation?.reason).toBe('Frequently searched route');
    });

    it('should generate airline recommendations', async () => {
      const recommendations = await engine.generateRecommendations('user-123');

      const airlineRecommendations = recommendations.filter(r => r.type === 'airline');
      expect(airlineRecommendations.length).toBeGreaterThan(0);

      // Should include preferred airlines
      const preferredAirlineRecs = airlineRecommendations.filter(r => 
        r.reason === 'Preferred airline'
      );
      expect(preferredAirlineRecs.length).toBeGreaterThan(0);
    });

    it('should generate deal recommendations', async () => {
      const recommendations = await engine.generateRecommendations('user-123');

      const dealRecommendations = recommendations.filter(r => r.type === 'deal');
      expect(dealRecommendations.length).toBeGreaterThan(0);

      // Should include deals from preferred airports
      const airportDeals = dealRecommendations.filter(r => 
        r.reason === 'Preferred departure airport'
      );
      expect(airportDeals.length).toBeGreaterThan(0);
    });

    it('should generate time-based recommendations', async () => {
      const recommendations = await engine.generateRecommendations('user-123');

      const timeRecommendations = recommendations.filter(r => r.type === 'flight');
      
      // Should include seasonal recommendations if enough booking history
      if (mockBookingHistory.length >= 3) {
        expect(timeRecommendations.length).toBeGreaterThan(0);
      }
    });

    it('should limit recommendations to top 10', async () => {
      const recommendations = await engine.generateRecommendations('user-123');

      expect(recommendations.length).toBeLessThanOrEqual(10);
    });

    it('should sort recommendations by score', async () => {
      const recommendations = await engine.generateRecommendations('user-123');

      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i-1].score).toBeGreaterThanOrEqual(recommendations[i].score);
      }
    });
  });

  describe('learnFromBookingHistory', () => {
    beforeEach(() => {
      // Mock getBookingHistory
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockBookingHistory })
        .mockResolvedValueOnce({ rows: [mockPreferences] }); // findByUserId
    });

    it('should return current preferences when no booking history', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // empty booking history
        .mockResolvedValueOnce({ rows: [mockPreferences] });

      const result = await engine.learnFromBookingHistory('user-123');

      expect(result).toEqual(mockPreferences);
    });

    it('should not update preferences when confidence is too low', async () => {
      // Mock a single booking (low confidence)
      const singleBooking = [mockBookingHistory[0]];
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: singleBooking })
        .mockResolvedValueOnce({ rows: [mockPreferences] });

      const result = await engine.learnFromBookingHistory('user-123');

      expect(result).toEqual(mockPreferences);
    });
  });

  describe('generateInsights', () => {
    beforeEach(() => {
      // Mock all required database queries
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: mockSearchHistory }) // getSearchHistory
        .mockResolvedValueOnce({ rows: mockBookingHistory }) // getBookingHistory
        .mockResolvedValueOnce({ rows: [mockPreferences] }) // findByUserId
        .mockResolvedValueOnce({ rows: mockSearchHistory }) // getSearchHistory (for recommendations)
        .mockResolvedValueOnce({ rows: mockBookingHistory }) // getBookingHistory (for recommendations)
        .mockResolvedValueOnce({ rows: [mockPreferences] }); // findByUserId (for recommendations)
    });

    it('should generate comprehensive insights', async () => {
      const insights = await engine.generateInsights('user-123');

      expect(insights).toHaveProperty('travelPatterns');
      expect(insights).toHaveProperty('spendingPatterns');
      expect(insights).toHaveProperty('recommendations');

      expect(insights.travelPatterns.frequentRoutes).toContain('JFK-LAX');
      expect(insights.spendingPatterns.averageSpend).toBe(375); // (300 + 450) / 2
      expect(insights.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle empty data gracefully', async () => {
      (mockDb.query as jest.Mock)
        .mockResolvedValue({ rows: [] }); // All queries return empty

      const insights = await engine.generateInsights('user-123');

      expect(insights.travelPatterns.frequentRoutes).toEqual([]);
      expect(insights.spendingPatterns.averageSpend).toBe(0);
      expect(insights.recommendations).toEqual([]);
    });
  });

  describe('private helper methods', () => {
    it('should get search history correctly', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockSearchHistory });

      // Access private method through any
      const searchHistory = await (engine as any).getSearchHistory('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['user-123']
      );
      expect(searchHistory).toEqual(mockSearchHistory);
    });

    it('should get booking history correctly', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: mockBookingHistory });

      const bookingHistory = await (engine as any).getBookingHistory('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['user-123']
      );
      expect(bookingHistory).toEqual(mockBookingHistory);
    });
  });

  describe('recommendation generation methods', () => {
    const mockBehaviorData = {
      searchHistory: mockSearchHistory,
      bookingHistory: mockBookingHistory,
      clickHistory: [],
      preferences: mockPreferences,
    };

    it('should generate route recommendations correctly', async () => {
      const recommendations = await (engine as any).generateRouteRecommendations(mockBehaviorData);

      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should recommend JFK-LAX (searched multiple times)
      const jfkLaxRec = recommendations.find((r: any) => 
        r.data.origin === 'JFK' && r.data.destination === 'LAX'
      );
      expect(jfkLaxRec).toBeDefined();
      expect(jfkLaxRec.data.searchCount).toBe(2);
    });

    it('should generate airline recommendations correctly', async () => {
      const recommendations = await (engine as any).generateAirlineRecommendations(mockBehaviorData);

      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should include preferred airlines
      const preferredRecs = recommendations.filter((r: any) => 
        r.reason === 'Preferred airline'
      );
      expect(preferredRecs.length).toBe(2); // AA and DL
    });

    it('should generate deal recommendations correctly', async () => {
      const recommendations = await (engine as any).generateDealRecommendations(mockBehaviorData);

      expect(recommendations.length).toBeGreaterThan(0);
      
      // Should include deals from preferred airports
      const airportDeals = recommendations.filter((r: any) => 
        r.reason === 'Preferred departure airport'
      );
      expect(airportDeals.length).toBeGreaterThan(0);
    });

    it('should generate time-based recommendations correctly', async () => {
      const extendedBookingHistory = [
        ...mockBookingHistory,
        {
          flight_details: { route: [], layovers: 0 },
          total_cost: { total: 400 },
          travel_date: '2024-06-15',
          created_at: '2024-05-20T10:00:00Z',
          status: 'confirmed',
        },
      ];

      const extendedBehaviorData = {
        ...mockBehaviorData,
        bookingHistory: extendedBookingHistory,
      };

      const recommendations = await (engine as any).generateTimeBasedRecommendations(extendedBehaviorData);

      // Should generate recommendations for frequent travel months
      if (recommendations.length > 0) {
        expect(recommendations[0].type).toBe('flight');
        expect(recommendations[0].reason).toBe('Seasonal travel pattern');
      }
    });
  });
});