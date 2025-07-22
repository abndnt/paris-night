export interface ConversationContext {
    sessionId: string;
    userId?: string | undefined;
    messageHistory: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: Date;
    }>;
    userPreferences?: {
        preferredAirlines?: string[];
        preferredAirports?: string[];
        loyaltyPrograms?: string[];
    } | undefined;
}
export interface FlightSearchIntent {
    intent: 'flight_search' | 'points_inquiry' | 'booking_status' | 'help' | 'greeting' | 'goodbye' | 'route_optimization' | 'price_alert' | 'unknown';
    confidence: number;
    entities: {
        origin?: string;
        destination?: string;
        departureDate?: string;
        returnDate?: string;
        passengers?: number;
        cabinClass?: 'economy' | 'premium' | 'business' | 'first';
        confirmationCode?: string;
        loyaltyProgram?: string;
        pointsAmount?: number;
        flexible?: boolean;
        maxStops?: number;
        preferredAirlines?: string[];
        budget?: number;
        tripType?: 'roundtrip' | 'oneway' | 'multicity';
    };
    response: string;
    followUpQuestions?: string[];
}
export interface LLMResponse {
    content: string;
    intent: FlightSearchIntent;
    conversationEnded: boolean;
    requiresAction?: {
        type: 'search_flights' | 'check_points' | 'lookup_booking' | 'optimize_route' | 'create_alert';
        parameters: Record<string, any>;
    };
}
export declare class LLMService {
    private client;
    private fallbackClient;
    private isAvailable;
    private lastHealthCheck;
    private currentModel;
    private fallbackModel;
    constructor();
    generateResponse(message: string, context: ConversationContext): Promise<LLMResponse>;
    private generateResponseWithModel;
    extractFlightIntent(message: string): Promise<FlightSearchIntent>;
    checkHealth(): Promise<boolean>;
    isServiceAvailable(): boolean;
    private getFlightIntentFunction;
    private buildSystemPrompt;
    private buildMessageHistory;
    private determineRequiredAction;
    getAvailableModels(): string[];
    switchModel(modelName: string): void;
}
//# sourceMappingURL=LLMService.d.ts.map