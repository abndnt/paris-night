import { AirlineConfig } from '../adapters/BaseAirlineAdapter';
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
export declare class AirlineConfigManager {
    private configs;
    private configSources;
    private encryptionKey;
    constructor(encryptionKey?: string);
    loadConfiguration(airlineName: string, source: ConfigurationSource): Promise<ManagedAirlineConfig>;
    getConfiguration(airlineName: string): ManagedAirlineConfig | null;
    updateConfiguration(airlineName: string, updates: Partial<ManagedAirlineConfig>): Promise<void>;
    refreshCredentials(airlineName: string): Promise<void>;
    areCredentialsExpired(airlineName: string): boolean;
    getConfiguredAirlines(): string[];
    removeConfiguration(airlineName: string): void;
    private loadFromFile;
    private loadFromEnvironment;
    private loadFromVault;
    private loadFromDatabase;
    private decryptConfig;
    private validateConfig;
    private persistConfiguration;
    private persistToFile;
    private persistToVault;
    private persistToDatabase;
    private refreshOAuthToken;
    private generateVersion;
    private decrypt;
    private buildCredentials;
}
//# sourceMappingURL=AirlineConfigManager.d.ts.map