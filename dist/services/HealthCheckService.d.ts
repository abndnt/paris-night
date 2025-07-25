export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';
export interface ServiceHealth {
    status: HealthStatus;
    details?: Record<string, any>;
    lastChecked: Date;
}
export interface SystemMetrics {
    cpuUsage: number;
    memoryUsage: {
        total: number;
        free: number;
        used: number;
        percentUsed: number;
    };
    uptime: number;
    processMemory: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
    };
}
export interface HealthCheckResponse {
    status: HealthStatus;
    version: string;
    environment: string;
    timestamp: Date;
    uptime: number;
    services: Record<string, ServiceHealth>;
    systemMetrics?: SystemMetrics;
}
export declare class HealthCheckService {
    private serviceHealthCache;
    private lastFullCheck;
    private readonly cacheValidityMs;
    private getSystemMetrics;
    private checkDatabaseHealth;
    private checkRedisHealth;
    private checkDiskSpace;
    private checkErrorTrackingHealth;
    private isHealthResultValid;
    private getServiceHealth;
    checkHealth(includeMetrics?: boolean): Promise<HealthCheckResponse>;
    quickCheck(): Promise<{
        status: string;
        timestamp: Date;
    }>;
    readinessCheck(): Promise<{
        status: string;
        ready: boolean;
        timestamp: Date;
    }>;
}
export declare const healthCheckService: HealthCheckService;
//# sourceMappingURL=HealthCheckService.d.ts.map