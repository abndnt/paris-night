# Airline API Integration Framework

## Overview

The Airline API Integration Framework provides a comprehensive, enterprise-grade solution for integrating with multiple airline APIs in the Flight Search SaaS application. The framework implements the adapter pattern to provide a unified interface for different airline APIs while handling rate limiting, caching, error handling, retry logic, and configuration management.

## Architecture

### Core Components

1. **Base Adapter Interface** (`BaseAirlineAdapter`)
   - Abstract base class defining the common interface for all airline adapters
   - Handles common functionality like rate limiting, caching, and error handling
   - Provides template methods for API requests and response normalization

2. **Adapter Factory** (`AirlineAdapterFactory`)
   - Centralized factory for creating and managing airline adapter instances
   - Handles configuration loading and adapter caching
   - Provides health monitoring and status reporting

3. **Configuration Manager** (`AirlineConfigManager`)
   - Manages airline API credentials and configurations
   - Supports multiple configuration sources (file, environment, vault, database)
   - Handles credential expiration and refresh

4. **Rate Limiter** (`AirlineRateLimiter`)
   - Implements token bucket algorithm for rate limiting
   - Supports per-airline rate limiting configurations
   - Prevents API quota exhaustion

5. **Cache Service** (`AirlineCache`)
   - Redis-based caching for API responses
   - Configurable TTL and cache invalidation
   - Reduces API calls and improves performance

## Quick Start

### Basic Usage

```typescript
import { AirlineAdapterFactory } from './factories/AirlineAdapterFactory';
import { AirlineConfigManager } from './services/AirlineConfigManager';
import { createClient } from 'redis';

// Initialize Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
await redisClient.connect();

// Create configuration manager
const configManager = new AirlineConfigManager('your-encryption-key');

// Create adapter factory
const factory = new AirlineAdapterFactory({
  redisClient,
  configManager,
  encryptionKey: 'your-encryption-key'
});

// Create an adapter for American Airlines
const adapter = await factory.createAdapter('american-airlines', 'mock');

// Search for flights
const searchRequest = {
  requestId: 'search-123',
  searchCriteria: {
    origin: 'LAX',
    destination: 'JFK',
    departureDate: '2024-06-15',
    returnDate: '2024-06-22',
    passengers: 1,
    cabinClass: 'economy'
  },
  preferences: {
    maxLayovers: 1,
    preferredAirlines: ['AA'],
    maxPrice: 1000
  }
};

const results = await adapter.search(searchRequest);
console.log(`Found ${results.flights.length} flights`);
```

### Configuration Setup

#### File-based Configuration

Create configuration files in `src/config/airline-configs/`:

```json
// american-airlines.json
{
  "name": "american-airlines",
  "baseUrl": "https://api.aa.com/v1",
  "apiKey": "your-api-key",
  "timeout": 10000,
  "rateLimit": {
    "requestsPerMinute": 100,
    "requestsPerHour": 2000
  },
  "retryConfig": {
    "maxRetries": 3,
    "backoffMultiplier": 2,
    "initialDelay": 1000
  },
  "credentials": {
    "apiKey": "your-api-key",
    "apiSecret": "your-api-secret"
  },
  "environment": "production",
  "lastUpdated": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

#### Environment Variable Configuration

Set environment variables with the pattern `{AIRLINE_NAME}_{FIELD}`:

```bash
AMERICAN_AIRLINES_BASE_URL=https://api.aa.com/v1
AMERICAN_AIRLINES_API_KEY=your-api-key
AMERICAN_AIRLINES_TIMEOUT=10000
AMERICAN_AIRLINES_RATE_LIMIT_PER_MINUTE=100
AMERICAN_AIRLINES_RATE_LIMIT_PER_HOUR=2000
```

## Advanced Usage

### Custom Adapter Implementation

To create a custom adapter for a specific airline:

```typescript
import { BaseAirlineAdapter, AirlineConfig, AirlineSearchRequest, AirlineSearchResponse } from './BaseAirlineAdapter';

export class CustomAirlineAdapter extends BaseAirlineAdapter {
  constructor(config: AirlineConfig, rateLimiter: RateLimiter, cache: AirlineCache) {
    super('custom-airline', config, rateLimiter, cache);
  }

