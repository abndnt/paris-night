import { RedisClientType } from 'redis';
import { RateLimiter } from '../adapters/BaseAirlineAdapter';
export declare class AirlineRateLimiter implements RateLimiter {
    private redis;
    private keyPrefix;
    constructor(redis: RedisClientType, keyPrefix?: string);
    checkLimit(key: string): Promise<boolean>;
    incrementCounter(key: string): Promise<void>;
    getRemainingRequests(key: string): Promise<number>;
    private getAirlineLimits;
    resetLimits(key: string): Promise<void>;
    getUsageStats(key: string): Promise<{
        minuteCount: number;
        hourCount: number;
        minuteLimit: number;
        hourLimit: number;
        minuteRemaining: number;
        hourRemaining: number;
    }>;
}
//# sourceMappingURL=AirlineRateLimiter.d.ts.map