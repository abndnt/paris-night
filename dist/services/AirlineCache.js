"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirlineCache = void 0;
const crypto = __importStar(require("crypto"));
class AirlineCache {
    constructor(redis, keyPrefix = 'airline_cache', defaultTtl = 300) {
        this.redis = redis;
        this.keyPrefix = keyPrefix;
        this.defaultTtl = defaultTtl;
    }
    async get(key) {
        try {
            const fullKey = `${this.keyPrefix}:${key}`;
            const cached = await this.redis.get(fullKey);
            if (!cached) {
                return null;
            }
            const parsed = JSON.parse(cached);
            return {
                ...parsed,
                timestamp: new Date(parsed.timestamp),
                flights: parsed.flights.map((flight) => ({
                    ...flight,
                    route: flight.route.map((segment) => ({
                        ...segment,
                        departureTime: new Date(segment.departureTime),
                        arrivalTime: new Date(segment.arrivalTime)
                    }))
                }))
            };
        }
        catch (error) {
            console.error('Error retrieving from airline cache:', error);
            return null;
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            const fullKey = `${this.keyPrefix}:${key}`;
            const ttl = ttlSeconds || this.defaultTtl;
            const serialized = JSON.stringify(value);
            await this.redis.setEx(fullKey, ttl, serialized);
        }
        catch (error) {
            console.error('Error storing in airline cache:', error);
        }
    }
    async delete(key) {
        try {
            const fullKey = `${this.keyPrefix}:${key}`;
            await this.redis.del(fullKey);
        }
        catch (error) {
            console.error('Error deleting from airline cache:', error);
        }
    }
    generateKey(searchCriteria, airlineName) {
        const keyData = {
            airline: airlineName,
            origin: searchCriteria.origin,
            destination: searchCriteria.destination,
            departureDate: searchCriteria.departureDate.toISOString().split('T')[0],
            returnDate: searchCriteria.returnDate?.toISOString().split('T')[0] || null,
            passengers: searchCriteria.passengers,
            cabinClass: searchCriteria.cabinClass,
            flexible: searchCriteria.flexible
        };
        const keyString = JSON.stringify(keyData);
        const hash = crypto.createHash('md5').update(keyString).digest('hex');
        return `search:${hash}`;
    }
    async clear(pattern) {
        try {
            const searchPattern = pattern || `${this.keyPrefix}:*`;
            const keys = await this.redis.keys(searchPattern);
            if (keys.length === 0) {
                return 0;
            }
            await this.redis.del(keys);
            return keys.length;
        }
        catch (error) {
            console.error('Error clearing airline cache:', error);
            return 0;
        }
    }
    async getStats() {
        try {
            const keys = await this.redis.keys(`${this.keyPrefix}:*`);
            const info = await this.redis.info('memory');
            const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
            const memoryUsage = memoryMatch ? memoryMatch[1]?.trim() || 'unknown' : 'unknown';
            return {
                totalKeys: keys.length,
                memoryUsage
            };
        }
        catch (error) {
            console.error('Error getting cache stats:', error);
            return {
                totalKeys: 0,
                memoryUsage: 'unknown'
            };
        }
    }
    async warmCache(commonSearches) {
        console.log(`Warming cache with ${commonSearches.length} common searches...`);
        for (const search of commonSearches) {
            for (const airline of search.airlines) {
                const key = this.generateKey(search.criteria, airline);
                const existing = await this.get(key);
                if (!existing) {
                    console.log(`Would warm cache for ${airline}: ${search.criteria.origin} -> ${search.criteria.destination}`);
                }
            }
        }
    }
    async invalidateRoute(origin, destination) {
        try {
            const pattern = `${this.keyPrefix}:search:*`;
            const keys = await this.redis.keys(pattern);
            let invalidated = 0;
            for (const key of keys) {
                const cached = await this.get(key.replace(`${this.keyPrefix}:`, ''));
                if (cached && this.matchesRoute(cached, origin, destination)) {
                    await this.delete(key.replace(`${this.keyPrefix}:`, ''));
                    invalidated++;
                }
            }
            return invalidated;
        }
        catch (error) {
            console.error('Error invalidating route cache:', error);
            return 0;
        }
    }
    matchesRoute(response, origin, destination) {
        return response.flights.some(flight => flight.route.some(segment => segment.origin === origin && segment.destination === destination));
    }
    async healthCheck() {
        try {
            const testKey = `${this.keyPrefix}:health_check`;
            const testValue = { timestamp: new Date().toISOString() };
            await this.redis.setEx(testKey, 10, JSON.stringify(testValue));
            const retrieved = await this.redis.get(testKey);
            await this.redis.del(testKey);
            return retrieved !== null;
        }
        catch (error) {
            console.error('Cache health check failed:', error);
            return false;
        }
    }
}
exports.AirlineCache = AirlineCache;
//# sourceMappingURL=AirlineCache.js.map