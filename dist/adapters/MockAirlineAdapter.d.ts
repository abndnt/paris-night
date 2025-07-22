import { BaseAirlineAdapter, AirlineConfig, AirlineSearchRequest, AirlineSearchResponse, AirlineApiError, RateLimiter, AirlineCache } from './BaseAirlineAdapter';
export declare class MockAirlineAdapter extends BaseAirlineAdapter {
    private mockDelay;
    private shouldSimulateError;
    private errorRate;
    constructor(config: AirlineConfig, rateLimiter: RateLimiter, cache: AirlineCache, options?: {
        mockDelay?: number;
        shouldSimulateError?: boolean;
        errorRate?: number;
    });
    protected makeApiRequest(request: AirlineSearchRequest): Promise<any>;
    protected normalizeResponse(rawResponse: any, request: AirlineSearchRequest): Promise<AirlineSearchResponse>;
    protected handleApiError(error: any): AirlineApiError;
    private generateMockFlightData;
    private generateMockFlight;
    healthCheck(): Promise<boolean>;
    setMockDelay(delay: number): void;
    setErrorSimulation(shouldSimulate: boolean, errorRate?: number): void;
    generateScenario(scenario: 'no-flights' | 'expensive-flights' | 'direct-only' | 'layovers-only'): Promise<any>;
}
//# sourceMappingURL=MockAirlineAdapter.d.ts.map