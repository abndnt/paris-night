# Airline API Integration - API Reference

## Table of Contents

- [BaseAirlineAdapter](#baseairlineadapter)
- [AirlineAdapterFactory](#airlineadapterfactory)
- [AirlineConfigManager](#airlineconfigmanager)
- [AirlineRateLimiter](#airlinerateLimiter)
- [AirlineCache](#airlinecache)
- [MockAirlineAdapter](#mockairlineadapter)
- [Interfaces](#interfaces)
- [Types](#types)

## BaseAirlineAdapter

Abstract base class for all airline adapters.

### Constructor

```typescript
constructor(name: string, config: AirlineConfig, rateLimiter: RateLimiter, cache: AirlineCache)
```

### Properties

- `name: string` - Airline adapter name
- `config: AirlineConfig` - Airline configuration
- `rateLimiter: RateLimiter` - Rate limiter instance
- `cache: AirlineCache` - Cache instance

### Methods

#### search(request: AirlineSearchRequest): Promise<AirlineSearchResponse>

Searches for flights using the airline's API.

**Parameters:**
- `request: AirlineSearchRequest` - Search request parameters

**Returns:** `Promise<AirlineSearchResponse>` - Normalized search results

**Example:**
```typescript
const results = await adapter.search({
  requestId: 'search-123',
  searchCriteria: {
    origin: 'LAX',
    destination: 'JFK',
    departureDate: '2024-06-15',
    passengers: 1,
    cabinClass: 'economy'
  }
});
```

#### healthCheck(): Promise<boolean>

Checks if the airline API is healthy and responsive.

**Returns:** `Promise<boolean>` - True if healthy, false otherwise

#### getMetrics(): Promise<AdapterMetrics>

Gets performance metrics for the adapter.

**Returns:** `Promise<AdapterMetrics>` - Performance metrics

### Abstract Methods

Subclasses must implement these methods:

#### makeApiRequest(request: AirlineSearchRequest): Promise<any>

Makes the actual API request to the airline.

#### normalizeResponse(rawResponse: any, request: AirlineSearchRequest): Promise<AirlineSearchResponse>

Normalizes the airline's response format to the standard format.

#### handleApiError(error: any): AirlineApiError

Handles and normalizes API errors.

## AirlineAdapterFactory

Factory class for creating and managing airline adapters.

### Constructor

```typescript
constructor(options: {
  redisClient: RedisClientType;
  configManager: AirlineConfigManager;
  encryptionKey?: string;
})
```

### Methods

#### createAdapter(airlineName: string, adapterType: 'mock' | 'real'): Promise<IAirlineAdapter>

Creates a new airline adapter instance.

**Parameters:**
- `airlineName: string` - Name of the airline
- `adapterType: 'mock' | 'real'` - Type of adapter to create

**Returns:** `Promise<IAirlineAdapter>` - Adapter instance

**Example:**
```typescript
const adapter = await factory.createAdapter('american-airlines', 'mock');
```

#### getAdapter(airlineName: string, adapterType?: 'mock' | 'real'): Promise<IAirlineAdapter>

Gets an existing adapter or creates a new one.

#### getAdapterHealth(airlineName: string): Promise<AdapterHealthStatus>

Gets the health status of a specific adapter.

**Returns:** `Promise<AdapterHealthStatus>` - Health status information

#### getAllAdapterHealth(): Promise<Record<string, AdapterHealthStatus>>

Gets health status for all configured adapters.

#### updateAirlineConfig(airlineName: string, updates: Partial<ManagedAirlineConfig>): Promise<void>

Updates configuration for a specific airline.

#### getConfiguredAirlines(): string[]

Gets list of all configured airlines.

#### removeAirline(airlineName: string): void

Removes an airline configuration and cached adapter.

## AirlineConfigManager

Manages airline configurations and credentials.

### Constructor

```typescript
constructor(encryptionKey?: string)
```

### Methods

#### loadConfiguration(airlineName: string, source: ConfigurationSource): Promise<ManagedAirlineConfig>

Loads configuration from various sources.

**Parameters:**
- `airlineName: string` - Name of the airline
- `source: ConfigurationSource` - Configuration source

**Returns:** `Promise<ManagedAirlineConfig>` - Loaded configuration

**Example:**
```typescript
const config = await configManager.loadConfiguration('american-airlines', {
  type: 'file',
  source: './config/american-airlines.json'
});
```

#### getConfiguration(airlineName: string): ManagedAirlineConfig | null

Gets configuration for an airline.

#### updateConfiguration(airlineName: string, updates: Partial<ManagedAirlineConfig>): Promise<void>

Updates configuration for an airline.

#### areCredentialsExpired(airlineName: string): boolean

Checks if credentials are expired.

#### refreshCredentials(airlineName: string): Promise<void>

Refreshes expired credentials.

#### getConfiguredAirlines(): string[]

Gets list of all configured airlines.

#### removeConfiguration(airlineName: string): void

Removes configuration for an airline.

## AirlineRateLimiter

Implements rate limiting using token bucket algorithm.

### Constructor

```typescript
constructor(redisClient: RedisClientType)
```

### Methods

#### checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult>

Checks if a request is within rate limits.

**Parameters:**
- `key: string` - Rate limit key (usually airline name)
- `config: RateLimitConfig` - Rate limit configuration

**Returns:** `Promise<RateLimitResult>` - Rate limit check result

**Example:**
```typescript
const result = await rateLimiter.checkRateLimit('american-airlines', {
  requestsPerMinute: 100,
  requestsPerHour: 2000
});

if (!result.allowed) {
  throw new Error(`Rate limit exceeded. Retry after ${result.retryAfter}ms`);
}
```

#### getRemainingRequests(key: string, config: RateLimitConfig): Promise<RemainingRequests>

Gets remaining requests for rate limit buckets.

#### resetRateLimit(key: string): Promise<void>

Resets rate limit counters for a key.

## AirlineCache

Redis-based caching service for API responses.

### Constructor

```typescript
constructor(redisClient: RedisClientType, options?: CacheOptions)
```

### Methods

#### get<T>(key: string): Promise<T | null>

Gets a cached value.

**Parameters:**
- `key: string` - Cache key

**Returns:** `Promise<T | null>` - Cached value or null

#### set<T>(key: string, value: T, ttl?: number): Promise<void>

Sets a cached value.

**Parameters:**
- `key: string` - Cache key
- `value: T` - Value to cache
- `ttl?: number` - Time to live in seconds

#### del(key: string): Promise<void>

Deletes a cached value.

#### generateKey(prefix: string, params: Record<string, any>): string

Generates a cache key from parameters.

**Example:**
```typescript
const key = cache.generateKey('flight', {
  airline: 'american-airlines',
  origin: 'LAX',
  destination: 'JFK',
  date: '2024-06-15'
});
// Result: "flight:american-airlines:LAX:JFK:2024-06-15:hash"
```

#### getStats(): Promise<CacheStats>

Gets cache statistics.

#### clear(): Promise<void>

Clears all cached values.

## MockAirlineAdapter

Mock implementation for testing and development.

### Constructor

```typescript
constructor(
  config: AirlineConfig,
  rateLimiter: RateLimiter,
  cache: AirlineCache,
  options?: {
    mockDelay?: number;
    shouldSimulateError?: boolean;
    errorRate?: number;
  }
)
```

### Methods

#### setMockDelay(delay: number): void

Sets the mock response delay.

#### setErrorSimulation(shouldSimulate: boolean, errorRate?: number): void

Configures error simulation.

#### generateScenario(scenario: 'no-flights' | 'expensive-flights' | 'direct-only' | 'layovers-only'): Promise<any>

Generates specific test scenarios.

## Interfaces

### AirlineConfig

```typescript
interface AirlineConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
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
```

### ManagedAirlineConfig

```typescript
interface ManagedAirlineConfig extends AirlineConfig {
  credentials: AirlineCredentials;
  environment: 'development' | 'staging' | 'production';
  lastUpdated: Date;
  version: string;
}
```

### AirlineCredentials

```typescript
interface AirlineCredentials {
  apiKey: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}
```

### AirlineSearchRequest

```typescript
interface AirlineSearchRequest {
  requestId: string;
  searchCriteria: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    cabinClass: 'economy' | 'business' | 'first';
  };
  preferences?: {
    maxLayovers?: number;
    preferredAirlines?: string[];
    maxPrice?: number;
    maxDuration?: number;
  };
}
```

### AirlineSearchResponse

```typescript
interface AirlineSearchResponse {
  requestId: string;
  flights: FlightResult[];
  totalResults: number;
  searchTime: number;
  currency: string;
  timestamp: Date;
  source: string;
}
```

### FlightResult

```typescript
interface FlightResult {
  id: string;
  airline: string;
  flightNumber: string;
  route: FlightSegment[];
  pricing: PricingInfo;
  availability: AvailabilityInfo;
  duration: number;
  layovers: number;
  layoverDuration?: number;
  score: number;
}
```

### ConfigurationSource

```typescript
interface ConfigurationSource {
  type: 'file' | 'env' | 'vault' | 'database';
  source: string;
  encrypted?: boolean;
}
```

### AdapterHealthStatus

```typescript
interface AdapterHealthStatus {
  status: 'healthy' | 'unhealthy' | 'not_initialized';
  lastCheck: Date;
  responseTime?: number;
  error?: string;
}
```

### RateLimitResult

```typescript
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}
```

### AirlineApiError

```typescript
interface AirlineApiError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: Date;
}
```

## Types

### AdapterType

```typescript
type AdapterType = 'mock' | 'real';
```

### CabinClass

```typescript
type CabinClass = 'economy' | 'business' | 'first';
```

### HealthStatus

```typescript
type HealthStatus = 'healthy' | 'unhealthy' | 'not_initialized';
```

### ConfigurationType

```typescript
type ConfigurationType = 'file' | 'env' | 'vault' | 'database';
```

### Environment

```typescript
type Environment = 'development' | 'staging' | 'production';
```

## Error Codes

### Common Error Codes

- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `AUTHENTICATION_FAILED` - Authentication failed
- `INVALID_REQUEST` - Invalid request parameters
- `API_UNAVAILABLE` - API service unavailable
- `TIMEOUT` - Request timeout
- `NETWORK_ERROR` - Network connectivity error
- `INVALID_RESPONSE` - Invalid API response format
- `CONFIGURATION_ERROR` - Configuration error
- `CACHE_ERROR` - Cache operation error

### HTTP Status Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
- `502` - Bad Gateway
- `503` - Service Unavailable
- `504` - Gateway Timeout

## Usage Examples

### Basic Search

```typescript
const factory = new AirlineAdapterFactory(options);
const adapter = await factory.createAdapter('american-airlines', 'mock');

const results = await adapter.search({
  requestId: 'search-123',
  searchCriteria: {
    origin: 'LAX',
    destination: 'JFK',
    departureDate: '2024-06-15',
    passengers: 1,
    cabinClass: 'economy'
  }
});
```

### Configuration Management

```typescript
const configManager = new AirlineConfigManager('encryption-key');

// Load from file
await configManager.loadConfiguration('american-airlines', {
  type: 'file',
  source: './config/american-airlines.json'
});

// Update configuration
await configManager.updateConfiguration('american-airlines', {
  timeout: 15000
});
```

### Health Monitoring

```typescript
// Check single adapter
const health = await factory.getAdapterHealth('american-airlines');
console.log(`Status: ${health.status}`);

// Check all adapters
const allHealth = await factory.getAllAdapterHealth();
Object.entries(allHealth).forEach(([airline, status]) => {
  console.log(`${airline}: ${status.status}`);
});
```

### Error Handling

```typescript
try {
  const results = await adapter.search(request);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    console.log(`Rate limited. Retry after ${error.retryAfter}ms`);
  } else if (error.retryable) {
    console.log('Retryable error, will be handled automatically');
  } else {
    console.log('Permanent error:', error.message);
  }
}