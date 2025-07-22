"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirlineRateLimiter = void 0;
class AirlineRateLimiter {
    constructor(redis, keyPrefix = 'airline_rate_limit') {
        this.redis = redis;
        this.keyPrefix = keyPrefix;
    }
    async checkLimit(key) {
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
        return currentMinuteCount < limits.requestsPerMinute &&
            currentHourCount < limits.requestsPerHour;
    }
    async incrementCounter(key) {
        const fullKey = `${this.keyPrefix}:${key}`;
        const minuteKey = `${fullKey}:minute:${Math.floor(Date.now() / 60000)}`;
        const hourKey = `${fullKey}:hour:${Math.floor(Date.now() / 3600000)}`;
        await Promise.all([
            this.redis.incr(minuteKey).then(() => this.redis.expire(minuteKey, 60)),
            this.redis.incr(hourKey).then(() => this.redis.expire(hourKey, 3600))
        ]);
    }
    async getRemainingRequests(key) {
        const fullKey = `${this.keyPrefix}:${key}`;
        const minuteKey = `${fullKey}:minute:${Math.floor(Date.now() / 60000)}`;
        const minuteCount = await this.redis.get(minuteKey);
        const currentMinuteCount = parseInt(minuteCount || '0');
        const airlineName = key.split(':')[0] || 'default';
        const limits = this.getAirlineLimits(airlineName);
        return Math.max(0, limits.requestsPerMinute - currentMinuteCount);
    }
    getAirlineLimits(airlineName) {
        const defaultLimits = {
            requestsPerMinute: 60,
            requestsPerHour: 1000
        };
        const airlineLimits = {
            'amadeus': { requestsPerMinute: 100, requestsPerHour: 2000 },
            'sabre': { requestsPerMinute: 80, requestsPerHour: 1500 },
            'mock': { requestsPerMinute: 1000, requestsPerHour: 10000 },
            'united': { requestsPerMinute: 50, requestsPerHour: 800 },
            'delta': { requestsPerMinute: 40, requestsPerHour: 600 }
        };
        return airlineLimits[airlineName.toLowerCase()] || defaultLimits;
    }
    async resetLimits(key) {
        const fullKey = `${this.keyPrefix}:${key}`;
        const pattern = `${fullKey}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
            await this.redis.del(keys);
        }
    }
    async getUsageStats(key) {
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
exports.AirlineRateLimiter = AirlineRateLimiter;
//# sourceMappingURL=AirlineRateLimiter.js.map