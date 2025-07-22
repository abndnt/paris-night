import { SearchCriteria, FlightResult } from '../models/FlightSearch';

// Base interfaces for airline API integration
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

// Rate limiting interface
export interface RateLimiter {
  checkLimit(key: string): Promise<boolean>;
  incrementCounter(key: string): Promise<void>;
  getRemainingRequests(key: string): Promise<number>;
}

// Cache interface for airline responses
export interface AirlineCache {
  get(key: string): Promise<AirlineSearchResponse | null>;
  set(key: string, value: AirlineSearchResponse, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  generateKey(searchCriteria: SearchCriteria, airlineName: string): string;
}

// Base airline adapter interface
export interface IAirlineAdapter {
  readonly name: string;
  readonly config: AirlineConfig;
  
  // Core search functionality
  searchFlights(request: AirlineSearchRequest): Promise<AirlineSearchResponse>;
  
  // Health check and status
  healthCheck(): Promise<boolean>;
  getStatus(): Promise<{
    isHealthy: boolean;
    lastSuccessfulRequest?: Date;
    errorRate: number;
    averageResponseTime: number;
  }>;
  
  // Configuration and setup
  validateConfig(): boolean;
  updateConfig(config: Partial<AirlineConfig>): void;
}

// Abstract base class implementing common functionality
export abstract class BaseAirlineAdapter implements IAirlineAdapter {
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

  constructor(
    public readonly name: string,
    public readonly config: AirlineConfig,
    rateLimiter: RateLimiter,
    cache: AirlineCache
  ) {
    this.rateLimiter = rateLimiter;
    this.cache = cache;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0
    };
    
    if (!this.validateConfig()) {
      throw new Error(`Invalid configuration for airline adapter: ${name}`);
    }
  }

  // Abstract methods that must be implemented by concrete adapters
  protected abstract makeApiRequest(request: AirlineSearchRequest): Promise<any>;
  protected abstract normalizeResponse(rawResponse: any, request: AirlineSearchRequest): Promise<AirlineSearchResponse>;
  protected abstract handleApiError(error: any): AirlineApiError;

  // Main search method with caching, rate limiting, and error handling
  async searchFlights(request: AirlineSearchRequest): Promise<AirlineSearchResponse> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // Check rate limits
      const rateLimitKey = `${this.name}:${Date.now()}`;
      if (!(await this.rateLimiter.checkLimit(rateLimitKey))) {
        throw new Error(`Rate limit exceeded for ${this.name}`);
      }

      // Check cache first
      const cacheKey = this.cache.generateKey(request.searchCriteria, this.name);
      const cachedResponse = await this.cache.get(cacheKey);
      
      if (cachedResponse) {
        return cachedResponse;
      }

      // Make API request with retry logic
      const rawResponse = await this.makeApiRequestWithRetry(request);
      
      // Normalize response
      const normalizedResponse = await this.normalizeResponse(rawResponse, request);
      
      // Cache the response
      await this.cache.set(cacheKey, normalizedResponse, 300); // 5 minutes TTL
      
      // Update rate limiter
      await this.rateLimiter.incrementCounter(rateLimitKey);
      
      // Update stats
      this.stats.successfulRequests++;
      this.stats.totalResponseTime += Date.now() - startTime;
      this.stats.lastSuccessfulRequest = new Date();
      
      return normalizedResponse;
      
    } catch (error) {
      this.stats.failedRequests++;
      const airlineError = this.handleApiError(error);
      this.stats.lastError = airlineError;
      
      throw airlineError;
    }
  }

  // Retry logic implementation
  private async makeApiRequestWithRetry(request: AirlineSearchRequest): Promise<any> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.config.retryConfig.maxRetries; attempt++) {
      try {
        return await this.makeApiRequest(request);
      } catch (error) {
        lastError = error;
        
        // Don't retry on the last attempt or for non-retryable errors
        if (attempt === this.config.retryConfig.maxRetries || !this.isRetryableError(error)) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.config.retryConfig.initialDelay * 
          Math.pow(this.config.retryConfig.backoffMultiplier, attempt);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  // Health check implementation
  async healthCheck(): Promise<boolean> {
    try {
      // Create a minimal test request
      const testRequest: AirlineSearchRequest = {
        searchCriteria: {
          origin: 'LAX',
          destination: 'JFK',
          departureDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          passengers: { adults: 1, children: 0, infants: 0 },
          cabinClass: 'economy',
          flexible: false
        },
        requestId: `health-check-${Date.now()}`,
        timestamp: new Date()
      };

      await this.makeApiRequest(testRequest);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get adapter status
  async getStatus(): Promise<{
    isHealthy: boolean;
    lastSuccessfulRequest?: Date;
    errorRate: number;
    averageResponseTime: number;
  }> {
    const errorRate = this.stats.totalRequests > 0
      ? this.stats.failedRequests / this.stats.totalRequests
      : 0;
    
    const averageResponseTime = this.stats.successfulRequests > 0
      ? this.stats.totalResponseTime / this.stats.successfulRequests
      : 0;

    const status: {
      isHealthy: boolean;
      lastSuccessfulRequest?: Date;
      errorRate: number;
      averageResponseTime: number;
    } = {
      isHealthy: await this.healthCheck(),
      errorRate,
      averageResponseTime
    };

    if (this.stats.lastSuccessfulRequest) {
      status.lastSuccessfulRequest = this.stats.lastSuccessfulRequest;
    }

    return status;
  }

  // Configuration validation
  validateConfig(): boolean {
    return !!(
      this.config.name &&
      this.config.apiKey &&
      this.config.baseUrl &&
      this.config.timeout > 0 &&
      this.config.rateLimit.requestsPerMinute > 0 &&
      this.config.rateLimit.requestsPerHour > 0 &&
      this.config.retryConfig.maxRetries >= 0 &&
      this.config.retryConfig.backoffMultiplier > 0 &&
      this.config.retryConfig.initialDelay > 0
    );
  }

  // Update configuration
  updateConfig(newConfig: Partial<AirlineConfig>): void {
    Object.assign(this.config, newConfig);
    
    if (!this.validateConfig()) {
      throw new Error(`Invalid configuration update for airline adapter: ${this.name}`);
    }
  }

  // Helper methods
  protected isRetryableError(error: any): boolean {
    // Common retryable HTTP status codes
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    
    if (error.response?.status) {
      return retryableStatusCodes.includes(error.response.status);
    }
    
    // Network errors are generally retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    return false;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected generateRequestId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}