  protected async makeApiRequest(request: AirlineSearchRequest): Promise<any> {
    // Implement airline-specific API call logic
    const response = await fetch(`${this.config.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.credentials.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(this.transformRequest(request))
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  }

  protected async normalizeResponse(rawResponse: any, request: AirlineSearchRequest): Promise<AirlineSearchResponse> {
    // Transform airline-specific response format to standard format
    return {
      requestId: request.requestId,
      flights: rawResponse.results.map(flight => ({
        id: flight.flightId,
        airline: flight.carrier,
        flightNumber: flight.number,
        route: this.normalizeRoute(flight.segments),
        pricing: this.normalizePricing(flight.pricing),
        availability: this.normalizeAvailability(flight.availability),
        duration: flight.totalDuration,
        layovers: flight.segments.length - 1,
        score: this.calculateScore(flight)
      })),
      totalResults: rawResponse.total,
      searchTime: rawResponse.searchTime,
      currency: rawResponse.currency,
      timestamp: new Date(),
      source: this.name
    };
  }

  protected handleApiError(error: any): AirlineApiError {
    return {
      code: error.code || 'CUSTOM_ERROR',
      message: error.message || 'Custom airline API error',
      details: error.details,
      retryable: this.isRetryableError(error),
      timestamp: new Date()
    };
  }
}
```

### Configuration Management

#### Loading Configurations

```typescript
import { AirlineConfigManager, ConfigurationSource } from './services/AirlineConfigManager';

const configManager = new AirlineConfigManager('encryption-key');

// Load from file
const fileSource: ConfigurationSource = {
  type: 'file',
  source: './config/american-airlines.json'
};
await configManager.loadConfiguration('american-airlines', fileSource);

// Load from environment variables
const envSource: ConfigurationSource = {
  type: 'env',
  source: 'environment'
};
await configManager.loadConfiguration('delta-airlines', envSource);

// Get configuration
const config = configManager.getConfiguration('american-airlines');
```

#### Updating Configurations

```typescript
// Update configuration
await configManager.updateConfiguration('american-airlines', {
  timeout: 15000,
  rateLimit: {
    requestsPerMinute: 120,
    requestsPerHour: 2400
  }
});

// Check if credentials are expired
if (configManager.areCredentialsExpired('american-airlines')) {
  await configManager.refreshCredentials('american-airlines');
}
```

### Health Monitoring

```typescript
// Check adapter health
const health = await factory.getAdapterHealth('american-airlines');
console.log(`Status: ${health.status}, Response Time: ${health.responseTime}ms`);

// Get health status for all adapters
const allHealth = await factory.getAllAdapterHealth();
Object.entries(allHealth).forEach(([airline, status]) => {
  console.log(`${airline}: ${status.status}`);
});
```

### Error Handling and Retry Logic

The framework automatically handles common error scenarios:

```typescript
// Errors are automatically retried based on configuration
try {
  const results = await adapter.search(searchRequest);
} catch (error) {
  if (error.retryable) {
    console.log('Error is retryable, framework will handle retry');
  } else {
    console.log('Permanent error, manual intervention required');
  }
}
```

## Configuration Reference

### AirlineConfig Interface

```typescript
interface AirlineConfig {
  name: string;                    // Airline identifier
  baseUrl: string;                 // API base URL
  apiKey: string;                  // Primary API key
  timeout: number;                 // Request timeout in milliseconds
  rateLimit: {
    requestsPerMinute: number;     // Rate limit per minute
    requestsPerHour: number;       // Rate limit per hour
  };
  retryConfig: {
    maxRetries: number;            // Maximum retry attempts
    backoffMultiplier: number;     // Exponential backoff multiplier
    initialDelay: number;          // Initial delay in milliseconds
  };
}
```

### ManagedAirlineConfig Interface

```typescript
interface ManagedAirlineConfig extends AirlineConfig {
  credentials: {
    apiKey: string;
    apiSecret?: string;
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  };
  environment: 'development' | 'staging' | 'production';
  lastUpdated: Date;
  version: string;
}
```

## Rate Limiting

The framework implements intelligent rate limiting to prevent API quota exhaustion:

### Configuration

```typescript
const rateLimitConfig = {
  requestsPerMinute: 100,    // Maximum requests per minute
  requestsPerHour: 2000,     // Maximum requests per hour
  burstLimit: 10             // Maximum burst requests
};
```

### Usage

Rate limiting is automatically applied to all API requests. The system uses a token bucket algorithm with separate buckets for minute and hour limits.

## Caching

### Cache Configuration

```typescript
const cacheConfig = {
  ttl: 300,                  // Time to live in seconds (5 minutes)
  keyPrefix: 'flight:',      // Cache key prefix
  maxSize: 1000             // Maximum cache entries
};
```

### Cache Keys

Cache keys are automatically generated based on search criteria:
- Format: `flight:{airline}:{origin}:{destination}:{date}:{hash}`
- Example: `flight:american-airlines:LAX:JFK:2024-06-15:abc123`

## Testing

### Unit Tests

```typescript
import { MockAirlineAdapter } from './adapters/MockAirlineAdapter';

describe('Airline Adapter', () => {
  let adapter: MockAirlineAdapter;

  beforeEach(() => {
    adapter = new MockAirlineAdapter(config, rateLimiter, cache);
  });

  it('should search for flights', async () => {
    const results = await adapter.search(searchRequest);
    expect(results.flights).toBeDefined();
    expect(results.flights.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe('Airline Integration', () => {
  it('should handle real API responses', async () => {
    const factory = new AirlineAdapterFactory(options);
    const adapter = await factory.createAdapter('american-airlines', 'real');
    
    const results = await adapter.search(searchRequest);
    expect(results.source).toBe('american-airlines');
  });
});
```

## Performance Optimization

### Best Practices

1. **Use Caching**: Enable caching for frequently requested routes
2. **Rate Limiting**: Configure appropriate rate limits to avoid throttling
3. **Connection Pooling**: Use HTTP connection pooling for better performance
4. **Async Processing**: Process multiple airline searches concurrently
5. **Error Handling**: Implement proper error handling and fallback mechanisms

### Monitoring

```typescript
// Monitor adapter performance
const metrics = await adapter.getMetrics();
console.log(`Average Response Time: ${metrics.averageResponseTime}ms`);
console.log(`Success Rate: ${metrics.successRate}%`);
console.log(`Cache Hit Rate: ${metrics.cacheHitRate}%`);
```

## Security

### API Key Management

- Store API keys securely using environment variables or secret management systems
- Use encryption for sensitive configuration data
- Implement key rotation policies
- Monitor API key usage and detect anomalies

### Network Security

- Use HTTPS for all API communications
- Implement request signing where supported
- Use IP whitelisting when available
- Monitor for suspicious activity

## Troubleshooting

### Common Issues

1. **Rate Limiting Errors**
   - Check rate limit configuration
   - Monitor API usage patterns
   - Implement exponential backoff

2. **Authentication Failures**
   - Verify API credentials
   - Check credential expiration
   - Ensure proper token refresh

3. **Network Timeouts**
   - Increase timeout values
   - Check network connectivity
   - Implement retry logic

4. **Cache Issues**
   - Verify Redis connection
   - Check cache TTL settings
   - Monitor cache hit rates

### Debugging

Enable debug logging:

```typescript
process.env.DEBUG = 'airline:*';
```

Check adapter health:

```typescript
const isHealthy = await adapter.healthCheck();
if (!isHealthy) {
  console.log('Adapter is unhealthy, check configuration');
}
```

## Migration Guide

### From Legacy Systems

1. **Identify Current Integrations**: List all existing airline API integrations
2. **Create Configurations**: Set up configuration files for each airline
3. **Implement Adapters**: Create custom adapters for each airline
4. **Test Thoroughly**: Run comprehensive tests before deployment
5. **Monitor Performance**: Set up monitoring and alerting

### Version Upgrades

When upgrading the framework:

1. **Review Breaking Changes**: Check the changelog for breaking changes
2. **Update Configurations**: Modify configuration files as needed
3. **Test Adapters**: Ensure all adapters work with the new version
4. **Deploy Gradually**: Use blue-green deployment for zero downtime

## Contributing

### Adding New Airlines

1. Create a new adapter class extending `BaseAirlineAdapter`
2. Implement required methods: `makeApiRequest`, `normalizeResponse`, `handleApiError`
3. Add configuration template in `src/config/airline-configs/`
4. Write comprehensive tests
5. Update documentation

### Code Standards

- Follow TypeScript best practices
- Use proper error handling
- Write comprehensive tests
- Document all public APIs
- Follow the existing code style

## Support

For issues and questions:

1. Check the troubleshooting guide
2. Review existing GitHub issues
3. Create a new issue with detailed information
4. Include logs and configuration details

## License

This framework is part of the Flight Search SaaS application and follows the same licensing terms.