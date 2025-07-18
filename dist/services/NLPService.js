"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NLPService = void 0;
class NLPService {
    constructor() {
        this.intentPatterns = [
            {
                intent: 'flight_search',
                patterns: [
                    'find flights?',
                    'search flights?',
                    'book flights?',
                    'flights? from .* to .*',
                    'travel from .* to .*',
                    'fly from .* to .*',
                    'trip to .*',
                    'going to .*',
                    'visit .*',
                ],
                entities: ['origin', 'destination', 'date']
            },
            {
                intent: 'greeting',
                patterns: [
                    'hello',
                    'hi',
                    'hey',
                    'good morning',
                    'good afternoon',
                    'good evening',
                    'greetings',
                ]
            },
            {
                intent: 'help',
                patterns: [
                    'help',
                    'what can you do',
                    'how does this work',
                    'assistance',
                    'support',
                    'guide me',
                ]
            },
            {
                intent: 'points_inquiry',
                patterns: [
                    'points',
                    'rewards',
                    'miles',
                    'credit card points',
                    'loyalty program',
                    'redeem points',
                    'transfer points',
                ],
                entities: ['program_name', 'points_amount']
            },
            {
                intent: 'booking_status',
                patterns: [
                    'booking status',
                    'my reservation',
                    'confirmation',
                    'ticket status',
                    'flight status',
                ],
                entities: ['confirmation_code']
            },
            {
                intent: 'goodbye',
                patterns: [
                    'bye',
                    'goodbye',
                    'see you',
                    'thanks',
                    'thank you',
                    'that\'s all',
                    'done',
                ]
            }
        ];
    }
    async analyzeMessage(message) {
        const normalizedMessage = message.toLowerCase().trim();
        let bestMatch = {
            intent: 'unknown',
            confidence: 0
        };
        for (const intentPattern of this.intentPatterns) {
            for (const pattern of intentPattern.patterns) {
                const confidence = this.calculatePatternMatch(normalizedMessage, pattern);
                if (confidence > bestMatch.confidence) {
                    bestMatch = {
                        intent: intentPattern.intent,
                        confidence
                    };
                }
            }
        }
        const entities = this.extractEntities(normalizedMessage, bestMatch.intent);
        return {
            intent: bestMatch.intent,
            confidence: bestMatch.confidence,
            entities
        };
    }
    calculatePatternMatch(message, pattern) {
        const regexPattern = pattern
            .replace(/\?/g, '')
            .replace(/\.\*/g, '([\\w\\s]+)')
            .replace(/\s+/g, '\\s+');
        try {
            const regex = new RegExp(regexPattern, 'i');
            const match = message.match(regex);
            if (match) {
                const matchedLength = match[0].length;
                const messageLength = message.length;
                return Math.min(matchedLength / messageLength, 1.0);
            }
        }
        catch (error) {
            const keywords = pattern.split(/\s+/).filter(word => word.length > 2);
            const matchedKeywords = keywords.filter(keyword => message.includes(keyword.replace(/[?.*]/g, '')));
            if (matchedKeywords.length > 0) {
                return matchedKeywords.length / keywords.length;
            }
        }
        return 0;
    }
    extractEntities(message, intent) {
        const entities = {};
        switch (intent) {
            case 'flight_search':
                entities['origin'] = this.extractLocation(message, ['from']);
                entities['destination'] = this.extractLocation(message, ['to']);
                entities['date'] = this.extractDate(message);
                break;
            case 'points_inquiry':
                entities['program_name'] = this.extractProgram(message);
                entities['points_amount'] = this.extractNumber(message);
                break;
            case 'booking_status':
                entities['confirmation_code'] = this.extractConfirmationCode(message);
                break;
        }
        Object.keys(entities).forEach(key => {
            if (entities[key] === null || entities[key] === undefined) {
                delete entities[key];
            }
        });
        return entities;
    }
    extractLocation(message, indicators) {
        for (const indicator of indicators) {
            const regex = new RegExp(`${indicator}\\s+([a-zA-Z\\s]+?)(?:\\s+to|\\s+on|\\s*$)`, 'i');
            const match = message.match(regex);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        return null;
    }
    extractDate(message) {
        const datePatterns = [
            /(\d{1,2}\/\d{1,2}\/\d{4})/,
            /(\d{4}-\d{2}-\d{2})/,
            /(tomorrow|today|next week|next month)/i,
            /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i
        ];
        for (const pattern of datePatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }
    extractProgram(message) {
        const programs = [
            'chase ultimate rewards',
            'american express',
            'capital one',
            'citi thankyou',
            'united mileageplus',
            'delta skymiles',
            'american aadvantage',
            'southwest rapid rewards'
        ];
        for (const program of programs) {
            if (message.toLowerCase().includes(program)) {
                return program;
            }
        }
        return null;
    }
    extractNumber(message) {
        const match = message.match(/(\d+(?:,\d{3})*)/);
        if (match && match[1]) {
            return parseInt(match[1].replace(/,/g, ''));
        }
        return null;
    }
    extractConfirmationCode(message) {
        const match = message.match(/([A-Z0-9]{6,})/i);
        return match && match[1] ? match[1] : null;
    }
    generateResponse(intent) {
        switch (intent.intent) {
            case 'greeting':
                return "Hello! I'm here to help you find the best flight deals using your points and miles. What can I help you with today?";
            case 'help':
                return "I can help you:\n• Search for flights and compare prices\n• Find the best ways to use your points and miles\n• Check your booking status\n• Optimize your travel rewards\n\nJust tell me what you're looking for!";
            case 'flight_search':
                if (intent.entities['origin'] && intent.entities['destination']) {
                    return `I'd be happy to help you find flights from ${intent.entities['origin']} to ${intent.entities['destination']}. Let me search for the best options using both cash and points. When would you like to travel?`;
                }
                else {
                    return "I'd love to help you find flights! Could you tell me where you'd like to fly from and to? For example: 'Find flights from New York to Los Angeles'";
                }
            case 'points_inquiry':
                return "I can help you maximize your points and miles! Which loyalty program are you interested in, and how many points do you have available?";
            case 'booking_status':
                if (intent.entities['confirmation_code']) {
                    return `Let me check the status of your booking with confirmation code ${intent.entities['confirmation_code']}. Please give me a moment to look that up.`;
                }
                else {
                    return "I can help you check your booking status. Could you provide your confirmation code?";
                }
            case 'goodbye':
                return "Thank you for using our flight search service! Have a great trip, and feel free to come back anytime you need help with travel planning.";
            default:
                return "I'm not sure I understand. I can help you search for flights, check your points balance, or answer questions about travel rewards. What would you like to do?";
        }
    }
}
exports.NLPService = NLPService;
//# sourceMappingURL=NLPService.js.map