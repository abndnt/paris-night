"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchWebSocketService = void 0;
const logger_1 = require("../utils/logger");
class SearchWebSocketService {
    constructor(io, orchestrator) {
        this.connectedClients = new Map();
        this.io = io;
        this.orchestrator = orchestrator;
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.logger.info(`Search WebSocket client connected: ${socket.id}`);
            this.connectedClients.set(socket.id, socket);
            socket.on('search:join', (data) => {
                socket.join(`search:${data.searchId}`);
                logger_1.logger.debug(`Client ${socket.id} joined search room: ${data.searchId}`);
            });
            socket.on('search:leave', (data) => {
                socket.leave(`search:${data.searchId}`);
                logger_1.logger.debug(`Client ${socket.id} left search room: ${data.searchId}`);
            });
            socket.on('search:getProgress', async (data) => {
                try {
                    const progress = this.orchestrator.getSearchProgress(data.searchId);
                    if (progress) {
                        socket.emit('search:progress', {
                            searchId: progress.searchId,
                            status: progress.status,
                            progress: progress.progress,
                            completedSources: progress.completedSources,
                            totalSources: progress.totalSources,
                            resultsCount: progress.results.length,
                            errors: progress.errors,
                            estimatedCompletion: progress.estimatedCompletion
                        });
                    }
                    else {
                        socket.emit('search:notFound', { searchId: data.searchId });
                    }
                }
                catch (error) {
                    logger_1.logger.error('Error getting search progress:', error);
                    socket.emit('search:error', {
                        searchId: data.searchId,
                        error: 'Failed to get search progress'
                    });
                }
            });
            socket.on('search:cancel', async (data) => {
                try {
                    const cancelled = await this.orchestrator.cancelSearch(data.searchId);
                    if (cancelled) {
                        this.emitToSearchRoom(data.searchId, 'search:cancelled', { searchId: data.searchId });
                    }
                    else {
                        socket.emit('search:error', {
                            searchId: data.searchId,
                            error: 'Search not found or already completed'
                        });
                    }
                }
                catch (error) {
                    logger_1.logger.error('Error cancelling search:', error);
                    socket.emit('search:error', {
                        searchId: data.searchId,
                        error: 'Failed to cancel search'
                    });
                }
            });
            socket.on('search:getActive', () => {
                try {
                    const activeSearches = this.orchestrator.getActiveSearches();
                    socket.emit('search:activeList', {
                        searches: activeSearches.map(search => ({
                            searchId: search.searchId,
                            status: search.status,
                            progress: search.progress,
                            completedSources: search.completedSources,
                            totalSources: search.totalSources,
                            resultsCount: search.results.length,
                            startTime: search.startTime,
                            estimatedCompletion: search.estimatedCompletion
                        })),
                        totalActive: activeSearches.length
                    });
                }
                catch (error) {
                    logger_1.logger.error('Error getting active searches:', error);
                    socket.emit('search:error', { error: 'Failed to get active searches' });
                }
            });
            socket.on('disconnect', () => {
                logger_1.logger.info(`Search WebSocket client disconnected: ${socket.id}`);
                this.connectedClients.delete(socket.id);
            });
        });
    }
    emitSearchProgress(searchId, progress) {
        this.emitToSearchRoom(searchId, 'search:progress', {
            searchId,
            ...progress
        });
    }
    emitSearchCompleted(searchId, results, totalResults) {
        this.emitToSearchRoom(searchId, 'search:completed', {
            searchId,
            results,
            totalResults
        });
    }
    emitSearchFailed(searchId, error) {
        this.emitToSearchRoom(searchId, 'search:failed', {
            searchId,
            error
        });
    }
    emitSearchFiltered(searchId, filters, originalCount, filteredCount, results) {
        this.emitToSearchRoom(searchId, 'search:filtered', {
            searchId,
            filters,
            originalCount,
            filteredCount,
            results
        });
    }
    emitSearchSorted(searchId, sortBy, sortOrder, results) {
        this.emitToSearchRoom(searchId, 'search:sorted', {
            searchId,
            sortBy,
            sortOrder,
            results
        });
    }
    emitToSearchRoom(searchId, event, data) {
        this.io.to(`search:${searchId}`).emit(event, data);
        logger_1.logger.debug(`Emitted ${event} to search room: ${searchId}`);
    }
    emitToAll(event, data) {
        this.io.emit(event, data);
        logger_1.logger.debug(`Emitted ${event} to all clients`);
    }
    getConnectedClientsCount() {
        return this.connectedClients.size;
    }
    getSearchRoomParticipants(searchId) {
        const room = this.io.sockets.adapter.rooms.get(`search:${searchId}`);
        return room ? room.size : 0;
    }
    broadcastSystemMessage(message, type = 'info') {
        this.emitToAll('system:message', {
            message,
            type,
            timestamp: new Date()
        });
    }
    healthCheck() {
        try {
            const activeRooms = this.io.sockets.adapter.rooms.size;
            return {
                status: 'healthy',
                connectedClients: this.connectedClients.size,
                activeRooms
            };
        }
        catch (error) {
            logger_1.logger.error('WebSocket health check failed:', error);
            return {
                status: 'unhealthy',
                connectedClients: 0,
                activeRooms: 0
            };
        }
    }
}
exports.SearchWebSocketService = SearchWebSocketService;
//# sourceMappingURL=SearchWebSocketService.js.map