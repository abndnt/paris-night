import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Pool } from 'pg';
import { CreateMessageData } from '../models/Chat';
export interface SocketUser {
    id?: string;
    email?: string;
}
export interface AuthenticatedSocket extends Socket {
    user?: SocketUser;
    sessionId?: string;
}
export interface ChatResponse {
    message: string;
    intent?: string;
    confidence?: number;
    suggestions?: string[];
}
export declare class ChatService {
    private io;
    private chatModel;
    private nlpService;
    private llmService;
    constructor(server: HTTPServer, database: Pool);
    private setupSocketHandlers;
    private handleConnection;
    sendMessageToSession(sessionId: string, message: CreateMessageData): Promise<void>;
    getConnectedSocketsCount(): number;
    getIO(): SocketIOServer;
}
//# sourceMappingURL=ChatService.d.ts.map