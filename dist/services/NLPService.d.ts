import { MessageIntent } from '../models/Chat';
export declare class NLPService {
    analyzeMessage(message: string): Promise<MessageIntent>;
    private isGreeting;
    private isFlightSearch;
    generateResponse(intent: MessageIntent): string;
    generateSystemErrorResponse(): string;
}
//# sourceMappingURL=NLPService.d.ts.map