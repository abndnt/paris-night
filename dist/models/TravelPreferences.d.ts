import { Pool } from 'pg';
export interface TravelPreferences {
    id?: string;
    userId: string;
    preferredAirlines: string[];
    preferredAirports: string[];
    seatPreference?: 'aisle' | 'window' | 'middle';
    mealPreference?: string;
    maxLayovers: number;
    preferredCabinClass: 'economy' | 'premium' | 'business' | 'first';
    createdAt?: Date;
    updatedAt?: Date;
}
export interface CreateTravelPreferencesData {
    userId: string;
    preferredAirlines?: string[];
    preferredAirports?: string[];
    seatPreference?: 'aisle' | 'window' | 'middle';
    mealPreference?: string;
    maxLayovers?: number;
    preferredCabinClass?: 'economy' | 'premium' | 'business' | 'first';
}
export interface UpdateTravelPreferencesData {
    preferredAirlines?: string[];
    preferredAirports?: string[];
    seatPreference?: 'aisle' | 'window' | 'middle';
    mealPreference?: string;
    maxLayovers?: number;
    preferredCabinClass?: 'economy' | 'premium' | 'business' | 'first';
}
export declare class TravelPreferencesModel {
    private db;
    constructor(database: Pool);
    create(preferencesData: CreateTravelPreferencesData): Promise<TravelPreferences>;
    findByUserId(userId: string): Promise<TravelPreferences | null>;
    update(userId: string, updateData: UpdateTravelPreferencesData): Promise<TravelPreferences | null>;
    delete(userId: string): Promise<boolean>;
    upsert(preferencesData: CreateTravelPreferencesData): Promise<TravelPreferences>;
}
//# sourceMappingURL=TravelPreferences.d.ts.map