import { RedisClientType } from 'redis';
import { AirlineCache, AirlineSearchResponse } from '../adapters/BaseAirlineAdapter';
import { SearchCriteria } from '../models/FlightSearch';
export declare class AirlineCacheService implements AirlineCache {
    private redis;
    private keyPrefix;
    private defaultTtl;
    constructor(redis: RedisClientType, keyPrefix?: string, defaultTtl?: number);
    get(key: string): Promise<AirlineSearchResponse | null>;
    set(key: string, value: AirlineSearchResponse, ttlSeconds?: number): Promise<void>;
    delete(key: string): Promise<void>;
    generateKey(searchCriteria: SearchCriteria, airlineName: string): string;
    clear(pattern?: string): Promise<number>;
    getStats(): Promise<{
        totalKeys: number;
        memoryUsage: string;
        hitRate?: number;
    }>;
    warmCache(commonSearches: Array<{
        criteria: SearchCriteria;
        airlines: string[];
    }>): Promise<void>;
    invalidateRoute(origin: string, destination: string): Promise<number>;
    private matchesRoute;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=AirlineCache.d.ts.map