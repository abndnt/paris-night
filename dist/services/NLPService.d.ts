import { MessageIntent } from '../models/Chat';
export interface IntentPattern {
    intent: string;
    patterns: string[];
    entities?: string[];
}
export declare class NLPService {
    private intentPatterns;
    analyzeMessage(message: string): Promise<MessageIntent>;
    private calculatePatternMatch;
    private extractEntities;
    private extractLocation;
    private extractDate;
    private extractProgram;
    private extractNumber;
    private extractConfirmationCode;
    generateResponse(intent: MessageIntent): string;
}
//# sourceMappingURL=NLPService.d.ts.map