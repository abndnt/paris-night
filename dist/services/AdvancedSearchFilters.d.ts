import { FlightResult, SearchCriteria } from '../models/FlightSearch';
export interface PowerUserFilters {
    aircraftTypes?: string[];
    excludeAircraftTypes?: string[];
    operatingAirlines?: string[];
    excludeOperatingAirlines?: string[];
    alliancePreference?: 'star-alliance' | 'oneworld' | 'skyteam';
    departureTimeWindows?: TimeWindow[];
    arrivalTimeWindows?: TimeWindow[];
    maxTotalTravelTime?: number;
    minLayoverTime?: number;
    maxLayoverTime?: number;
    preferredLayoverAirports?: string[];
    avoidLayoverAirports?: string[];
    maxSegments?: number;
    directFlightsOnly?: boolean;
    avoidRedEyes?: boolean;
    preferDaytimeFlights?: boolean;
    maxBacktrackingDistance?: number;
    fareBasisCodes?: string[];
    bookingClasses?: string[];
    refundableOnly?: boolean;
    changeableOnly?: boolean;
    advancePurchaseRequirement?: number;
    awardAvailabilityOnly?: boolean;
    specificRewardPrograms?: string[];
    maxPointsRequired?: number;
    preferCashOverPoints?: boolean;
    wifiRequired?: boolean;
    mealServiceRequired?: boolean;
    entertainmentRequired?: boolean;
    powerOutletsRequired?: boolean;
    lieFlat?: boolean;
    fuelEfficientAircraftOnly?: boolean;
    carbonOffsetAvailable?: boolean;
    sustainableAviationFuel?: boolean;
    allowPositioning?: boolean;
    allowStopovers?: boolean;
    allowOpenJaw?: boolean;
    multiCityOptimization?: boolean;
}
export interface TimeWindow {
    start: string;
    end: string;
    timezone?: string;
}
export interface FilterResult {
    originalCount: number;
    filteredCount: number;
    removedByFilter: Record<string, number>;
    appliedFilters: string[];
    warnings: string[];
    suggestions: string[];
}
export interface AircraftInfo {
    type: string;
    manufacturer: string;
    wifiAvailable: boolean;
    entertainmentSystem: boolean;
    powerOutlets: boolean;
    lieFlat: boolean;
    fuelEfficient: boolean;
}
export interface AirlineInfo {
    code: string;
    name: string;
    alliance: 'star-alliance' | 'oneworld' | 'skyteam' | 'none';
    operatesFor: string[];
}
export declare class AdvancedSearchFilters {
    private readonly AIRCRAFT_DATABASE;
    private readonly AIRLINE_DATABASE;
    applyAdvancedFilters(flights: FlightResult[], filters: PowerUserFilters): Promise<{
        filteredFlights: FlightResult[];
        filterResult: FilterResult;
    }>;
    getAvailableFilterOptions(flights: FlightResult[]): {
        aircraftTypes: string[];
        airlines: string[];
        layoverAirports: string[];
        alliances: string[];
        maxTravelTime: number;
        minTravelTime: number;
    };
    private filterByAircraftTypes;
    private excludeAircraftTypes;
    private filterByAlliance;
    private filterByDepartureTimeWindows;
    private filterByArrivalTimeWindows;
    private filterByMaxTravelTime;
    private filterByLayoverTime;
    private filterByPreferredLayoverAirports;
    private filterByAvoidLayoverAirports;
    private filterByMaxSegments;
    private filterDirectFlightsOnly;
    private filterAvoidRedEyes;
    private filterByWifiRequired;
    private filterByLieFlat;
    private filterByFuelEfficiency;
    private filterByAwardAvailability;
    generateFilterRecommendations(searchCriteria: SearchCriteria, flights: FlightResult[]): string[];
}
//# sourceMappingURL=AdvancedSearchFilters.d.ts.map