import { IAirlineAdapter, AirlineConfig } from '../adapters/BaseAirlineAdapter';
import { MockAirlineAdapter } from '../adapters/MockAirlineAdapter';
import { AirlineConfigManager, ConfigurationSource, ManagedAirlineConfig } from '../services/AirlineConfigManager';
import { AirlineRateLimiter } from '../services/AirlineRateLimiter';
import { AirlineCacheService } from '../services/AirlineCache';
import { RedisClientType } from 'redis';
import * as path from 'path';

export interface AdapterFactoryOptions {
  redisClient: RedisClientType;
  configManager?: AirlineConfigManager;
  encryptionKey?: string;
  defaultConfigPath?: string;
}

export class AirlineAdapterFactory {
  private configManager: AirlineConfigManager;
  private redisClient: RedisClientType;
  private rateLimiter: AirlineRateLimiter;
  private cache: AirlineCacheService;
  private adapters: Map<string, IAirlineAdapter> = new Map();

  constructor(options: AdapterFactoryOptions) {
    this.redisClient = options.redisClient;
    this.configManager = options.configManager || new AirlineConfigManager(options.encryptionKey);
    this.rateLimiter = new AirlineRateLimiter(this.redisClient);
    this.cache = new AirlineCacheService(this.redisClient);
  }

  /**
   * Create an airline adapter instance
   */
  async createAdapter(airlineName: string, adapterType: 'mock' | 'real' = 'mock'): Promise<IAirlineAdapter> {
    // Check if adapter already exists
    const existingAdapter = this.adapters.get(airlineName);
    if (existingAdapter) {
      return existingAdapter;
    }

    // Load configuration
    const config = await this.loadAirlineConfig(airlineName);

    // Create adapter based on type
    let adapter: IAirlineAdapter;
    
    switch (adapterType) {
      case 'mock':
        adapter = new MockAirlineAdapter(config, this.rateLimiter, this.cache);
        // Override the name to use the airline name instead of 'mock'
        (adapter as any).name = airlineName;
        break;
      case 'real':
        // In a real implementation, this would create specific airline adapters
        // For now, we'll use the mock adapter
        adapter = new MockAirlineAdapter(config, this.rateLimiter, this.cache);
        (adapter as any).name = airlineName;
        break;
      default:
        throw new Error(`Unsupported adapter type: ${adapterType}`);
    }

    // Cache the adapter
    this.adapters.set(airlineName, adapter);

    return adapter;
  }

  /**
   * Get an existing adapter or create a new one
   */
  async getAdapter(airlineName: string, adapterType: 'mock' | 'real' = 'mock'): Promise<IAirlineAdapter> {
    return this.createAdapter(airlineName, adapterType);
  }

  /**
   * Load airline configuration from various sources
   */
  private async loadAirlineConfig(airlineName: string): Promise<AirlineConfig> {
    let config = this.configManager.getConfiguration(airlineName);

    if (!config) {
      // Try to load from file first
      const configPath = path.join(__dirname, '..', 'config', 'airline-configs', `${airlineName}.json`);
      const fileSource: ConfigurationSource = {
        type: 'file',
        source: configPath
      };

      try {
        config = await this.configManager.loadConfiguration(airlineName, fileSource);
      } catch (fileError) {
        // If file loading fails, try environment variables
        const envSource: ConfigurationSource = {
          type: 'env',
          source: 'environment'
        };

        try {
          config = await this.configManager.loadConfiguration(airlineName, envSource);
        } catch (envError) {
          // If both fail, create a default configuration
          config = this.createDefaultConfig(airlineName);
          console.warn(`Using default configuration for airline '${airlineName}'. File error: ${fileError}. Env error: ${envError}`);
        }
      }
    }

    // Check if credentials are expired and refresh if needed
    if (this.configManager.areCredentialsExpired(airlineName)) {
      try {
        await this.configManager.refreshCredentials(airlineName);
        config = this.configManager.getConfiguration(airlineName)!;
      } catch (refreshError) {
        console.warn(`Failed to refresh credentials for airline '${airlineName}': ${refreshError}`);
      }
    }

    return config;
  }

  /**
   * Create a default configuration for an airline
   */
  private createDefaultConfig(airlineName: string): ManagedAirlineConfig {
    return {
      name: airlineName,
      baseUrl: `https://api.${airlineName}.com/v1`,
      apiKey: 'default-api-key',
      timeout: 5000,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000
      },
      retryConfig: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelay: 1000
      },
      credentials: {
        apiKey: 'default-api-key'
      },
      environment: 'development',
      lastUpdated: new Date(),
      version: '1.0.0'
    };
  }

  /**
   * Register a new airline configuration
   */
  async registerAirline(
    airlineName: string, 
    config: Partial<ManagedAirlineConfig>, 
    source: ConfigurationSource
  ): Promise<void> {
    const fullConfig: ManagedAirlineConfig = {
      ...this.createDefaultConfig(airlineName),
      ...config,
      name: airlineName,
      lastUpdated: new Date(),
      version: config.version || '1.0.0'
    };

    await this.configManager.loadConfiguration(airlineName, source);
    await this.configManager.updateConfiguration(airlineName, fullConfig);
  }

  /**
   * Update airline configuration
   */
  async updateAirlineConfig(airlineName: string, updates: Partial<ManagedAirlineConfig>): Promise<void> {
    await this.configManager.updateConfiguration(airlineName, updates);
    
    // Remove cached adapter to force recreation with new config
    this.adapters.delete(airlineName);
  }

  /**
   * Remove an airline configuration and adapter
   */
  removeAirline(airlineName: string): void {
    this.configManager.removeConfiguration(airlineName);
    this.adapters.delete(airlineName);
  }

  /**
   * Get all configured airlines
   */
  getConfiguredAirlines(): string[] {
    return this.configManager.getConfiguredAirlines();
  }

  /**
   * Get adapter health status
   */
  async getAdapterHealth(airlineName: string): Promise<{ status: string; lastCheck: Date; responseTime?: number }> {
    const adapter = this.adapters.get(airlineName);
    if (!adapter) {
      return {
        status: 'not_initialized',
        lastCheck: new Date()
      };
    }

    try {
      const startTime = Date.now();
      const status = await adapter.getStatus();
      const responseTime = Date.now() - startTime;

      return {
        status: status.isHealthy ? 'healthy' : 'unhealthy',
        lastCheck: status.lastSuccessfulRequest || new Date(),
        responseTime
      };
    } catch (error) {
      return {
        status: 'error',
        lastCheck: new Date()
      };
    }
  }

  /**
   * Get all adapter health statuses
   */
  async getAllAdapterHealth(): Promise<Record<string, { status: string; lastCheck: Date; responseTime?: number }>> {
    const airlines = this.getConfiguredAirlines();
    const healthStatuses: Record<string, { status: string; lastCheck: Date; responseTime?: number }> = {};

    for (const airline of airlines) {
      healthStatuses[airline] = await this.getAdapterHealth(airline);
    }

    return healthStatuses;
  }

  /**
   * Refresh all airline credentials
   */
  async refreshAllCredentials(): Promise<void> {
    const airlines = this.getConfiguredAirlines();
    
    for (const airline of airlines) {
      try {
        await this.configManager.refreshCredentials(airline);
      } catch (error) {
        console.warn(`Failed to refresh credentials for airline '${airline}': ${error}`);
      }
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.adapters.clear();
    // Additional cleanup if needed
  }
}