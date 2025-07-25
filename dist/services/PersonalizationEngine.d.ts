import { Pool } from 'pg';
import { TravelPreferences } from '../models/TravelPreferences';
export interface PersonalizedRecommendation {
    type: 'flight' | 'route' | 'airline' | 'airport' | 'deal';
    title: string;
    description: string;
    data: any;
    score: number;
    reason: string;
}
export interface UserBehaviorData {
    searchHistory: any[];
    bookingHistory: any[];
    clickHistory: any[];
    preferences: TravelPreferences | null;
}
export interface PersonalizationInsights {
    travelPatterns: {
        frequentRoutes: string[];
        preferredTravelDays: string[];
        averageAdvanceBooking: number;
        seasonalPreferences: string[];
    };
    spendingPatterns: {
        averageSpend: number;
        pointsUsageFrequency: number;
        preferredPaymentMethod: string;
    };
    recommendations: PersonalizedRecommendation[];
}
export declare class PersonalizationEngine {
    private db;
    private preferencesModel;
    private filterService;
    constructor(database: Pool);
    generateRecommendations(userId: string): Promise<PersonalizedRecommendation[]>;
    learnFromBookingHistory(userId: string): Promise<TravelPreferences | null>;
    private getUserBehaviorData;
    private generateRouteRecommendations;
    private generateAirlineRecommendations;
    private generateDealRecommendations;
    private generateTimeBasedRecommendations;
    private mergePreferences;
    private getSearchHistory;
    private getBookingHistory;
    generateInsights(userId: string): Promise<PersonalizationInsights>;
}
//# sourceMappingURL=PersonalizationEngine.d.ts.map