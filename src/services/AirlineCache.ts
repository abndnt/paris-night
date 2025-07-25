import { RedisClientType } from 'redis';
import { AirlineCache as IAirlineCache, AirlineSearchResponse } from '../adapters/BaseAirlineAdapter';
import { SearchCriteria } from '../models/FlightSearch';
import * as crypto from 'crypto';

export class AirlineCache implements IAirlineCache {
  private redis: RedisClientType;
  private keyPrefix: string;
  private defaultTtl: number;

  constructor(
    redis: RedisClientType, 
    keyPrefix: string = 'airline_cache',
    defaultTtl: number = 300 // 5 minutes default
  ) {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
    this.defaultTtl = defaultTtl;
  }

  async get(key: string): Promise<AirlineSearchResponse | null> {
    try {
      const fullKey = `${this.keyPrefix}:${key}`;
      const cached = await this.redis.get(fullKey);
      
      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached);
      
      // Convert date strings back to Date objects
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
        flights: parsed.flights.map((flight: any) => ({
          ...flight,
          route: flight.route.map((segment: any) => ({
            ...segment,
            departureTime: new Date(segment.departureTime),
            arrivalTime: new Date(segment.arrivalTime)
          }))
        }))
      };
    } catch (error) {
      console.error('Error retrieving from airline cache:', error);
      return null;
    }
  }

  async set(key: string, value: AirlineSearchResponse, ttlSeconds?: number): Promise<void> {
    try {
      const fullKey = `${this.keyPrefix}:${key}`;
      const ttl = ttlSeconds || this.defaultTtl;
      
      // Serialize the response
      const serialized = JSON.stringify(value);
      
      await this.redis.setEx(fullKey, ttl, serialized);
    } catch (error) {
      console.error('Error storing in airline cache:', error);
      // Don't throw - caching failures shouldn't break the application
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullKey = `${this.keyPrefix}:${key}`;
      await this.redis.del(fullKey);
    } catch (error) {
      console.error('Error deleting from airline cache:', error);
    }
  }

  generateKey(searchCriteria: SearchCriteria, airlineName: string): string {
    // Create a deterministic cache key based on search criteria
    const keyData = {
      airline: airlineName,
      origin: searchCriteria.origin,
      destination: searchCriteria.destination,
      departureDate: searchCriteria.departureDate.toISOString().split('T')[0], // Date only
      returnDate: searchCriteria.returnDate?.toISOString().split('T')[0] || null,
      passengers: searchCriteria.passengers,
      cabinClass: searchCriteria.cabinClass,
      flexible: searchCriteria.flexible
    };

    // Create hash of the key data for consistent, short keys
    const keyString = JSON.stringify(keyData);
    const hash = crypto.createHash('md5').update(keyString).digest('hex');
    
    return `search:${hash}`;
  }

  // Utility methods for cache management
  async clear(pattern?: string): Promise<number> {
    try {
      const searchPattern = pattern || `${this.keyPrefix}:*`;
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      await this.redis.del(keys);
      return keys.length;
    } catch (error) {
      console.error('Error clearing airline cache:', error);
      return 0;
    }
  }

  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate?: number;
  }> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}:*`);
      const info = await this.redis.info('memory');
      
      // Extract memory usage from Redis info
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1]?.trim() || 'unknown' : 'unknown';

      return {
        totalKeys: keys.length,
        memoryUsage
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'unknown'
      };
    }
  }

  // Cache warming - pre-populate cache with common searches
  async warmCache(commonSearches: Array<{ criteria: SearchCriteria; airlines: string[] }>): Promise<void> {
    console.log(`Warming cache with ${commonSearches.length} common searches...`);
    
    for (const search of commonSearches) {
      for (const airline of search.airlines) {
        const key = this.generateKey(search.criteria, airline);
        
        // Check if already cached
        const existing = await this.get(key);
        if (!existing) {
          // In a real implementation, you would trigger actual searches here
          // For now, we just log the cache warming attempt
          console.log(`Would warm cache for ${airline}: ${search.criteria.origin} -> ${search.criteria.destination}`);
        }
      }
    }
  }

  // Cache invalidation for specific routes
  async invalidateRoute(origin: string, destination: string): Promise<number> {
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
    } catch (error) {
      console.error('Error invalidating route cache:', error);
      return 0;
    }
  }

  private matchesRoute(response: AirlineSearchResponse, origin: string, destination: string): boolean {
    return response.flights.some(flight => 
      flight.route.some(segment => 
        segment.origin === origin && segment.destination === destination
      )
    );
  }

  // Health check for cache service
  async healthCheck(): Promise<boolean> {
    try {
      const testKey = `${this.keyPrefix}:health_check`;
      const testValue = { timestamp: new Date().toISOString() };
      
      await this.redis.setEx(testKey, 10, JSON.stringify(testValue));
      const retrieved = await this.redis.get(testKey);
      await this.redis.del(testKey);
      
      return retrieved !== null;
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }
}