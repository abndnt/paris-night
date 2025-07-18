import { MessageIntent } from '../models/Chat';

/**
 * Basic fallback NLP service for when LLM services are unavailable
 * This provides minimal intent recognition for system reliability
 */
export class NLPService {
  /**
   * Basic fallback message analysis - only for system reliability
   * Main conversation handling should use LLM service
   */
  async analyzeMessage(message: string): Promise<MessageIntent> {
    const normalizedMessage = message.toLowerCase().trim();

    // Basic greeting detection
    if (this.isGreeting(normalizedMessage)) {
      return {
        intent: 'greeting',
        confidence: 0.8,
        entities: {}
      };
    }

    // Basic flight search detection
    if (this.isFlightSearch(normalizedMessage)) {
      return {
        intent: 'flight_search',
        confidence: 0.6,
        entities: {}
      };
    }

    // Default to unknown
    return {
      intent: 'unknown',
      confidence: 0,
      entities: {}
    };
  }

  /**
   * Basic greeting detection
   */
  private isGreeting(message: string): boolean {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    return greetings.some(greeting => message.includes(greeting));
  }

  /**
   * Basic flight search detection
   */
  private isFlightSearch(message: string): boolean {
    const flightKeywords = ['flight', 'fly', 'travel', 'trip', 'book'];
    return flightKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Generate basic fallback responses
   * Main response generation should use LLM service
   */
  generateResponse(intent: MessageIntent): string {
    switch (intent.intent) {
      case 'greeting':
        return "Hello! I'm here to help you with flight searches and travel planning. How can I assist you today?";

      case 'flight_search':
        return "I can help you find flights! Please tell me your departure city, destination, and travel dates.";

      default:
        return "I'm experiencing some technical difficulties with my AI assistant. Please try again in a moment, or contact support if the issue persists.";
    }
  }

  /**
   * Generate system error response when LLM is unavailable
   */
  generateSystemErrorResponse(): string {
    return "I'm having trouble with my AI assistant right now, but I'll be back shortly. Please try again in a moment.";
  }
}