import { IAirlineAdapter } from '../adapters/BaseAirlineAdapter';
import { AirlineConfigManager, ConfigurationSource, ManagedAirlineConfig } from '../services/AirlineConfigManager';
import { RedisClientType } from 'redis';
export interface AdapterFactoryOptions {
    redisClient: RedisClientType;
    configManager?: AirlineConfigManager;
    encryptionKey?: string;
    defaultConfigPath?: string;
}
export declare class AirlineAdapterFactory {
    private configManager;
    private redisClient;
    private rateLimiter;
    private cache;
    private adapters;
    constructor(options: AdapterFactoryOptions);
    createAdapter(airlineName: string, adapterType?: 'mock' | 'real'): Promise<IAirlineAdapter>;
    getAdapter(airlineName: string, adapterType?: 'mock' | 'real'): Promise<IAirlineAdapter>;
    private loadAirlineConfig;
    private createDefaultConfig;
    registerAirline(airlineName: string, config: Partial<ManagedAirlineConfig>, source: ConfigurationSource): Promise<void>;
    updateAirlineConfig(airlineName: string, updates: Partial<ManagedAirlineConfig>): Promise<void>;
    removeAirline(airlineName: string): void;
    getConfiguredAirlines(): string[];
    getAdapterHealth(airlineName: string): Promise<{
        status: string;
        lastCheck: Date;
        responseTime?: number;
    }>;
    getAllAdapterHealth(): Promise<Record<string, {
        status: string;
        lastCheck: Date;
        responseTime?: number;
    }>>;
    refreshAllCredentials(): Promise<void>;
    cleanup(): Promise<void>;
}
//# sourceMappingURL=AirlineAdapterFactory.d.ts.map