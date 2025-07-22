import { Pool } from 'pg';
import AnalyticsService from '../services/AnalyticsService';
import { 
  UserActivity, 
  SearchAnalytics, 
  BookingAnalytics, 
  PerformanceMetric, 
  ErrorAnalytics 
} from '../models/Analytics';

// Mock the pg Pool
jest.mock('pg', () => {
  const mockQuery = jest.fn();
  const mockPool = {
    query: mockQuery,
  };
  return {
    Pool: jest.fn(() => mockPool),
  };
});

// Mock logger
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = new Pool();
    analyticsService = new AnalyticsService(mockPool);
  });

  describe('trackUserActivity', () => {
    it('should insert user activity into the database', async () => {
      const userActivity: UserActivity = {
        userId: '123e4567-e89b-12d3-a456-426614174000' as any,
        activityType: 'login',
        pagePath: '/login',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session123',
        durationSeconds: 60,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await analyticsService.trackUserActivity(userActivity);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_activity'),
        [
          userActivity.userId,
          userActivity.activityType,
          userActivity.pagePath,
          userActivity.ipAddress,
          userActivity.userAgent,
          userActivity.sessionId,
          userActivity.durationSeconds,
        ]
      );
    });

    it('should handle errors when tracking user activity', async () => {
      const userActivity: UserActivity = {
        userId: '123e4567-e89b-12d3-a456-426614174000' as any,
        activityType: 'login',
      };

      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(analyticsService.trackUserActivity(userActivity)).rejects.toThrow('Failed to track user activity');
    });
  });

  describe('trackSearchAnalytics', () => {
    it('should insert search analytics into the database', async () => {
      const searchData: SearchAnalytics = {
        searchId: '123e4567-e89b-12d3-a456-426614174000' as any,
        userId: '123e4567-e89b-12d3-a456-426614174000' as any,
        origin: 'JFK',
        destination: 'LAX',
        searchDate: new Date(),
        cabinClass: 'economy',
        flexibleDates: false,
        resultsCount: 10,
        selectedResultId: '123e4567-e89b-12d3-a456-426614174001' as any,
        searchToSelectionSeconds: 30,
        searchCriteria: { passengers: 2 },
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await analyticsService.trackSearchAnalytics(searchData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO search_analytics'),
        expect.arrayContaining([
          searchData.searchId,
          searchData.userId,
          searchData.origin,
          searchData.destination,
          searchData.searchDate,
          searchData.cabinClass,
          searchData.flexibleDates,
          searchData.resultsCount,
          searchData.selectedResultId,
          searchData.searchToSelectionSeconds,
          expect.any(String), // JSON.stringify(searchData.searchCriteria)
        ])
      );
    });
  });

  describe('trackBookingAnalytics', () => {
    it('should insert booking analytics into the database', async () => {
      const bookingData: BookingAnalytics = {
        bookingId: '123e4567-e89b-12d3-a456-426614174000' as any,
        userId: '123e4567-e89b-12d3-a456-426614174000' as any,
        searchId: '123e4567-e89b-12d3-a456-426614174001' as any,
        bookingValue: 500.50,
        pointsUsed: 25000,
        pointsValue: 250.00,
        paymentMethod: 'credit_card',
        bookingCompletionTime: 300,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await analyticsService.trackBookingAnalytics(bookingData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO booking_analytics'),
        expect.arrayContaining([
          bookingData.bookingId,
          bookingData.userId,
          bookingData.searchId,
          bookingData.bookingValue,
          bookingData.pointsUsed,
          bookingData.pointsValue,
          bookingData.paymentMethod,
          bookingData.bookingCompletionTime,
          null, // abandonedStep
        ])
      );
    });
  });

  describe('trackPerformanceMetric', () => {
    it('should insert performance metric into the database', async () => {
      const metric: PerformanceMetric = {
        metricName: 'response_time',
        metricValue: 150.5,
        metricUnit: 'ms',
        component: 'api',
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await analyticsService.trackPerformanceMetric(metric);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO performance_metrics'),
        [
          metric.metricName,
          metric.metricValue,
          metric.metricUnit,
          metric.component,
        ]
      );
    });
  });

  describe('trackErrorAnalytics', () => {
    it('should insert error analytics into the database', async () => {
      const errorData: ErrorAnalytics = {
        errorType: 'API_ERROR',
        errorMessage: 'Failed to fetch data',
        stackTrace: 'Error: Failed to fetch data\n    at fetchData (/app/src/services/api.ts:25:7)',
        userId: '123e4567-e89b-12d3-a456-426614174000' as any,
        path: '/api/flights',
        requestData: { query: 'JFK to LAX' },
      };

      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await analyticsService.trackErrorAnalytics(errorData);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO error_analytics'),
        expect.arrayContaining([
          errorData.errorType,
          errorData.errorMessage,
          errorData.stackTrace,
          errorData.userId,
          errorData.path,
          expect.any(String), // JSON.stringify(errorData.requestData)
        ])
      );
    });
  });

  describe('getDashboardData', () => {
    it('should return dashboard data with metrics', async () => {
      // Mock responses for each query
      mockPool.query.mockImplementation((query) => {
        if (query.includes('COUNT(*) FROM users')) {
          return Promise.resolve({ rows: [{ count: '1000' }] });
        } else if (query.includes('COUNT(DISTINCT user_id) FROM user_activity')) {
          return Promise.resolve({ rows: [{ count: '500' }] });
        } else if (query.includes('COUNT(*) FROM users WHERE created_at')) {
          return Promise.resolve({ rows: [{ count: '100' }] });
        } else if (query.includes('COUNT(*) FROM search_analytics')) {
          return Promise.resolve({ rows: [{ count: '2000' }] });
        } else if (query.includes('COUNT(DISTINCT sa.search_id)')) {
          return Promise.resolve({ rows: [{ count: '300' }] });
        } else if (query.includes('AVG(results_count)')) {
          return Promise.resolve({ rows: [{ avg: '15.5' }] });
        } else if (query.includes('SELECT origin, COUNT(*)')) {
          return Promise.resolve({ 
            rows: [
              { origin: 'JFK', count: '200' },
              { origin: 'LAX', count: '150' },
            ] 
          });
        } else if (query.includes('SELECT destination, COUNT(*)')) {
          return Promise.resolve({ 
            rows: [
              { destination: 'LHR', count: '180' },
              { destination: 'CDG', count: '120' },
            ] 
          });
        } else if (query.includes('COUNT(*) FROM booking_analytics') && query.includes('abandoned_step IS NULL')) {
          return Promise.resolve({ rows: [{ count: '400' }] });
        } else if (query.includes('SUM(booking_value)')) {
          return Promise.resolve({ rows: [{ sum: '200000.50' }] });
        } else if (query.includes('COUNT(*) FROM booking_analytics WHERE created_at')) {
          return Promise.resolve({ rows: [{ count: '500' }] });
        } else if (query.includes('COUNT(*) FROM booking_analytics') && query.includes('points_used > 0')) {
          return Promise.resolve({ rows: [{ count: '150' }] });
        } else if (query.includes('AVG(metric_value)') && query.includes('response_time')) {
          return Promise.resolve({ rows: [{ avg: '120.5' }] });
        } else if (query.includes('COUNT(*) FROM user_activity WHERE activity_type = \'api_request\'')) {
          return Promise.resolve({ rows: [{ count: '10000' }] });
        } else if (query.includes('COUNT(*) FROM error_analytics')) {
          return Promise.resolve({ rows: [{ count: '50' }] });
        } else if (query.includes('AVG(metric_value)') && query.includes('search_latency')) {
          return Promise.resolve({ rows: [{ avg: '250.3' }] });
        } else if (query.includes('AVG(metric_value)') && query.includes('uptime_percentage')) {
          return Promise.resolve({ rows: [{ avg: '99.95' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await analyticsService.getDashboardData();

      expect(result).toEqual({
        userMetrics: {
          totalUsers: 1000,
          activeUsers: 500,
          newUsers: 100,
          retentionRate: 50,
        },
        searchMetrics: {
          totalSearches: 2000,
          searchesToBookingRate: 15,
          averageResultsPerSearch: 15.5,
          popularOrigins: [
            { origin: 'JFK', count: 200 },
            { origin: 'LAX', count: 150 },
          ],
          popularDestinations: [
            { destination: 'LHR', count: 180 },
            { destination: 'CDG', count: 120 },
          ],
        },
        bookingMetrics: {
          totalBookings: 400,
          totalRevenue: 200000.5,
          averageBookingValue: 500.00125,
          conversionRate: 80,
          abandonmentRate: 20,
          pointsRedemptions: 150,
        },
        performanceMetrics: {
          averageApiResponseTime: 120.5,
          errorRate: 0.5,
          searchLatency: 250.3,
          systemUptime: 99.95,
        },
      });
    });
  });
});