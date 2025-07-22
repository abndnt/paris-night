import { RedisClientType } from 'redis';
import { RateLimiter } from '../adapters/BaseAirlineAdapter';

export class AirlineRateLimiter implements RateLimiter {
  private redis: RedisClientType;
  private keyPrefix: string;

  constructor(redis: RedisClientType, keyPrefix: string = 'airline_rate_limit') {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
  }

  async checkLimit(key: string): Promise<boolean> {
    const fullKey = `${this.keyPrefix}:${key}`;
    const minuteKey = `${fullKey}:minute:${Math.floor(Date.now() / 60000)}`;
    const hourKey = `${fullKey}:hour:${Math.floor(Date.now() / 3600000)}`;

    // Get current counts
    const [minuteCount, hourCount] = await Promise.all([
      this.redis.get(minuteKey),
      this.redis.get(hourKey)
    ]);

    // Extract airline name and get limits from configuration
    const airlineName = key.split(':')[0] || 'default';
    const limits = this.getAirlineLimits(airlineName);

    const currentMinuteCount = parseInt(minuteCount || '0');
    const currentHourCount = parseInt(hourCount || '0');

    return currentMinuteCount < limits.requestsPerMinute && 
           currentHourCount < limits.requestsPerHour;
  }

  async incrementCounter(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}:${key}`;
    const minuteKey = `${fullKey}:minute:${Math.floor(Date.now() / 60000)}`;
    const hourKey = `${fullKey}:hour:${Math.floor(Date.now() / 3600000)}`;

    // Increment counters with expiration
    await Promise.all([
      this.redis.incr(minuteKey).then(() => this.redis.expire(minuteKey, 60)),
      this.redis.incr(hourKey).then(() => this.redis.expire(hourKey, 3600))
    ]);
  }

  async getRemainingRequests(key: string): Promise<number> {
    const fullKey = `${this.keyPrefix}:${key}`;
    const minuteKey = `${fullKey}:minute:${Math.floor(Date.now() / 60000)}`;
    
    const minuteCount = await this.redis.get(minuteKey);
    const currentMinuteCount = parseInt(minuteCount || '0');
    
    const airlineName = key.split(':')[0] || 'default';
    const limits = this.getAirlineLimits(airlineName);
    
    return Math.max(0, limits.requestsPerMinute - currentMinuteCount);
  }

  private getAirlineLimits(airlineName: string): { requestsPerMinute: number; requestsPerHour: number } {
    // Default limits - these would typically come from configuration
    const defaultLimits = {
      requestsPerMinute: 60,
      requestsPerHour: 1000
    };

    // Airline-specific limits
    const airlineLimits: Record<string, { requestsPerMinute: number; requestsPerHour: number }> = {
      'amadeus': { requestsPerMinute: 100, requestsPerHour: 2000 },
      'sabre': { requestsPerMinute: 80, requestsPerHour: 1500 },
      'mock': { requestsPerMinute: 1000, requestsPerHour: 10000 }, // High limits for testing
      'united': { requestsPerMinute: 50, requestsPerHour: 800 },
      'delta': { requestsPerMinute: 40, requestsPerHour: 600 }
    };

    return airlineLimits[airlineName.toLowerCase()] || defaultLimits;
  }

  // Utility method to reset limits (useful for testing)
  async resetLimits(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}:${key}`;
    const pattern = `${fullKey}:*`;
    
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }

  // Get current usage statistics
  async getUsageStats(key: string): Promise<{
    minuteCount: number;
    hourCount: number;
    minuteLimit: number;
    hourLimit: number;
    minuteRemaining: number;
    hourRemaining: number;
  }> {
    const fullKey = `${this.keyPrefix}:${key}`;
    const minuteKey = `${fullKey}:minute:${Math.floor(Date.now() / 60000)}`;
    const hourKey = `${fullKey}:hour:${Math.floor(Date.now() / 3600000)}`;

    const [minuteCount, hourCount] = await Promise.all([
      this.redis.get(minuteKey),
      this.redis.get(hourKey)
    ]);

    const airlineName = key.split(':')[0] || 'default';
    const limits = this.getAirlineLimits(airlineName);

    const currentMinuteCount = parseInt(minuteCount || '0');
    const currentHourCount = parseInt(hourCount || '0');

    return {
      minuteCount: currentMinuteCount,
      hourCount: currentHourCount,
      minuteLimit: limits.requestsPerMinute,
      hourLimit: limits.requestsPerHour,
      minuteRemaining: Math.max(0, limits.requestsPerMinute - currentMinuteCount),
      hourRemaining: Math.max(0, limits.requestsPerHour - currentHourCount)
    };
  }
}