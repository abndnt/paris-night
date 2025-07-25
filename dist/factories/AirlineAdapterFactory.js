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
exports.AirlineAdapterFactory = void 0;
const MockAirlineAdapter_1 = require("../adapters/MockAirlineAdapter");
const AmadeusAdapter_1 = require("../adapters/AmadeusAdapter");
const AirlineConfigManager_1 = require("../services/AirlineConfigManager");
const AirlineRateLimiter_1 = require("../services/AirlineRateLimiter");
const AirlineCache_1 = require("../services/AirlineCache");
const path = __importStar(require("path"));
class AirlineAdapterFactory {
    constructor(options) {
        this.adapters = new Map();
        this.redisClient = options.redisClient;
        this.configManager = options.configManager || new AirlineConfigManager_1.AirlineConfigManager(options.encryptionKey);
        this.rateLimiter = new AirlineRateLimiter_1.AirlineRateLimiter(this.redisClient);
        this.cache = new AirlineCache_1.AirlineCache(this.redisClient);
    }
    async createAdapter(airlineName, adapterType = 'mock') {
        const existingAdapter = this.adapters.get(airlineName);
        if (existingAdapter) {
            return existingAdapter;
        }
        const config = await this.loadAirlineConfig(airlineName);
        let adapter;
        switch (adapterType) {
            case 'mock':
                adapter = new MockAirlineAdapter_1.MockAirlineAdapter(config, this.rateLimiter, this.cache);
                adapter.name = airlineName;
                break;
            case 'real':
                switch (airlineName.toLowerCase()) {
                    case 'amadeus':
                        adapter = new AmadeusAdapter_1.AmadeusAdapter(config, this.rateLimiter, this.cache);
                        break;
                    default:
                        adapter = new MockAirlineAdapter_1.MockAirlineAdapter(config, this.rateLimiter, this.cache);
                        adapter.name = airlineName;
                        break;
                }
                break;
            default:
                throw new Error(`Unsupported adapter type: ${adapterType}`);
        }
        this.adapters.set(airlineName, adapter);
        return adapter;
    }
    async getAdapter(airlineName, adapterType = 'mock') {
        return this.createAdapter(airlineName, adapterType);
    }
    async loadAirlineConfig(airlineName) {
        let config = this.configManager.getConfiguration(airlineName);
        if (!config) {
            const configPath = path.join(__dirname, '..', 'config', 'airline-configs', `${airlineName}.json`);
            const fileSource = {
                type: 'file',
                source: configPath
            };
            try {
                config = await this.configManager.loadConfiguration(airlineName, fileSource);
            }
            catch (fileError) {
                const envSource = {
                    type: 'env',
                    source: 'environment'
                };
                try {
                    config = await this.configManager.loadConfiguration(airlineName, envSource);
                }
                catch (envError) {
                    config = this.createDefaultConfig(airlineName);
                    console.warn(`Using default configuration for airline '${airlineName}'. File error: ${fileError}. Env error: ${envError}`);
                }
            }
        }
        if (this.configManager.areCredentialsExpired(airlineName)) {
            try {
                await this.configManager.refreshCredentials(airlineName);
                config = this.configManager.getConfiguration(airlineName);
            }
            catch (refreshError) {
                console.warn(`Failed to refresh credentials for airline '${airlineName}': ${refreshError}`);
            }
        }
        return config;
    }
    createDefaultConfig(airlineName) {
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
    async registerAirline(airlineName, config, source) {
        const fullConfig = {
            ...this.createDefaultConfig(airlineName),
            ...config,
            name: airlineName,
            lastUpdated: new Date(),
            version: config.version || '1.0.0'
        };
        await this.configManager.loadConfiguration(airlineName, source);
        await this.configManager.updateConfiguration(airlineName, fullConfig);
    }
    async updateAirlineConfig(airlineName, updates) {
        await this.configManager.updateConfiguration(airlineName, updates);
        this.adapters.delete(airlineName);
    }
    removeAirline(airlineName) {
        this.configManager.removeConfiguration(airlineName);
        this.adapters.delete(airlineName);
    }
    getConfiguredAirlines() {
        return this.configManager.getConfiguredAirlines();
    }
    async getAdapterHealth(airlineName) {
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
        }
        catch (error) {
            return {
                status: 'error',
                lastCheck: new Date()
            };
        }
    }
    async getAllAdapterHealth() {
        const airlines = this.getConfiguredAirlines();
        const healthStatuses = {};
        for (const airline of airlines) {
            healthStatuses[airline] = await this.getAdapterHealth(airline);
        }
        return healthStatuses;
    }
    async refreshAllCredentials() {
        const airlines = this.getConfiguredAirlines();
        for (const airline of airlines) {
            try {
                await this.configManager.refreshCredentials(airline);
            }
            catch (error) {
                console.warn(`Failed to refresh credentials for airline '${airline}': ${error}`);
            }
        }
    }
    async cleanup() {
        this.adapters.clear();
    }
}
exports.AirlineAdapterFactory = AirlineAdapterFactory;
//# sourceMappingURL=AirlineAdapterFactory.js.map