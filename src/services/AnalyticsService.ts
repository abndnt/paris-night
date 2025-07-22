import { Pool } from 'pg';
import { UUID } from 'crypto';
import { 
  UserActivity, 
  SearchAnalytics, 
  BookingAnalytics, 
  PerformanceMetric, 
  ErrorAnalytics,
  AnalyticsDashboardData,
  AnalyticsQueryParams
} from '../models/Analytics';
import logger from '../utils/logger';

/**
 * Service for tracking and retrieving analytics data
 */
class AnalyticsService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Track user activity
   */
  async trackUserActivity(activity: UserActivity): Promise<void> {
    try {
      const query = `
        INSERT INTO user_activity 
        (user_id, activity_type, page_path, ip_address, user_agent, session_id, duration_seconds)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await this.db.query(query, [
        activity.userId,
        activity.activityType,
        activity.pagePath || null,
        activity.ipAddress || null,
        activity.userAgent || null,
        activity.sessionId || null,
        activity.durationSeconds || null
      ]);
    } catch (error) {
      logger.error('Error tracking user activity:', error);
      throw new Error('Failed to track user activity');
    }
  }

  /**
   * Track search analytics
   */
  async trackSearchAnalytics(searchData: SearchAnalytics): Promise<void> {
    try {
      const query = `
        INSERT INTO search_analytics 
        (search_id, user_id, origin, destination, search_date, cabin_class, 
         flexible_dates, results_count, selected_result_id, search_to_selection_seconds, search_criteria)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;
      
      await this.db.query(query, [
        searchData.searchId,
        searchData.userId,
        searchData.origin,
        searchData.destination,
        searchData.searchDate,
        searchData.cabinClass,
        searchData.flexibleDates,
        searchData.resultsCount,
        searchData.selectedResultId || null,
        searchData.searchToSelectionSeconds || null,
        JSON.stringify(searchData.searchCriteria)
      ]);
    } catch (error) {
      logger.error('Error tracking search analytics:', error);
      throw new Error('Failed to track search analytics');
    }
  }

  /**
   * Track booking analytics
   */
  async trackBookingAnalytics(bookingData: BookingAnalytics): Promise<void> {
    try {
      const query = `
        INSERT INTO booking_analytics 
        (booking_id, user_id, search_id, booking_value, points_used, 
         points_value, payment_method, booking_completion_time, abandoned_step)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      await this.db.query(query, [
        bookingData.bookingId,
        bookingData.userId,
        bookingData.searchId || null,
        bookingData.bookingValue,
        bookingData.pointsUsed || null,
        bookingData.pointsValue || null,
        bookingData.paymentMethod,
        bookingData.bookingCompletionTime || null,
        bookingData.abandonedStep || null
      ]);
    } catch (error) {
      logger.error('Error tracking booking analytics:', error);
      throw new Error('Failed to track booking analytics');
    }
  }

  /**
   * Track system performance metrics
   */
  async trackPerformanceMetric(metric: PerformanceMetric): Promise<void> {
    try {
      const query = `
        INSERT INTO performance_metrics 
        (metric_name, metric_value, metric_unit, component)
        VALUES ($1, $2, $3, $4)
      `;
      
      await this.db.query(query, [
        metric.metricName,
        metric.metricValue,
        metric.metricUnit,
        metric.component
      ]);
    } catch (error) {
      logger.error('Error tracking performance metric:', error);
      throw new Error('Failed to track performance metric');
    }
  }

  /**
   * Track error analytics
   */
  async trackErrorAnalytics(errorData: ErrorAnalytics): Promise<void> {
    try {
      const query = `
        INSERT INTO error_analytics 
        (error_type, error_message, stack_trace, user_id, path, request_data)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      
      await this.db.query(query, [
        errorData.errorType,
        errorData.errorMessage,
        errorData.stackTrace || null,
        errorData.userId || null,
        errorData.path || null,
        errorData.requestData ? JSON.stringify(errorData.requestData) : null
      ]);
    } catch (error) {
      logger.error('Error tracking error analytics:', error);
      throw new Error('Failed to track error analytics');
    }
  }

  /**
   * Get dashboard analytics data
   */
  async getDashboardData(params: AnalyticsQueryParams = {}): Promise<AnalyticsDashboardData> {
    try {
      // Set default date range if not provided
      const endDate = params.endDate || new Date();
      const startDate = params.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
      
      // Get user metrics
      const userMetrics = await this.getUserMetrics(startDate, endDate);
      
      // Get search metrics
      const searchMetrics = await this.getSearchMetrics(startDate, endDate);
      
      // Get booking metrics
      const bookingMetrics = await this.getBookingMetrics(startDate, endDate);
      
      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics(startDate, endDate);
      
      return {
        userMetrics,
        searchMetrics,
        bookingMetrics,
        performanceMetrics
      };
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      throw new Error('Failed to get analytics dashboard data');
    }
  }

  /**
   * Get user metrics
   */
  private async getUserMetrics(startDate: Date, endDate: Date): Promise<AnalyticsDashboardData['userMetrics']> {
    // Total users
    const totalUsersResult = await this.db.query('SELECT COUNT(*) FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0].count);
    
    // Active users (users with activity in date range)
    const activeUsersQuery = `
      SELECT COUNT(DISTINCT user_id) 
      FROM user_activity 
      WHERE created_at BETWEEN $1 AND $2
    `;
    const activeUsersResult = await this.db.query(activeUsersQuery, [startDate, endDate]);
    const activeUsers = parseInt(activeUsersResult.rows[0].count);
    
    // New users in date range
    const newUsersQuery = `
      SELECT COUNT(*) 
      FROM users 
      WHERE created_at BETWEEN $1 AND $2
    `;
    const newUsersResult = await this.db.query(newUsersQuery, [startDate, endDate]);
    const newUsers = parseInt(newUsersResult.rows[0].count);
    
    // Retention rate (active users / total users)
    const retentionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
    
    return {
      totalUsers,
      activeUsers,
      newUsers,
      retentionRate
    };
  }

  /**
   * Get search metrics
   */
  private async getSearchMetrics(startDate: Date, endDate: Date): Promise<AnalyticsDashboardData['searchMetrics']> {
    // Total searches
    const totalSearchesQuery = `
      SELECT COUNT(*) 
      FROM search_analytics 
      WHERE created_at BETWEEN $1 AND $2
    `;
    const totalSearchesResult = await this.db.query(totalSearchesQuery, [startDate, endDate]);
    const totalSearches = parseInt(totalSearchesResult.rows[0].count);
    
    // Searches that led to bookings
    const searchesToBookingQuery = `
      SELECT COUNT(DISTINCT sa.search_id) 
      FROM search_analytics sa
      JOIN booking_analytics ba ON sa.search_id = ba.search_id
      WHERE sa.created_at BETWEEN $1 AND $2
    `;
    const searchesToBookingResult = await this.db.query(searchesToBookingQuery, [startDate, endDate]);
    const searchesToBooking = parseInt(searchesToBookingResult.rows[0].count);
    
    // Search to booking rate
    const searchesToBookingRate = totalSearches > 0 ? (searchesToBooking / totalSearches) * 100 : 0;
    
    // Average results per search
    const avgResultsQuery = `
      SELECT AVG(results_count) 
      FROM search_analytics 
      WHERE created_at BETWEEN $1 AND $2
    `;
    const avgResultsResult = await this.db.query(avgResultsQuery, [startDate, endDate]);
    const averageResultsPerSearch = parseFloat(avgResultsResult.rows[0].avg) || 0;
    
    // Popular origins
    const popularOriginsQuery = `
      SELECT origin, COUNT(*) as count 
      FROM search_analytics 
      WHERE created_at BETWEEN $1 AND $2 
      GROUP BY origin 
      ORDER BY count DESC 
      LIMIT 5
    `;
    const popularOriginsResult = await this.db.query(popularOriginsQuery, [startDate, endDate]);
    const popularOrigins = popularOriginsResult.rows.map(row => ({
      origin: row.origin,
      count: parseInt(row.count)
    }));
    
    // Popular destinations
    const popularDestinationsQuery = `
      SELECT destination, COUNT(*) as count 
      FROM search_analytics 
      WHERE created_at BETWEEN $1 AND $2 
      GROUP BY destination 
      ORDER BY count DESC 
      LIMIT 5
    `;
    const popularDestinationsResult = await this.db.query(popularDestinationsQuery, [startDate, endDate]);
    const popularDestinations = popularDestinationsResult.rows.map(row => ({
      destination: row.destination,
      count: parseInt(row.count)
    }));
    
    return {
      totalSearches,
      searchesToBookingRate,
      averageResultsPerSearch,
      popularOrigins,
      popularDestinations
    };
  }

  /**
   * Get booking metrics
   */
  private async getBookingMetrics(startDate: Date, endDate: Date): Promise<AnalyticsDashboardData['bookingMetrics']> {
    // Total bookings
    const totalBookingsQuery = `
      SELECT COUNT(*) 
      FROM booking_analytics 
      WHERE created_at BETWEEN $1 AND $2 AND abandoned_step IS NULL
    `;
    const totalBookingsResult = await this.db.query(totalBookingsQuery, [startDate, endDate]);
    const totalBookings = parseInt(totalBookingsResult.rows[0].count);
    
    // Total revenue
    const totalRevenueQuery = `
      SELECT SUM(booking_value) 
      FROM booking_analytics 
      WHERE created_at BETWEEN $1 AND $2 AND abandoned_step IS NULL
    `;
    const totalRevenueResult = await this.db.query(totalRevenueQuery, [startDate, endDate]);
    const totalRevenue = parseFloat(totalRevenueResult.rows[0].sum) || 0;
    
    // Average booking value
    const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    
    // Conversion rate (completed bookings / total booking attempts)
    const totalAttemptsQuery = `
      SELECT COUNT(*) 
      FROM booking_analytics 
      WHERE created_at BETWEEN $1 AND $2
    `;
    const totalAttemptsResult = await this.db.query(totalAttemptsQuery, [startDate, endDate]);
    const totalAttempts = parseInt(totalAttemptsResult.rows[0].count);
    
    const conversionRate = totalAttempts > 0 ? (totalBookings / totalAttempts) * 100 : 0;
    
    // Abandonment rate
    const abandonmentRate = totalAttempts > 0 ? ((totalAttempts - totalBookings) / totalAttempts) * 100 : 0;
    
    // Points redemptions
    const pointsRedemptionsQuery = `
      SELECT COUNT(*) 
      FROM booking_analytics 
      WHERE created_at BETWEEN $1 AND $2 AND points_used > 0 AND abandoned_step IS NULL
    `;
    const pointsRedemptionsResult = await this.db.query(pointsRedemptionsQuery, [startDate, endDate]);
    const pointsRedemptions = parseInt(pointsRedemptionsResult.rows[0].count);
    
    return {
      totalBookings,
      totalRevenue,
      averageBookingValue,
      conversionRate,
      abandonmentRate,
      pointsRedemptions
    };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(startDate: Date, endDate: Date): Promise<AnalyticsDashboardData['performanceMetrics']> {
    // Average API response time
    const apiResponseTimeQuery = `
      SELECT AVG(metric_value) 
      FROM performance_metrics 
      WHERE metric_name = 'response_time' AND component = 'api' AND created_at BETWEEN $1 AND $2
    `;
    const apiResponseTimeResult = await this.db.query(apiResponseTimeQuery, [startDate, endDate]);
    const averageApiResponseTime = parseFloat(apiResponseTimeResult.rows[0].avg) || 0;
    
    // Error rate
    const totalRequestsQuery = `
      SELECT COUNT(*) 
      FROM user_activity 
      WHERE activity_type = 'api_request' AND created_at BETWEEN $1 AND $2
    `;
    const totalRequestsResult = await this.db.query(totalRequestsQuery, [startDate, endDate]);
    const totalRequests = parseInt(totalRequestsResult.rows[0].count);
    
    const totalErrorsQuery = `
      SELECT COUNT(*) 
      FROM error_analytics 
      WHERE created_at BETWEEN $1 AND $2
    `;
    const totalErrorsResult = await this.db.query(totalErrorsQuery, [startDate, endDate]);
    const totalErrors = parseInt(totalErrorsResult.rows[0].count);
    
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    
    // Search latency
    const searchLatencyQuery = `
      SELECT AVG(metric_value) 
      FROM performance_metrics 
      WHERE metric_name = 'search_latency' AND created_at BETWEEN $1 AND $2
    `;
    const searchLatencyResult = await this.db.query(searchLatencyQuery, [startDate, endDate]);
    const searchLatency = parseFloat(searchLatencyResult.rows[0].avg) || 0;
    
    // System uptime
    const uptimeQuery = `
      SELECT AVG(metric_value) 
      FROM performance_metrics 
      WHERE metric_name = 'uptime_percentage' AND created_at BETWEEN $1 AND $2
    `;
    const uptimeResult = await this.db.query(uptimeQuery, [startDate, endDate]);
    const systemUptime = parseFloat(uptimeResult.rows[0].avg) || 100; // Default to 100% if no data
    
    return {
      averageApiResponseTime,
      errorRate,
      searchLatency,
      systemUptime
    };
  }

  /**
   * Get user activity history
   */
  async getUserActivityHistory(userId: UUID, params: AnalyticsQueryParams = {}): Promise<UserActivity[]> {
    try {
      const limit = params.limit || 100;
      const offset = params.page ? (params.page - 1) * limit : 0;
      
      const query = `
        SELECT * FROM user_activity 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      
      const result = await this.db.query(query, [userId, limit, offset]);
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        activityType: row.activity_type,
        pagePath: row.page_path,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at,
        sessionId: row.session_id,
        durationSeconds: row.duration_seconds
      }));
    } catch (error) {
      logger.error('Error getting user activity history:', error);
      throw new Error('Failed to get user activity history');
    }
  }

  /**
   * Get error logs
   */
  async getErrorLogs(params: AnalyticsQueryParams = {}): Promise<ErrorAnalytics[]> {
    try {
      const limit = params.limit || 100;
      const offset = params.page ? (params.page - 1) * limit : 0;
      
      // Set default date range if not provided
      const endDate = params.endDate || new Date();
      const startDate = params.startDate || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to last 7 days
      
      const query = `
        SELECT * FROM error_analytics 
        WHERE created_at BETWEEN $1 AND $2 
        ORDER BY created_at DESC 
        LIMIT $3 OFFSET $4
      `;
      
      const result = await this.db.query(query, [startDate, endDate, limit, offset]);
      return result.rows.map(row => ({
        id: row.id,
        errorType: row.error_type,
        errorMessage: row.error_message,
        stackTrace: row.stack_trace,
        userId: row.user_id,
        path: row.path,
        requestData: row.request_data,
        createdAt: row.created_at,
        resolved: row.resolved,
        resolutionNotes: row.resolution_notes
      }));
    } catch (error) {
      logger.error('Error getting error logs:', error);
      throw new Error('Failed to get error logs');
    }
  }

  /**
   * Update error resolution status
   */
  async updateErrorResolution(errorId: number, resolved: boolean, notes?: string): Promise<void> {
    try {
      const query = `
        UPDATE error_analytics 
        SET resolved = $1, resolution_notes = $2 
        WHERE id = $3
      `;
      
      await this.db.query(query, [resolved, notes || null, errorId]);
    } catch (error) {
      logger.error('Error updating error resolution:', error);
      throw new Error('Failed to update error resolution');
    }
  }

  /**
   * Get performance metrics history
   */
  async getPerformanceHistory(
    metricName: string, 
    component: string, 
    params: AnalyticsQueryParams = {}
  ): Promise<PerformanceMetric[]> {
    try {
      // Set default date range if not provided
      const endDate = params.endDate || new Date();
      const startDate = params.startDate || new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Default to last 24 hours
      
      const query = `
        SELECT * FROM performance_metrics 
        WHERE metric_name = $1 AND component = $2 AND created_at BETWEEN $3 AND $4 
        ORDER BY created_at ASC
      `;
      
      const result = await this.db.query(query, [metricName, component, startDate, endDate]);
      return result.rows.map(row => ({
        id: row.id,
        metricName: row.metric_name,
        metricValue: row.metric_value,
        metricUnit: row.metric_unit,
        component: row.component,
        createdAt: row.created_at
      }));
    } catch (error) {
      logger.error('Error getting performance history:', error);
      throw new Error('Failed to get performance history');
    }
  }
}

export default AnalyticsService;