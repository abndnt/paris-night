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
exports.AirlineConfigManager = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class AirlineConfigManager {
    constructor(encryptionKey) {
        this.configs = new Map();
        this.configSources = new Map();
        this.encryptionKey = encryptionKey;
    }
    async loadConfiguration(airlineName, source) {
        this.configSources.set(airlineName, source);
        let config;
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
        if (source.encrypted && this.encryptionKey) {
            config = await this.decryptConfig(config);
        }
        this.validateConfig(config);
        this.configs.set(airlineName, config);
        return config;
    }
    getConfiguration(airlineName) {
        return this.configs.get(airlineName) || null;
    }
    async updateConfiguration(airlineName, updates) {
        const existingConfig = this.configs.get(airlineName);
        if (!existingConfig) {
            throw new Error(`Configuration for airline '${airlineName}' not found`);
        }
        const updatedConfig = {
            ...existingConfig,
            ...updates,
            lastUpdated: new Date(),
            version: this.generateVersion()
        };
        this.validateConfig(updatedConfig);
        this.configs.set(airlineName, updatedConfig);
        const source = this.configSources.get(airlineName);
        if (source) {
            await this.persistConfiguration(airlineName, updatedConfig, source);
        }
    }
    async refreshCredentials(airlineName) {
        const config = this.configs.get(airlineName);
        if (!config) {
            throw new Error(`Configuration for airline '${airlineName}' not found`);
        }
        if (config.credentials.refreshToken) {
            const newCredentials = await this.refreshOAuthToken(config);
            await this.updateConfiguration(airlineName, { credentials: newCredentials });
        }
    }
    areCredentialsExpired(airlineName) {
        const config = this.configs.get(airlineName);
        if (!config || !config.credentials || !config.credentials.expiresAt) {
            return false;
        }
        const expirationDate = config.credentials.expiresAt instanceof Date
            ? config.credentials.expiresAt
            : new Date(config.credentials.expiresAt);
        return new Date() >= expirationDate;
    }
    getConfiguredAirlines() {
        return Array.from(this.configs.keys());
    }
    removeConfiguration(airlineName) {
        this.configs.delete(airlineName);
        this.configSources.delete(airlineName);
    }
    async loadFromFile(filePath) {
        try {
            const absolutePath = path.resolve(filePath);
            const fileContent = await fs.readFile(absolutePath, 'utf-8');
            const config = JSON.parse(fileContent);
            return {
                ...config,
                lastUpdated: new Date(config.lastUpdated || Date.now()),
                version: config.version || '1.0.0'
            };
        }
        catch (error) {
            throw new Error(`Failed to load configuration from file '${filePath}': ${error}`);
        }
    }
    async loadFromEnvironment(airlineName) {
        const prefix = `${airlineName.toUpperCase().replace(/-/g, '_')}_`;
        const config = {
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
            environment: process.env['NODE_ENV'] || 'development',
            lastUpdated: new Date(),
            version: '1.0.0'
        };
        return config;
    }
    async loadFromVault(_vaultPath, _airlineName) {
        throw new Error('Vault integration not implemented yet');
    }
    async loadFromDatabase(_connectionString, _airlineName) {
        throw new Error('Database integration not implemented yet');
    }
    async decryptConfig(config) {
        if (!this.encryptionKey) {
            throw new Error('Encryption key not provided');
        }
        const decryptedConfig = { ...config };
        if (config.credentials.apiKey) {
            decryptedConfig.credentials.apiKey = this.decrypt(config.credentials.apiKey);
        }
        if (config.credentials.apiSecret) {
            decryptedConfig.credentials.apiSecret = this.decrypt(config.credentials.apiSecret);
        }
        return decryptedConfig;
    }
    validateConfig(config) {
        const errors = [];
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
    async persistConfiguration(airlineName, config, source) {
        switch (source.type) {
            case 'file':
                await this.persistToFile(config, source.source);
                break;
            case 'env':
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
    async persistToFile(config, filePath) {
        try {
            const absolutePath = path.resolve(filePath);
            await fs.writeFile(absolutePath, JSON.stringify(config, null, 2), 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to persist configuration to file '${filePath}': ${error}`);
        }
    }
    async persistToVault(_config, _vaultPath, _airlineName) {
        throw new Error('Vault persistence not implemented yet');
    }
    async persistToDatabase(_config, _connectionString, _airlineName) {
        throw new Error('Database persistence not implemented yet');
    }
    async refreshOAuthToken(config) {
        return config.credentials;
    }
    generateVersion() {
        const now = new Date();
        return `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}.${now.getHours()}${now.getMinutes()}`;
    }
    decrypt(encryptedValue) {
        return Buffer.from(encryptedValue, 'base64').toString('utf-8');
    }
    buildCredentials(prefix) {
        const credentials = {
            apiKey: process.env[`${prefix}API_KEY`] || ''
        };
        const apiSecret = process.env[`${prefix}API_SECRET`];
        if (apiSecret)
            credentials.apiSecret = apiSecret;
        const clientId = process.env[`${prefix}CLIENT_ID`];
        if (clientId)
            credentials.clientId = clientId;
        const clientSecret = process.env[`${prefix}CLIENT_SECRET`];
        if (clientSecret)
            credentials.clientSecret = clientSecret;
        const accessToken = process.env[`${prefix}ACCESS_TOKEN`];
        if (accessToken)
            credentials.accessToken = accessToken;
        const refreshToken = process.env[`${prefix}REFRESH_TOKEN`];
        if (refreshToken)
            credentials.refreshToken = refreshToken;
        return credentials;
    }
}
exports.AirlineConfigManager = AirlineConfigManager;
//# sourceMappingURL=AirlineConfigManager.js.map