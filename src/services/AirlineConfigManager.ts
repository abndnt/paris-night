import { AirlineConfig } from '../adapters/BaseAirlineAdapter';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ConfigurationSource {
  type: 'file' | 'env' | 'vault' | 'database';
  source: string;
  encrypted?: boolean;
}

export interface AirlineCredentials {
  apiKey: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface ManagedAirlineConfig extends AirlineConfig {
  credentials: AirlineCredentials;
  environment: 'development' | 'staging' | 'production';
  lastUpdated: Date;
  version: string;
}

export class AirlineConfigManager {
  private configs: Map<string, ManagedAirlineConfig> = new Map();
  private configSources: Map<string, ConfigurationSource> = new Map();
  private encryptionKey: string | undefined;

  constructor(encryptionKey?: string) {
    this.encryptionKey = encryptionKey;
  }

  /**
   * Load configuration from various sources
   */
  async loadConfiguration(airlineName: string, source: ConfigurationSource): Promise<ManagedAirlineConfig> {
    this.configSources.set(airlineName, source);

    let config: ManagedAirlineConfig;

    switch (source.type) {
      case 'file':
        config = await this.loadFromFile(source.source);
        break;
      case 'env':
        config = await this.loadFromEnvironment(airlineName);
        break;
      case 'vault':
        config = await this.loadFromVault(source.source, airlineName);
        break;
      case 'database':
        config = await this.loadFromDatabase(source.source, airlineName);
        break;
      default:
        throw new Error(`Unsupported configuration source type: ${source.type}`);
    }

    // Decrypt if necessary
    if (source.encrypted && this.encryptionKey) {
      config = await this.decryptConfig(config);
    }

    // Validate configuration
    this.validateConfig(config);

    // Store in memory cache
    this.configs.set(airlineName, config);

    return config;
  }

  /**
   * Get configuration for an airline
   */
  getConfiguration(airlineName: string): ManagedAirlineConfig | null {
    return this.configs.get(airlineName) || null;
  }

  /**
   * Update configuration
   */
  async updateConfiguration(airlineName: string, updates: Partial<ManagedAirlineConfig>): Promise<void> {
    const existingConfig = this.configs.get(airlineName);
    if (!existingConfig) {
      throw new Error(`Configuration for airline '${airlineName}' not found`);
    }

    const updatedConfig: ManagedAirlineConfig = {
      ...existingConfig,
      ...updates,
      lastUpdated: new Date(),
      version: this.generateVersion()
    };

    this.validateConfig(updatedConfig);
    this.configs.set(airlineName, updatedConfig);

    // Persist changes back to source
    const source = this.configSources.get(airlineName);
    if (source) {
      await this.persistConfiguration(airlineName, updatedConfig, source);
    }
  }

  /**
   * Refresh credentials (useful for OAuth tokens)
   */
  async refreshCredentials(airlineName: string): Promise<void> {
    const config = this.configs.get(airlineName);
    if (!config) {
      throw new Error(`Configuration for airline '${airlineName}' not found`);
    }

    if (config.credentials.refreshToken) {
      // Implement OAuth token refresh logic
      const newCredentials = await this.refreshOAuthToken(config);
      await this.updateConfiguration(airlineName, { credentials: newCredentials });
    }
  }

  /**
   * Check if credentials are expired
   */
  areCredentialsExpired(airlineName: string): boolean {
    const config = this.configs.get(airlineName);
    if (!config || !config.credentials || !config.credentials.expiresAt) {
      return false;
    }

    const expirationDate = config.credentials.expiresAt instanceof Date
      ? config.credentials.expiresAt
      : new Date(config.credentials.expiresAt);
    
    return new Date() >= expirationDate;
  }

  /**
   * Get all configured airlines
   */
  getConfiguredAirlines(): string[] {
    return Array.from(this.configs.keys());
  }

  /**
   * Remove configuration
   */
  removeConfiguration(airlineName: string): void {
    this.configs.delete(airlineName);
    this.configSources.delete(airlineName);
  }

  /**
   * Load configuration from file
   */
  private async loadFromFile(filePath: string): Promise<ManagedAirlineConfig> {
    try {
      const absolutePath = path.resolve(filePath);
      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const config = JSON.parse(fileContent);
      
      return {
        ...config,
        lastUpdated: new Date(config.lastUpdated || Date.now()),
        version: config.version || '1.0.0'
      };
    } catch (error) {
      throw new Error(`Failed to load configuration from file '${filePath}': ${error}`);
    }
  }

  /**
   * Load configuration from environment variables
   */
  private async loadFromEnvironment(airlineName: string): Promise<ManagedAirlineConfig> {
    const prefix = `${airlineName.toUpperCase().replace(/-/g, '_')}_`;
    
    const config: ManagedAirlineConfig = {
      name: airlineName,
      baseUrl: process.env[`${prefix}BASE_URL`] || '',
      apiKey: process.env[`${prefix}API_KEY`] || '',
      timeout: parseInt(process.env[`${prefix}TIMEOUT`] || '5000'),
      rateLimit: {
        requestsPerMinute: parseInt(process.env[`${prefix}RATE_LIMIT_PER_MINUTE`] || '60'),
        requestsPerHour: parseInt(process.env[`${prefix}RATE_LIMIT_PER_HOUR`] || '1000')
      },
      retryConfig: {
        maxRetries: parseInt(process.env[`${prefix}MAX_RETRIES`] || '3'),
        backoffMultiplier: parseFloat(process.env[`${prefix}BACKOFF_MULTIPLIER`] || '2'),
        initialDelay: parseInt(process.env[`${prefix}INITIAL_DELAY`] || '1000')
      },
      credentials: this.buildCredentials(prefix),
      environment: (process.env['NODE_ENV'] as any) || 'development',
      lastUpdated: new Date(),
      version: '1.0.0'
    };

    return config;
  }

