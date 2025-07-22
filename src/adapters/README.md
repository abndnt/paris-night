# Airline API Integration Framework

A comprehensive, enterprise-grade framework for integrating with multiple airline APIs in the Flight Search SaaS application.

## 🚀 Quick Start

```typescript
import { AirlineAdapterFactory } from '../factories/AirlineAdapterFactory';
import { AirlineConfigManager } from '../services/AirlineConfigManager';
import { createClient } from 'redis';

// Initialize components
const redisClient = createClient({ url: 'redis://localhost:6379' });
await redisClient.connect();

const configManager = new AirlineConfigManager('your-encryption-key');
const factory = new AirlineAdapterFactory({
  redisClient,
  configManager,
  encryptionKey: 'your-encryption-key'
});

// Create adapter and search
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

console.log(`Found ${results.flights.length} flights`);
```

## 🏗️ Architecture

### Core Components

- **[`BaseAirlineAdapter`](./BaseAirlineAdapter.ts)** - Abstract base class for all airline adapters
- **[`AirlineAdapterFactory`](../factories/AirlineAdapterFactory.ts)** - Factory for creating and managing adapters
- **[`AirlineConfigManager`](../services/AirlineConfigManager.ts)** - Configuration and credential management
- **[`AirlineRateLimiter`](../services/AirlineRateLimiter.ts)** - Token bucket rate limiting
- **[`AirlineCache`](../services/AirlineCache.ts)** - Redis-based response caching
- **[`MockAirlineAdapter`](./MockAirlineAdapter.ts)** - Mock implementation for testing

### Key Features

✅ **Adapter Pattern** - Unified interface for multiple airline APIs  
✅ **Rate Limiting** - Token bucket algorithm with per-airline limits  
✅ **Caching** - Redis-based response caching with configurable TTL  
✅ **Error Handling** - Comprehensive error handling with retry logic  
✅ **Configuration Management** - Multi-source config loading (file, env, vault)  
✅ **Health Monitoring** - Real-time adapter health checking  
✅ **Security** - Encrypted credential storage and management  
✅ **Testing** - Comprehensive test suite with mock implementations  

## 📁 File Structure

```
src/adapters/
├── BaseAirlineAdapter.ts      # Abstract base adapter class
├── MockAirlineAdapter.ts      # Mock implementation for testing
└── README.md                  # This file

src/factories/
└── AirlineAdapterFactory.ts   # Adapter factory and management

src/services/
├── AirlineConfigManager.ts    # Configuration management
├── AirlineRateLimiter.ts      # Rate limiting service
└── AirlineCache.ts            # Caching service

src/config/airline-configs/
├── american-airlines.json     # AA configuration template
└── delta-airlines.json        # Delta configuration template

src/tests/
├── airlineAdapters.test.ts    # Adapter integration tests
└── configManager.test.ts      # Configuration management tests
```

## 🔧 Configuration

### File-based Configuration

Create JSON files in `src/config/airline-configs/`:

```json
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
  "environment": "production"
}
```

### Environment Variables

```bash
AMERICAN_AIRLINES_BASE_URL=https://api.aa.com/v1
AMERICAN_AIRLINES_API_KEY=your-api-key
AMERICAN_AIRLINES_TIMEOUT=10000
```

## 🧪 Testing

Run the test suite:

```bash
# Run all airline adapter tests
npm test src/tests/airlineAdapters.test.ts

# Run configuration management tests
npm test src/tests/configManager.test.ts

# Run all tests
npm test
```

## 📊 Monitoring

### Health Checks

```typescript
// Check individual adapter health
const health = await factory.getAdapterHealth('american-airlines');
console.log(`Status: ${health.status}, Response Time: ${health.responseTime}ms`);

// Check all adapters
const allHealth = await factory.getAllAdapterHealth();
```

### Performance Metrics

```typescript
// Get adapter metrics
const metrics = await adapter.getMetrics();
console.log(`Cache Hit Rate: ${metrics.cacheHitRate}%`);
console.log(`Average Response Time: ${metrics.averageResponseTime}ms`);
```

## 🔒 Security

- **Encrypted Storage**: Sensitive credentials are encrypted at rest
- **Environment Variables**: Support for secure environment-based configuration
- **Token Management**: Automatic token refresh for OAuth-based APIs
- **Rate Limiting**: Prevents API abuse and quota exhaustion

## 🚀 Adding New Airlines

1. **Create Adapter**: Extend `BaseAirlineAdapter`
2. **Implement Methods**: `makeApiRequest`, `normalizeResponse`, `handleApiError`
3. **Add Configuration**: Create config file in `src/config/airline-configs/`
4. **Write Tests**: Add comprehensive test coverage
5. **Update Factory**: Register new adapter type in factory

Example:

```typescript
export class NewAirlineAdapter extends BaseAirlineAdapter {
  constructor(config: AirlineConfig, rateLimiter: RateLimiter, cache: AirlineCache) {
    super('new-airline', config, rateLimiter, cache);
  }

  protected async makeApiRequest(request: AirlineSearchRequest): Promise<any> {
    // Implement airline-specific API logic
  }

  protected async normalizeResponse(rawResponse: any, request: AirlineSearchRequest): Promise<AirlineSearchResponse> {
    // Transform response to standard format
  }

  protected handleApiError(error: any): AirlineApiError {
    // Handle airline-specific errors
  }
}
```

## 📚 Documentation

For comprehensive documentation, see [`docs/airline-api-integration.md`](../../docs/airline-api-integration.md)

## 🐛 Troubleshooting

### Common Issues

1. **Rate Limiting**: Check rate limit configuration and usage patterns
2. **Authentication**: Verify API credentials and expiration dates
3. **Network Timeouts**: Increase timeout values or check connectivity
4. **Cache Issues**: Verify Redis connection and TTL settings

### Debug Mode

Enable debug logging:

```bash
DEBUG=airline:* npm start
```

## 📈 Performance Tips

1. **Enable Caching**: Use Redis caching for frequently requested routes
2. **Optimize Rate Limits**: Configure appropriate limits to avoid throttling
3. **Concurrent Searches**: Process multiple airlines concurrently
4. **Connection Pooling**: Use HTTP connection pooling for better performance

## 🤝 Contributing

1. Follow TypeScript best practices
2. Write comprehensive tests
3. Update documentation
4. Follow existing code style
5. Add proper error handling

## 📄 License

Part of the Flight Search SaaS application. See main project license.