import { SearchCriteria, FlightResult } from '../models/FlightSearch';
export interface AirlineConfig {
    name: string;
    apiKey: string;
    baseUrl: string;
    timeout: number;
    rateLimit: {
        requestsPerMinute: number;
        requestsPerHour: number;
    };
    retryConfig: {
        maxRetries: number;
        backoffMultiplier: number;
        initialDelay: number;
    };
}
export interface AirlineSearchRequest {
    searchCriteria: SearchCriteria;
    requestId: string;
    timestamp: Date;
}
export interface AirlineSearchResponse {
    requestId: string;
    flights: FlightResult[];
    totalResults: number;
    searchTime: number;
    currency: string;
    timestamp: Date;
    source: string;
}
export interface AirlineApiError {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
    timestamp: Date;
}
export interface RateLimiter {
    checkLimit(key: string): Promise<boolean>;
    incrementCounter(key: string): Promise<void>;
    getRemainingRequests(key: string): Promise<number>;
}
export interface AirlineCache {
    get(key: string): Promise<AirlineSearchResponse | null>;
    set(key: string, value: AirlineSearchResponse, ttlSeconds: number): Promise<void>;
    delete(key: string): Promise<void>;
    generateKey(searchCriteria: SearchCriteria, airlineName: string): string;
}
export interface IAirlineAdapter {
    readonly name: string;
    readonly config: AirlineConfig;
    searchFlights(request: AirlineSearchRequest): Promise<AirlineSearchResponse>;
    healthCheck(): Promise<boolean>;
    getStatus(): Promise<{
        isHealthy: boolean;
        lastSuccessfulRequest?: Date;
        errorRate: number;
        averageResponseTime: number;
    }>;
    validateConfig(): boolean;
    updateConfig(config: Partial<AirlineConfig>): void;
}
export declare abstract class BaseAirlineAdapter implements IAirlineAdapter {
    readonly name: string;
    readonly config: AirlineConfig;
    protected rateLimiter: RateLimiter;
    protected cache: AirlineCache;
    protected stats: {
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        totalResponseTime: number;
        lastSuccessfulRequest?: Date;
        lastError?: AirlineApiError;
    };
    constructor(name: string, config: AirlineConfig, rateLimiter: RateLimiter, cache: AirlineCache);
    protected abstract makeApiRequest(request: AirlineSearchRequest): Promise<any>;
    protected abstract normalizeResponse(rawResponse: any, request: AirlineSearchRequest): Promise<AirlineSearchResponse>;
    protected abstract handleApiError(error: any): AirlineApiError;
    searchFlights(request: AirlineSearchRequest): Promise<AirlineSearchResponse>;
    private makeApiRequestWithRetry;
    healthCheck(): Promise<boolean>;
    getStatus(): Promise<{
        isHealthy: boolean;
        lastSuccessfulRequest?: Date;
        errorRate: number;
        averageResponseTime: number;
    }>;
    validateConfig(): boolean;
    updateConfig(newConfig: Partial<AirlineConfig>): void;
    protected isRetryableError(error: any): boolean;
    protected sleep(ms: number): Promise<void>;
    protected generateRequestId(): string;
}
//# sourceMappingURL=BaseAirlineAdapter.d.ts.map