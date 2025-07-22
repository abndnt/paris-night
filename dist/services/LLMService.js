"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
class LLMService {
    constructor() {
        this.isAvailable = true;
        this.lastHealthCheck = new Date();
        this.currentModel = config_1.config.llm.model;
        this.fallbackModel = config_1.config.llm.fallbackModel;
        this.client = new openai_1.default({
            baseURL: config_1.config.llm.baseUrl,
            apiKey: config_1.config.llm.apiKey,
            defaultHeaders: {
                'HTTP-Referer': config_1.config.llm.referer || 'https://flight-search-saas.com',
                'X-Title': config_1.config.llm.title || 'Flight Search SaaS',
            },
        });
        this.fallbackClient = new openai_1.default({
            baseURL: config_1.config.llm.baseUrl,
            apiKey: config_1.config.llm.apiKey,
            defaultHeaders: {
                'HTTP-Referer': config_1.config.llm.referer || 'https://flight-search-saas.com',
                'X-Title': config_1.config.llm.title || 'Flight Search SaaS',
            },
        });
    }
    async generateResponse(message, context) {
        let lastError = null;
        try {
            return await this.generateResponseWithModel(message, context, this.currentModel, this.client);
        }
        catch (error) {
            lastError = error;
            logger_1.logger.warn(`Primary LLM model ${this.currentModel} failed, trying fallback:`, error);
            if (config_1.config.llm.enableFallback && this.fallbackModel !== this.currentModel) {
                try {
                    const response = await this.generateResponseWithModel(message, context, this.fallbackModel, this.fallbackClient);
                    logger_1.logger.info(`Fallback LLM model ${this.fallbackModel} succeeded`);
                    return response;
                }
                catch (fallbackError) {
                    logger_1.logger.error(`Fallback LLM model ${this.fallbackModel} also failed:`, fallbackError);
                    lastError = fallbackError;
                }
            }
        }
        this.isAvailable = false;
        throw lastError || new Error('All LLM models failed');
    }
    async generateResponseWithModel(message, context, model, client) {
        const systemPrompt = this.buildSystemPrompt(context);
        const messages = this.buildMessageHistory(message, context, systemPrompt);
        const completion = await client.chat.completions.create({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 800,
            functions: [this.getFlightIntentFunction()],
            function_call: { name: 'extract_flight_intent' }
        });
        const functionCall = completion.choices[0]?.message?.function_call;
        if (!functionCall || functionCall.name !== 'extract_flight_intent') {
            throw new Error('LLM did not return expected function call');
        }
        const intentData = JSON.parse(functionCall.arguments);
        const requiresAction = this.determineRequiredAction(intentData);
        logger_1.logger.info(`LLM (${model}) processed message with intent: ${intentData.intent} (confidence: ${intentData.confidence})`);
        const response = {
            content: intentData.response,
            intent: intentData,
            conversationEnded: intentData.intent === 'goodbye'
        };
        if (requiresAction) {
            response.requiresAction = requiresAction;
        }
        return response;
    }
    async extractFlightIntent(message) {
        try {
            const response = await this.generateResponse(message, {
                sessionId: 'temp',
                messageHistory: []
            });
            return response.intent;
        }
        catch (error) {
            logger_1.logger.error('Intent extraction error:', error);
            throw error;
        }
    }
    async checkHealth() {
        const now = new Date();
        if (now.getTime() - this.lastHealthCheck.getTime() < 5 * 60 * 1000) {
            return this.isAvailable;
        }
        try {
            const response = await this.client.chat.completions.create({
                model: this.currentModel,
                messages: [{ role: 'user', content: 'Health check' }],
                max_tokens: 5,
                temperature: 0
            });
            const isHealthy = !!response.choices[0]?.message?.content;
            if (isHealthy) {
                this.isAvailable = true;
                this.lastHealthCheck = now;
                logger_1.logger.info(`LLM service health check passed for model: ${this.currentModel}`);
                return true;
            }
            if (config_1.config.llm.enableFallback && this.fallbackModel !== this.currentModel) {
                try {
                    const fallbackResponse = await this.fallbackClient.chat.completions.create({
                        model: this.fallbackModel,
                        messages: [{ role: 'user', content: 'Health check' }],
                        max_tokens: 5,
                        temperature: 0
                    });
                    const fallbackHealthy = !!fallbackResponse.choices[0]?.message?.content;
                    if (fallbackHealthy) {
                        this.isAvailable = true;
                        this.lastHealthCheck = now;
                        logger_1.logger.info(`LLM fallback service health check passed for model: ${this.fallbackModel}`);
                        return true;
                    }
                }
                catch (fallbackError) {
                    logger_1.logger.warn(`LLM fallback health check failed for model ${this.fallbackModel}:`, fallbackError);
                }
            }
            this.isAvailable = false;
            this.lastHealthCheck = now;
            logger_1.logger.warn('All LLM models failed health check');
            return false;
        }
        catch (error) {
            logger_1.logger.warn(`LLM service health check failed for model ${this.currentModel}:`, error);
            this.isAvailable = false;
            this.lastHealthCheck = now;
            return false;
        }
    }
    isServiceAvailable() {
        return this.isAvailable;
    }
    getFlightIntentFunction() {
        return {
            name: 'extract_flight_intent',
            description: 'Extract structured flight search intent and entities from user message, then provide a helpful response',
            parameters: {
                type: 'object',
                properties: {
                    intent: {
                        type: 'string',
                        enum: ['flight_search', 'points_inquiry', 'booking_status', 'help', 'greeting', 'goodbye', 'route_optimization', 'price_alert', 'unknown'],
                        description: 'The primary intent of the user message'
                    },
                    confidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        description: 'Confidence score for the intent classification (0.0 to 1.0)'
                    },
                    entities: {
                        type: 'object',
                        properties: {
                            origin: { type: 'string', description: 'Departure city, airport code, or region' },
                            destination: { type: 'string', description: 'Arrival city, airport code, or region' },
                            departureDate: { type: 'string', description: 'Departure date in YYYY-MM-DD format' },
                            returnDate: { type: 'string', description: 'Return date in YYYY-MM-DD format for round trips' },
                            passengers: { type: 'number', description: 'Number of passengers (default 1)' },
                            cabinClass: {
                                type: 'string',
                                enum: ['economy', 'premium', 'business', 'first'],
                                description: 'Preferred cabin class'
                            },
                            confirmationCode: { type: 'string', description: 'Booking confirmation code or PNR' },
                            loyaltyProgram: { type: 'string', description: 'Airline or credit card loyalty program name' },
                            pointsAmount: { type: 'number', description: 'Number of points or miles mentioned' },
                            flexible: { type: 'boolean', description: 'Whether dates are flexible' },
                            maxStops: { type: 'number', description: 'Maximum number of stops/layovers' },
                            preferredAirlines: { type: 'array', items: { type: 'string' }, description: 'Preferred airlines mentioned' },
                            budget: { type: 'number', description: 'Budget amount in USD' },
                            tripType: { type: 'string', enum: ['roundtrip', 'oneway', 'multicity'], description: 'Type of trip' }
                        }
                    },
                    response: {
                        type: 'string',
                        description: 'Natural, conversational response to the user that acknowledges their request and provides helpful information or asks clarifying questions'
                    },
                    followUpQuestions: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Suggested follow-up questions to gather more information if needed'
                    }
                },
                required: ['intent', 'confidence', 'entities', 'response']
            }
        };
    }
    buildSystemPrompt(context) {
        const currentDate = new Date().toISOString().split('T')[0];
        let prompt = `You are an expert AI travel assistant specializing in flight searches and points optimization. Today's date is ${currentDate}.

CORE EXPERTISE:
- Flight search and booking optimization
- Credit card points and airline miles maximization
- Route optimization and positioning flights
- Award availability and sweet spots
- Transfer partner strategies
- Travel hacking and deal finding

CONVERSATION STYLE:
- Be conversational, helpful, and enthusiastic about travel
- Ask clarifying questions when information is missing
- Provide specific, actionable recommendations
- Explain the reasoning behind suggestions
- Use travel industry terminology appropriately
- Keep responses concise but informative (2-3 sentences typically)

FLIGHT SEARCH GUIDANCE:
- Always try to extract specific travel details (origin, destination, dates)
- If dates are flexible, ask about preferred time ranges
- Consider both cash and points options
- Suggest alternative airports when beneficial
- Mention positioning flights for better deals when relevant

POINTS OPTIMIZATION:
- Help users understand point valuations and transfer ratios
- Suggest optimal redemption strategies
- Explain transfer partner benefits and limitations
- Consider promotional bonuses and limited-time offers
- Compare cash vs points value propositions

BOOKING ASSISTANCE:
- Help track booking status and changes
- Explain airline policies and restrictions
- Suggest timing for bookings and cancellations
- Provide guidance on seat selection and upgrades`;
        if (context.userPreferences) {
            prompt += `\n\nUSER PREFERENCES:`;
            if (context.userPreferences.preferredAirlines?.length) {
                prompt += `\n- Preferred Airlines: ${context.userPreferences.preferredAirlines.join(', ')}`;
            }
            if (context.userPreferences.preferredAirports?.length) {
                prompt += `\n- Preferred Airports: ${context.userPreferences.preferredAirports.join(', ')}`;
            }
            if (context.userPreferences.loyaltyPrograms?.length) {
                prompt += `\n- Active Loyalty Programs: ${context.userPreferences.loyaltyPrograms.join(', ')}`;
            }
        }
        if (context.messageHistory.length > 0) {
            prompt += `\n\nCONVERSATION CONTEXT: This is a continuing conversation. Reference previous messages when relevant and maintain conversation flow.`;
        }
        prompt += `\n\nIMPORTANT: Always call the extract_flight_intent function to structure your response with proper intent classification and entity extraction.`;
        return prompt;
    }
    buildMessageHistory(currentMessage, context, systemPrompt) {
        const messages = [
            { role: 'system', content: systemPrompt }
        ];
        const recentHistory = context.messageHistory.slice(-10);
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role,
                content: msg.content
            });
        }
        messages.push({
            role: 'user',
            content: currentMessage
        });
        return messages;
    }
    determineRequiredAction(intent) {
        switch (intent.intent) {
            case 'flight_search':
                if (intent.entities.origin && intent.entities.destination) {
                    return {
                        type: 'search_flights',
                        parameters: {
                            origin: intent.entities.origin,
                            destination: intent.entities.destination,
                            departureDate: intent.entities.departureDate,
                            returnDate: intent.entities.returnDate,
                            passengers: intent.entities.passengers || 1,
                            cabinClass: intent.entities.cabinClass || 'economy',
                            flexible: intent.entities.flexible || false,
                            maxStops: intent.entities.maxStops,
                            preferredAirlines: intent.entities.preferredAirlines,
                            budget: intent.entities.budget,
                            tripType: intent.entities.tripType || 'roundtrip'
                        }
                    };
                }
                break;
            case 'points_inquiry':
                if (intent.entities.loyaltyProgram) {
                    return {
                        type: 'check_points',
                        parameters: {
                            program: intent.entities.loyaltyProgram,
                            amount: intent.entities.pointsAmount
                        }
                    };
                }
                break;
            case 'booking_status':
                if (intent.entities.confirmationCode) {
                    return {
                        type: 'lookup_booking',
                        parameters: {
                            confirmationCode: intent.entities.confirmationCode
                        }
                    };
                }
                break;
            case 'route_optimization':
                if (intent.entities.origin && intent.entities.destination) {
                    return {
                        type: 'optimize_route',
                        parameters: {
                            origin: intent.entities.origin,
                            destination: intent.entities.destination,
                            departureDate: intent.entities.departureDate,
                            returnDate: intent.entities.returnDate,
                            flexible: intent.entities.flexible || true
                        }
                    };
                }
                break;
            case 'price_alert':
                if (intent.entities.origin && intent.entities.destination) {
                    return {
                        type: 'create_alert',
                        parameters: {
                            origin: intent.entities.origin,
                            destination: intent.entities.destination,
                            departureDate: intent.entities.departureDate,
                            returnDate: intent.entities.returnDate,
                            budget: intent.entities.budget
                        }
                    };
                }
                break;
        }
        return undefined;
    }
    getAvailableModels() {
        return [this.currentModel, this.fallbackModel];
    }
    switchModel(modelName) {
        if (modelName !== this.currentModel) {
            logger_1.logger.info(`Switching LLM model from ${this.currentModel} to ${modelName}`);
            this.currentModel = modelName;
            this.lastHealthCheck = new Date(0);
        }
    }
}
exports.LLMService = LLMService;
//# sourceMappingURL=LLMService.js.map