import { Pool } from 'pg';
export interface ChatSession {
    id: string;
    userId?: string;
    sessionData: any;
    lastActivity: Date;
    createdAt: Date;
}
export interface ChatMessage {
    id: string;
    sessionId: string;
    messageType: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: any;
    createdAt: Date;
}
export interface CreateSessionData {
    userId?: string | undefined;
    sessionData?: any;
}
export interface CreateMessageData {
    sessionId: string;
    messageType: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: any;
}
export interface MessageIntent {
    intent: string;
    confidence: number;
    entities: {
        [key: string]: any;
    };
}
export declare class ChatModel {
    private db;
    constructor(database: Pool);
    createSession(sessionData: CreateSessionData): Promise<ChatSession>;
    getSession(sessionId: string): Promise<ChatSession | null>;
    updateSessionActivity(sessionId: string): Promise<void>;
    updateSessionData(sessionId: string, sessionData: any): Promise<ChatSession | null>;
    addMessage(messageData: CreateMessageData): Promise<ChatMessage>;
    getMessages(sessionId: string, limit?: number, offset?: number): Promise<ChatMessage[]>;
    getRecentMessages(sessionId: string, count?: number): Promise<ChatMessage[]>;
    getUserSessions(userId: string, limit?: number): Promise<ChatSession[]>;
    deleteSession(sessionId: string): Promise<boolean>;
}
//# sourceMappingURL=Chat.d.ts.map