  /**
   * Load configuration from vault (placeholder implementation)
   */
  private async loadFromVault(_vaultPath: string, _airlineName: string): Promise<ManagedAirlineConfig> {
    // This would integrate with HashiCorp Vault, AWS Secrets Manager, etc.
    throw new Error('Vault integration not implemented yet');
  }

  /**
   * Load configuration from database (placeholder implementation)
   */
  private async loadFromDatabase(_connectionString: string, _airlineName: string): Promise<ManagedAirlineConfig> {
    // This would integrate with a database to store configurations
    throw new Error('Database integration not implemented yet');
  }

  /**
   * Decrypt configuration
   */
  private async decryptConfig(config: ManagedAirlineConfig): Promise<ManagedAirlineConfig> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not provided');
    }

    // Simple encryption/decryption implementation
    // In production, use proper encryption libraries like crypto
    const decryptedConfig = { ...config };
    
    // Decrypt sensitive fields
    if (config.credentials.apiKey) {
      decryptedConfig.credentials.apiKey = this.decrypt(config.credentials.apiKey);
    }
    if (config.credentials.apiSecret) {
      decryptedConfig.credentials.apiSecret = this.decrypt(config.credentials.apiSecret);
    }

    return decryptedConfig;
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: ManagedAirlineConfig): void {
    const errors: string[] = [];

    if (!config.name || config.name.trim() === '') {
      errors.push('Airline name is required');
    }

    if (!config.baseUrl || config.baseUrl.trim() === '') {
      errors.push('Base URL is required');
    }

    if (!config.credentials.apiKey || config.credentials.apiKey.trim() === '') {
      errors.push('API key is required');
    }

    if (config.timeout <= 0) {
      errors.push('Timeout must be positive');
    }

    if (config.rateLimit.requestsPerMinute <= 0) {
      errors.push('Rate limit per minute must be positive');
    }

    if (config.rateLimit.requestsPerHour <= 0) {
      errors.push('Rate limit per hour must be positive');
    }

    if (config.retryConfig.maxRetries < 0) {
      errors.push('Max retries cannot be negative');
    }

    if (config.retryConfig.backoffMultiplier <= 0) {
      errors.push('Backoff multiplier must be positive');
    }

    if (config.retryConfig.initialDelay <= 0) {
      errors.push('Initial delay must be positive');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Persist configuration back to source
   */
  private async persistConfiguration(
    airlineName: string, 
    config: ManagedAirlineConfig, 
    source: ConfigurationSource
  ): Promise<void> {
    switch (source.type) {
      case 'file':
        await this.persistToFile(config, source.source);
        break;
      case 'env':
        // Environment variables are typically read-only
        console.warn('Cannot persist changes to environment variables');
        break;
      case 'vault':
        await this.persistToVault(config, source.source, airlineName);
        break;
      case 'database':
        await this.persistToDatabase(config, source.source, airlineName);
        break;
    }
  }

  /**
   * Persist configuration to file
   */
  private async persistToFile(config: ManagedAirlineConfig, filePath: string): Promise<void> {
    try {
      const absolutePath = path.resolve(filePath);
      await fs.writeFile(absolutePath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to persist configuration to file '${filePath}': ${error}`);
    }
  }

  /**
   * Persist to vault (placeholder)
   */
  private async persistToVault(_config: ManagedAirlineConfig, _vaultPath: string, _airlineName: string): Promise<void> {
    throw new Error('Vault persistence not implemented yet');
  }

  /**
   * Persist to database (placeholder)
   */
  private async persistToDatabase(_config: ManagedAirlineConfig, _connectionString: string, _airlineName: string): Promise<void> {
    throw new Error('Database persistence not implemented yet');
  }

  /**
   * Refresh OAuth token (placeholder implementation)
   */
  private async refreshOAuthToken(config: ManagedAirlineConfig): Promise<AirlineCredentials> {
    // This would implement OAuth token refresh logic
    // For now, return the existing credentials
    return config.credentials;
  }

  /**
   * Generate version string
   */
  private generateVersion(): string {
    const now = new Date();
    return `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}.${now.getHours()}${now.getMinutes()}`;
  }

  /**
   * Simple decrypt function (placeholder)
   */
  private decrypt(encryptedValue: string): string {
    // In production, use proper encryption libraries
    return Buffer.from(encryptedValue, 'base64').toString('utf-8');
  }

  /**
   * Build credentials object from environment variables
   */
  private buildCredentials(prefix: string): AirlineCredentials {
    const credentials: AirlineCredentials = {
      apiKey: process.env[`${prefix}API_KEY`] || ''
    };

    const apiSecret = process.env[`${prefix}API_SECRET`];
    if (apiSecret) credentials.apiSecret = apiSecret;

    const clientId = process.env[`${prefix}CLIENT_ID`];
    if (clientId) credentials.clientId = clientId;

    const clientSecret = process.env[`${prefix}CLIENT_SECRET`];
    if (clientSecret) credentials.clientSecret = clientSecret;

    const accessToken = process.env[`${prefix}ACCESS_TOKEN`];
    if (accessToken) credentials.accessToken = accessToken;

    const refreshToken = process.env[`${prefix}REFRESH_TOKEN`];
    if (refreshToken) credentials.refreshToken = refreshToken;

    return credentials;
  }
}