import { Pool } from 'pg';
import { TravelPreferences } from '../models/TravelPreferences';
export interface LearningInsight {
    type: 'airline' | 'airport' | 'cabin_class' | 'layover' | 'timing' | 'route';
    insight: string;
    confidence: number;
    data: any;
}
export interface PreferenceLearningResult {
    updatedPreferences: TravelPreferences | null;
    insights: LearningInsight[];
    learningConfidence: number;
}
export declare class PreferenceLearningService {
    private db;
    private preferencesModel;
    constructor(database: Pool);
    learnAndUpdatePreferences(userId: string): Promise<PreferenceLearningResult>;
    private learnAirlinePreferences;
    private learnAirportPreferences;
    private learnCabinClassPreferences;
    private learnLayoverPreferences;
    private learnTimingPreferences;
    private createUpdatedPreferences;
    private mergeArrayPreferences;
    private getBookingHistory;
    private getSearchHistory;
}
//# sourceMappingURL=PreferenceLearningService.d.ts.map