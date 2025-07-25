import { SearchCriteria, FlightResult } from '../models/FlightSearch';
export interface MultiCitySearchCriteria {
    cities: string[];
    departureDate: Date;
    returnDate?: Date;
    passengers: {
        adults: number;
        children: number;
        infants: number;
    };
    cabinClass: 'economy' | 'premium' | 'business' | 'first';
    flexible: boolean;
    maxLayoverTime?: number;
    minLayoverTime?: number;
}
export interface PositioningFlightSuggestion {
    originalSearch: SearchCriteria;
    positioningFlight: FlightResult;
    mainFlight: FlightResult;
    totalCost: number;
    totalTime: number;
    savings: number;
    feasible: boolean;
    reason?: string;
}
export interface StopoverOption {
    city: string;
    minStayDuration: number;
    maxStayDuration: number;
    additionalCost: number;
    availableActivities?: string[];
}
export interface OpenJawItinerary {
    outboundOrigin: string;
    outboundDestination: string;
    returnOrigin: string;
    returnDestination: string;
    outboundFlight: FlightResult;
    returnFlight: FlightResult;
    groundTransport?: {
        method: 'train' | 'bus' | 'car' | 'flight';
        duration: number;
        cost: number;
    };
    totalCost: number;
    feasible: boolean;
}
export interface RouteOptimizationOptions {
    considerPositioning: boolean;
    maxPositioningDetour: number;
    allowStopovers: boolean;
    maxStopoverDuration: number;
    considerOpenJaw: boolean;
    maxGroundTransportTime: number;
    prioritizeTime: boolean;
    prioritizeCost: boolean;
    prioritizePoints: boolean;
}
export interface OptimizedRoute {
    originalCriteria: SearchCriteria;
    optimizedFlights: FlightResult[];
    routeType: 'direct' | 'multi-city' | 'positioning' | 'stopover' | 'open-jaw';
    totalCost: number;
    totalTime: number;
    pointsRequired?: number;
    savings: number;
    optimizationScore: number;
    recommendations: string[];
    alternatives: OptimizedRoute[];
}
export declare class RouteOptimizationService {
    private readonly POSITIONING_THRESHOLD_SAVINGS;
    private readonly MAX_POSITIONING_DETOUR_MILES;
    private readonly MIN_LAYOVER_TIME;
    private readonly MAX_LAYOVER_TIME;
    private readonly STOPOVER_MIN_DURATION;
    private readonly MAJOR_HUBS;
    optimizeRoute(searchCriteria: SearchCriteria, availableFlights: FlightResult[], options: RouteOptimizationOptions): Promise<OptimizedRoute>;
    findPositioningFlights(searchCriteria: SearchCriteria, availableFlights: FlightResult[], maxDetourMiles?: number): Promise<PositioningFlightSuggestion[]>;
    findStopoverOptions(searchCriteria: SearchCriteria, availableFlights: FlightResult[], maxStopoverHours: number): Promise<StopoverOption[]>;
    findOpenJawOptions(searchCriteria: SearchCriteria, availableFlights: FlightResult[], maxGroundTransportHours: number): Promise<OpenJawItinerary[]>;
    optimizeMultiCityRoute(criteria: MultiCitySearchCriteria, availableFlights: FlightResult[]): Promise<OptimizedRoute>;
    private createDirectRoute;
    private calculateOptimizationScore;
    private getNearbyAirports;
    private findBestPositioningFlight;
    private findBestMainFlight;
    private getDirectFlightCost;
    private isTimingFeasible;
    private calculateStopoverCost;
    private getStopoverActivities;
    private calculateGroundTransport;
    private createPositioningRoute;
    private createStopoverRoute;
    private createOpenJawRoute;
    private selectBestSegmentFlight;
    private calculateSegmentScore;
    private calculateMultiCityScore;
    private generateMultiCityRecommendations;
    private convertMultiCityToSearchCriteria;
}
//# sourceMappingURL=RouteOptimizationService.d.ts.map