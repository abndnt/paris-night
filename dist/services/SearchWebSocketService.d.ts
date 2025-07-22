import { Server as SocketIOServer } from 'socket.io';
import { FlightSearchOrchestrator } from './FlightSearchOrchestrator';
export interface SearchWebSocketEvents {
    'search:start': (data: {
        searchId: string;
        criteria: any;
    }) => void;
    'search:progress': (data: {
        searchId: string;
        status: string;
        progress: number;
        completedSources: string[];
        totalSources: number;
        resultsCount: number;
        errors: string[];
        estimatedCompletion?: Date;
    }) => void;
    'search:completed': (data: {
        searchId: string;
        results: any[];
        totalResults: number;
    }) => void;
    'search:failed': (data: {
        searchId: string;
        error: string;
    }) => void;
    'search:filtered': (data: {
        searchId: string;
        filters: any;
        originalCount: number;
        filteredCount: number;
        results: any[];
    }) => void;
    'search:sorted': (data: {
        searchId: string;
        sortBy: string;
        sortOrder: string;
        results: any[];
    }) => void;
}
export declare class SearchWebSocketService {
    private io;
    private orchestrator;
    private connectedClients;
    constructor(io: SocketIOServer, orchestrator: FlightSearchOrchestrator);
    private setupEventHandlers;
    emitSearchProgress(searchId: string, progress: {
        status: string;
        progress: number;
        completedSources: string[];
        totalSources: number;
        resultsCount: number;
        errors: string[];
        estimatedCompletion?: Date;
    }): void;
    emitSearchCompleted(searchId: string, results: any[], totalResults: number): void;
    emitSearchFailed(searchId: string, error: string): void;
    emitSearchFiltered(searchId: string, filters: any, originalCount: number, filteredCount: number, results: any[]): void;
    emitSearchSorted(searchId: string, sortBy: string, sortOrder: string, results: any[]): void;
    private emitToSearchRoom;
    emitToAll(event: string, data: any): void;
    getConnectedClientsCount(): number;
    getSearchRoomParticipants(searchId: string): number;
    broadcastSystemMessage(message: string, type?: 'info' | 'warning' | 'error'): void;
    healthCheck(): {
        status: 'healthy' | 'unhealthy';
        connectedClients: number;
        activeRooms: number;
    };
}
//# sourceMappingURL=SearchWebSocketService.d.ts.map