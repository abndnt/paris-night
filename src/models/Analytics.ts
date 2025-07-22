import { UUID } from 'crypto';

/**
 * User activity tracking model
 */
export interface UserActivity {
  id?: number;
  userId: UUID;
  activityType: 'login' | 'search' | 'booking' | 'chat' | 'profile_view' | 'reward_check' | 'payment';
  pagePath?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  sessionId?: string;
  durationSeconds?: number;
}

/**
 * Search analytics model
 */
export interface SearchAnalytics {
  id?: number;
  searchId: UUID;
  userId: UUID;
  origin: string;
  destination: string;
  searchDate: Date;
  cabinClass: string;
  flexibleDates: boolean;
  resultsCount: number;
  selectedResultId?: UUID;
  searchToSelectionSeconds?: number;
  searchCriteria: Record<string, any>;
  createdAt?: Date;
}

/**
 * Booking analytics model
 */
export interface BookingAnalytics {
  id?: number;
  bookingId: UUID;
  userId: UUID;
  searchId?: UUID;
  bookingValue: number;
  pointsUsed?: number;
  pointsValue?: number;
  paymentMethod: string;
  bookingCompletionTime?: number;
  abandonedStep?: string;
  createdAt?: Date;
}

/**
 * System performance metrics model
 */
export interface PerformanceMetric {
  id?: number;
  metricName: string;
  metricValue: number;
  metricUnit: string;
  component: 'api' | 'database' | 'search' | 'llm' | 'payment' | 'cache' | 'websocket';
  createdAt?: Date;
}

/**
 * Error analytics model
 */
export interface ErrorAnalytics {
  id?: number;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  userId?: UUID;
  path?: string;
  requestData?: Record<string, any>;
  createdAt?: Date;
  resolved?: boolean;
  resolutionNotes?: string;
}

/**
 * Analytics dashboard data model
 */
export interface AnalyticsDashboardData {
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    retentionRate: number;
  };
  searchMetrics: {
    totalSearches: number;
    searchesToBookingRate: number;
    averageResultsPerSearch: number;
    popularOrigins: Array<{origin: string, count: number}>;
    popularDestinations: Array<{destination: string, count: number}>;
  };
  bookingMetrics: {
    totalBookings: number;
    totalRevenue: number;
    averageBookingValue: number;
    conversionRate: number;
    abandonmentRate: number;
    pointsRedemptions: number;
  };
  performanceMetrics: {
    averageApiResponseTime: number;
    errorRate: number;
    searchLatency: number;
    systemUptime: number;
  };
}

/**
 * Time period for analytics queries
 */
export type AnalyticsTimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Analytics query parameters
 */
export interface AnalyticsQueryParams {
  startDate?: Date;
  endDate?: Date;
  timePeriod?: AnalyticsTimePeriod;
  userId?: UUID;
  groupBy?: string;
  limit?: number;
  page?: number;
}