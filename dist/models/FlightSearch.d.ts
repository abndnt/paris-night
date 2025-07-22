import { Pool } from 'pg';
import * as Joi from 'joi';
export interface PassengerCount {
    adults: number;
    children: number;
    infants: number;
}
export interface SearchCriteria {
    origin: string;
    destination: string;
    departureDate: Date;
    returnDate?: Date;
    passengers: PassengerCount;
    cabinClass: 'economy' | 'premium' | 'business' | 'first';
    flexible: boolean;
}
export interface FlightSegment {
    airline: string;
    flightNumber: string;
    origin: string;
    destination: string;
    departureTime: Date;
    arrivalTime: Date;
    duration: number;
    aircraft?: string;
    operatingAirline?: string;
}
export interface PricingInfo {
    cashPrice: number;
    currency: string;
    pointsOptions: PointsOption[];
    taxes: number;
    fees: number;
    totalPrice: number;
}
export interface PointsOption {
    program: string;
    pointsRequired: number;
    cashComponent?: number;
    transferRatio?: number;
    bestValue: boolean;
}
export interface AvailabilityInfo {
    availableSeats: number;
    bookingClass: string;
    fareBasis: string;
    restrictions?: string[];
}
export interface FlightResult {
    id: string;
    airline: string;
    flightNumber: string;
    route: FlightSegment[];
    pricing: PricingInfo;
    availability: AvailabilityInfo;
    duration: number;
    layovers: number;
    layoverDuration?: number;
    score?: number;
}
export interface FlightSearch {
    id: string;
    userId?: string;
    searchCriteria: SearchCriteria;
    results: FlightResult[];
    status: 'pending' | 'completed' | 'error';
    createdAt: Date;
    expiresAt: Date;
}
export interface CreateFlightSearchData {
    userId?: string;
    searchCriteria: SearchCriteria;
}
export interface UpdateFlightSearchData {
    results?: FlightResult[];
    status?: 'pending' | 'completed' | 'error';
}
export declare const PassengerCountSchema: Joi.ObjectSchema<any>;
export declare const SearchCriteriaSchema: Joi.ObjectSchema<any>;
export declare const CreateFlightSearchSchema: Joi.ObjectSchema<any>;
export declare const UpdateFlightSearchSchema: Joi.ObjectSchema<any>;
export declare class FlightSearchModel {
    private db;
    constructor(database: Pool);
    createSearch(searchData: CreateFlightSearchData): Promise<FlightSearch>;
    getSearch(searchId: string): Promise<FlightSearch | null>;
    updateSearch(searchId: string, updateData: UpdateFlightSearchData): Promise<FlightSearch | null>;
    getUserSearches(userId: string, limit?: number, offset?: number): Promise<FlightSearch[]>;
    getRecentSearches(limit?: number): Promise<FlightSearch[]>;
    deleteSearch(searchId: string): Promise<boolean>;
    deleteExpiredSearches(): Promise<number>;
    private mapRowToFlightSearch;
}
//# sourceMappingURL=FlightSearch.d.ts.map