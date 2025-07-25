import { Pool } from 'pg';
import { UUID } from 'crypto';
import { UserActivity, SearchAnalytics, BookingAnalytics, PerformanceMetric, ErrorAnalytics, AnalyticsDashboardData, AnalyticsQueryParams } from '../models/Analytics';
declare class AnalyticsService {
    private db;
    constructor(db: Pool);
    trackUserActivity(activity: UserActivity): Promise<void>;
    trackSearchAnalytics(searchData: SearchAnalytics): Promise<void>;
    trackBookingAnalytics(bookingData: BookingAnalytics): Promise<void>;
    trackPerformanceMetric(metric: PerformanceMetric): Promise<void>;
    trackErrorAnalytics(errorData: ErrorAnalytics): Promise<void>;
    getDashboardData(params?: AnalyticsQueryParams): Promise<AnalyticsDashboardData>;
    private getUserMetrics;
    private getSearchMetrics;
    private getBookingMetrics;
    private getPerformanceMetrics;
    getUserActivityHistory(userId: UUID, params?: AnalyticsQueryParams): Promise<UserActivity[]>;
    getErrorLogs(params?: AnalyticsQueryParams): Promise<ErrorAnalytics[]>;
    updateErrorResolution(errorId: number, resolved: boolean, notes?: string): Promise<void>;
    getPerformanceHistory(metricName: string, component: string, params?: AnalyticsQueryParams): Promise<PerformanceMetric[]>;
}
export default AnalyticsService;
//# sourceMappingURL=AnalyticsService.d.ts.map