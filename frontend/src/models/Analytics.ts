// Analytics models for frontend
export interface AnalyticsDashboardData {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  searchMetrics: SearchMetrics;
  bookingMetrics: BookingMetrics;
  userMetrics: UserMetrics;
  performanceMetrics: PerformanceMetrics;
  errorAnalytics: ErrorAnalytics;
  recentActivity: UserActivity[];
}

export interface SearchMetrics {
  totalSearches: number;
  averageSearchTime: number;
  popularOrigins: Array<{ origin: string; count: number }>;
  popularDestinations: Array<{ destination: string; count: number }>;
  conversionRate: number;
  searchesToBookingRate: number;
  averageResultsPerSearch: number;
}

export interface BookingMetrics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageBookingValue: number;
  totalRevenue: number;
  pointsRedemptions: number;
  conversionRate: number;
  abandonmentRate: number;
  bookingsByStatus: Record<string, number>;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userRetention: number;
  retentionRate: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  averageApiResponseTime: number;
  uptime: number;
  systemUptime: number;
  errorRate: number;
  throughput: number;
  searchLatency: number;
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  criticalErrors: number;
  recentErrors: Array<{
    id: string;
    timestamp: string;
    message: string;
    type: string;
    count: number;
    errorType: string;
    errorMessage: string;
    path?: string;
    createdAt: string;
    resolved: boolean;
    stackTrace?: string;
    requestData?: any;
    resolutionNotes?: string;
  }>;
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon?: string;
}