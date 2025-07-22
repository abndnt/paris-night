import { AirlineConfigManager, ConfigurationSource, ManagedAirlineConfig } from '../services/AirlineConfigManager';
import { AirlineAdapterFactory } from '../factories/AirlineAdapterFactory';
import { RedisClientType } from 'redis';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  exists: jest.fn(),
  keys: jest.fn(),
  flushAll: jest.fn(),
  quit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  isOpen: true,
  isReady: true
} as unknown as RedisClientType;

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('AirlineConfigManager', () => {
  let configManager: AirlineConfigManager;
  let testConfigPath: string;
  let mockConfig: ManagedAirlineConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    configManager = new AirlineConfigManager('test-encryption-key');
    testConfigPath = path.join(__dirname, '..', 'config', 'airline-configs', 'test-airline.json');
    
    mockConfig = {
      name: 'test-airline',
      baseUrl: 'https://api.test-airline.com/v1',
      apiKey: 'test-api-key',
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
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret'
      },
      environment: 'development',
      lastUpdated: new Date('2024-01-01T00:00:00.000Z'),
      version: '1.0.0'
    };
  });

  describe('loadConfiguration', () => {
    it('should load configuration from file', async () => {
      const fileSource: ConfigurationSource = {
        type: 'file',
        source: testConfigPath
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await configManager.loadConfiguration('test-airline', fileSource);

      expect(result).toEqual(expect.objectContaining({
        name: 'test-airline',
        baseUrl: 'https://api.test-airline.com/v1',
        apiKey: 'test-api-key'
      }));
      expect(mockFs.readFile).toHaveBeenCalledWith(path.resolve(testConfigPath), 'utf-8');
    });

    it('should load configuration from environment variables', async () => {
      const envSource: ConfigurationSource = {
        type: 'env',
        source: 'environment'
      };

      // Mock environment variables
      process.env['TEST_AIRLINE_BASE_URL'] = 'https://api.test-airline.com/v1';
      process.env['TEST_AIRLINE_API_KEY'] = 'env-api-key';
      process.env['TEST_AIRLINE_TIMEOUT'] = '8000';
      process.env['TEST_AIRLINE_RATE_LIMIT_PER_MINUTE'] = '100';
      process.env['TEST_AIRLINE_RATE_LIMIT_PER_HOUR'] = '2000';

      const result = await configManager.loadConfiguration('test-airline', envSource);

      expect(result.baseUrl).toBe('https://api.test-airline.com/v1');
      expect(result.credentials.apiKey).toBe('env-api-key');
      expect(result.timeout).toBe(8000);
      expect(result.rateLimit.requestsPerMinute).toBe(100);
      expect(result.rateLimit.requestsPerHour).toBe(2000);

      // Clean up environment variables
      delete process.env['TEST_AIRLINE_BASE_URL'];
      delete process.env['TEST_AIRLINE_API_KEY'];
      delete process.env['TEST_AIRLINE_TIMEOUT'];
      delete process.env['TEST_AIRLINE_RATE_LIMIT_PER_MINUTE'];
      delete process.env['TEST_AIRLINE_RATE_LIMIT_PER_HOUR'];
    });

    it('should throw error for unsupported configuration source', async () => {
      const invalidSource: ConfigurationSource = {
        type: 'invalid' as any,
        source: 'test'
      };

      await expect(configManager.loadConfiguration('test-airline', invalidSource))
        .rejects.toThrow('Unsupported configuration source type: invalid');
    });

    it('should validate configuration and throw error for invalid config', async () => {
      const invalidConfig = {
        ...mockConfig,
        name: '', // Invalid: empty name
        timeout: -1 // Invalid: negative timeout
      };

      const fileSource: ConfigurationSource = {
        type: 'file',
        source: testConfigPath
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      await expect(configManager.loadConfiguration('test-airline', fileSource))
        .rejects.toThrow('Configuration validation failed');
    });
  });

  describe('getConfiguration', () => {
    it('should return configuration if exists', async () => {
      const fileSource: ConfigurationSource = {
        type: 'file',
        source: testConfigPath
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      await configManager.loadConfiguration('test-airline', fileSource);

      const result = configManager.getConfiguration('test-airline');
      expect(result).toEqual(expect.objectContaining({
        name: 'test-airline',
        baseUrl: 'https://api.test-airline.com/v1'
      }));
    });

    it('should return null if configuration does not exist', () => {
      const result = configManager.getConfiguration('non-existent-airline');
      expect(result).toBeNull();
    });
  });

  describe('updateConfiguration', () => {
    beforeEach(async () => {
      const fileSource: ConfigurationSource = {
        type: 'file',
        source: testConfigPath
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      await configManager.loadConfiguration('test-airline', fileSource);
    });

    it('should update existing configuration', async () => {
      const updates = {
        timeout: 10000,
        rateLimit: {
          requestsPerMinute: 120,
          requestsPerHour: 2400
        }
      };

      mockFs.writeFile.mockResolvedValue();

      await configManager.updateConfiguration('test-airline', updates);

      const updatedConfig = configManager.getConfiguration('test-airline');
      expect(updatedConfig?.timeout).toBe(10000);
      expect(updatedConfig?.rateLimit.requestsPerMinute).toBe(120);
      expect(updatedConfig?.rateLimit.requestsPerHour).toBe(2400);
      expect(updatedConfig?.lastUpdated).toBeInstanceOf(Date);
    });

    it('should throw error if configuration does not exist', async () => {
      await expect(configManager.updateConfiguration('non-existent-airline', {}))
        .rejects.toThrow("Configuration for airline 'non-existent-airline' not found");
    });

    it('should validate updated configuration', async () => {
      const invalidUpdates = {
        timeout: -1 // Invalid: negative timeout
      };

      await expect(configManager.updateConfiguration('test-airline', invalidUpdates))
        .rejects.toThrow('Configuration validation failed');
    });
  });

  describe('areCredentialsExpired', () => {
    beforeEach(async () => {
      const fileSource: ConfigurationSource = {
        type: 'file',
        source: testConfigPath
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      await configManager.loadConfiguration('test-airline', fileSource);
    });

    it('should return false if no expiration date is set', () => {
      const result = configManager.areCredentialsExpired('test-airline');
      expect(result).toBe(false);
    });

    it('should return true if credentials are expired', async () => {
      const expiredConfig = {
        ...mockConfig,
        credentials: {
          ...mockConfig.credentials,
          expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(expiredConfig));
      await configManager.loadConfiguration('expired-airline', {
        type: 'file',
        source: testConfigPath
      });

      const result = configManager.areCredentialsExpired('expired-airline');
      expect(result).toBe(true);
    });

    it('should return false if credentials are not expired', async () => {
      const validConfig = {
        ...mockConfig,
        credentials: {
          ...mockConfig.credentials,
          expiresAt: new Date(Date.now() + 3600000) // Expires in 1 hour
        }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(validConfig));
      await configManager.loadConfiguration('valid-airline', {
        type: 'file',
        source: testConfigPath
      });

      const result = configManager.areCredentialsExpired('valid-airline');
      expect(result).toBe(false);
    });

    it('should return false if configuration does not exist', () => {
      const result = configManager.areCredentialsExpired('non-existent-airline');
      expect(result).toBe(false);
    });
  });

  describe('getConfiguredAirlines', () => {
    it('should return empty array when no airlines are configured', () => {
      const result = configManager.getConfiguredAirlines();
      expect(result).toEqual([]);
    });

    it('should return list of configured airlines', async () => {
      const fileSource: ConfigurationSource = {
        type: 'file',
        source: testConfigPath
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      await configManager.loadConfiguration('airline1', fileSource);
      await configManager.loadConfiguration('airline2', fileSource);

      const result = configManager.getConfiguredAirlines();
      expect(result).toContain('airline1');
      expect(result).toContain('airline2');
      expect(result).toHaveLength(2);
    });
  });

  describe('removeConfiguration', () => {
    beforeEach(async () => {
      const fileSource: ConfigurationSource = {
        type: 'file',
        source: testConfigPath
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
      await configManager.loadConfiguration('test-airline', fileSource);
    });

    it('should remove configuration', () => {
      expect(configManager.getConfiguration('test-airline')).not.toBeNull();
      
      configManager.removeConfiguration('test-airline');
      
      expect(configManager.getConfiguration('test-airline')).toBeNull();
      expect(configManager.getConfiguredAirlines()).not.toContain('test-airline');
    });
  });
});

describe('AirlineAdapterFactory', () => {
  let factory: AirlineAdapterFactory;
  let configManager: AirlineConfigManager;

  beforeEach(() => {
    configManager = new AirlineConfigManager();
    factory = new AirlineAdapterFactory({
      redisClient: mockRedisClient,
      configManager,
      encryptionKey: 'test-key'
    });
  });

  describe('createAdapter', () => {
    it('should create mock adapter with default configuration', async () => {
      const adapter = await factory.createAdapter('test-airline', 'mock');

      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('test-airline');
      expect(adapter.config.name).toBe('test-airline');
    });

    it('should create adapter with file configuration', async () => {
      const testConfig = {
        name: 'test-airline',
        baseUrl: 'https://api.test.com',
        apiKey: 'file-api-key',
        timeout: 8000,
        rateLimit: {
          requestsPerMinute: 100,
          requestsPerHour: 2000
        },
        retryConfig: {
          maxRetries: 2,
          backoffMultiplier: 1.5,
          initialDelay: 500
        },
        credentials: {
          apiKey: 'file-api-key'
        },
        environment: 'production' as const,
        lastUpdated: new Date(),
        version: '1.0.0'
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(testConfig));

      const adapter = await factory.createAdapter('test-airline', 'mock');

      expect(adapter.config.baseUrl).toBe('https://api.test.com');
      expect(adapter.config.timeout).toBe(8000);
    });

    it('should return cached adapter on subsequent calls', async () => {
      const adapter1 = await factory.createAdapter('test-airline', 'mock');
      const adapter2 = await factory.createAdapter('test-airline', 'mock');

      expect(adapter1).toBe(adapter2);
    });

    it('should throw error for unsupported adapter type', async () => {
      await expect(factory.createAdapter('test-airline', 'unsupported' as any))
        .rejects.toThrow('Unsupported adapter type: unsupported');
    });
  });

  describe('getAdapterHealth', () => {
    it('should return not_initialized status for non-existent adapter', async () => {
      const health = await factory.getAdapterHealth('non-existent-airline');

      expect(health.status).toBe('not_initialized');
      expect(health.lastCheck).toBeInstanceOf(Date);
    });

    it('should return health status for existing adapter', async () => {
      await factory.createAdapter('test-airline', 'mock');
      
      const health = await factory.getAdapterHealth('test-airline');

      expect(health.status).toMatch(/healthy|unhealthy/);
      expect(health.lastCheck).toBeInstanceOf(Date);
      expect(typeof health.responseTime).toBe('number');
    });
  });

  describe('updateAirlineConfig', () => {
    it('should update configuration and remove cached adapter', async () => {
      // Create adapter first
      const adapter1 = await factory.createAdapter('test-airline', 'mock');
      
      // Update configuration
      await factory.updateAirlineConfig('test-airline', {
        timeout: 15000
      });

      // Create adapter again - should be new instance with updated config
      const adapter2 = await factory.createAdapter('test-airline', 'mock');
      
      expect(adapter1).not.toBe(adapter2);
      expect(adapter2.config.timeout).toBe(15000);
    });
  });

  describe('getConfiguredAirlines', () => {
    it('should return list of configured airlines', async () => {
      await factory.createAdapter('airline1', 'mock');
      await factory.createAdapter('airline2', 'mock');

      const airlines = factory.getConfiguredAirlines();
      
      expect(airlines).toContain('airline1');
      expect(airlines).toContain('airline2');
    });
  });

  describe('removeAirline', () => {
    it('should remove airline configuration and cached adapter', async () => {
      await factory.createAdapter('test-airline', 'mock');
      expect(factory.getConfiguredAirlines()).toContain('test-airline');

      factory.removeAirline('test-airline');

      expect(factory.getConfiguredAirlines()).not.toContain('test-airline');
    });
  });

  describe('getAllAdapterHealth', () => {
    it('should return health status for all configured adapters', async () => {
      await factory.createAdapter('airline1', 'mock');
      await factory.createAdapter('airline2', 'mock');

      const healthStatuses = await factory.getAllAdapterHealth();

      expect(healthStatuses).toHaveProperty('airline1');
      expect(healthStatuses).toHaveProperty('airline2');
      expect(healthStatuses['airline1']?.status).toMatch(/healthy|unhealthy|not_initialized/);
      expect(healthStatuses['airline2']?.status).toMatch(/healthy|unhealthy|not_initialized/);
    });
  });
});