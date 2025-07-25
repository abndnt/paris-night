import { BaseAirlineAdapter, AirlineConfig, AirlineSearchRequest, AirlineSearchResponse } from './BaseAirlineAdapter';
import { AirlineRateLimiter } from '../services/AirlineRateLimiter';
import { AirlineCache } from '../services/AirlineCache';
export declare class AmadeusAdapter extends BaseAirlineAdapter {
    private accessToken;
    private tokenExpiry;
    constructor(config: AirlineConfig, rateLimiter: AirlineRateLimiter, cache: AirlineCache);
    protected makeApiRequest(request: AirlineSearchRequest): Promise<any>;
    protected normalizeResponse(rawResponse: any, request: AirlineSearchRequest): Promise<AirlineSearchResponse>;
    protected handleApiError(error: any): any;
    private ensureValidToken;
    private transformToAmadeusFormat;
    private normalizeAmadeusRoute;
    private calculateDuration;
    private calculateAmadeusScore;
    private mapCabinClass;
    private isAmadeusRetryableError;
}
//# sourceMappingURL=AmadeusAdapter.d.ts.map