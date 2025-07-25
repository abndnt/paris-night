"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = require("./app");
const config_1 = require("../config");
const database_1 = require("../config/database");
const ChatService_1 = require("../services/ChatService");
const FlightSearchOrchestrator_1 = require("../services/FlightSearchOrchestrator");
const SearchWebSocketService_1 = require("../services/SearchWebSocketService");
const AirlineAdapterFactory_1 = require("../factories/AirlineAdapterFactory");
const logger_1 = require("./logger");
const startServer = async () => {
    try {
        await (0, database_1.initializeDatabase)();
        const app = (0, app_1.createApp)(database_1.database);
        const server = (0, http_1.createServer)(app);
        const chatService = new ChatService_1.ChatService(server, database_1.database);
        const appWithSocket = (0, app_1.createApp)(database_1.database, chatService.getIO());
        server.removeAllListeners('request');
        server.on('request', appWithSocket);
        const adapterFactory = new AirlineAdapterFactory_1.AirlineAdapterFactory({ redisClient: database_1.redisClient });
        const searchOrchestrator = new FlightSearchOrchestrator_1.FlightSearchOrchestrator(database_1.database, database_1.redisClient, adapterFactory, chatService.getIO(), {
            maxConcurrentSearches: 10,
            searchTimeout: 30000,
            enableRealTimeUpdates: true,
            cacheResults: true,
            cacheTtl: 300
        });
        const searchWebSocketService = new SearchWebSocketService_1.SearchWebSocketService(chatService.getIO(), searchOrchestrator);
        server.listen(config_1.config.server.port, config_1.config.server.host, () => {
            logger_1.logger.info(`🚀 Flight Search SaaS server running on http://${config_1.config.server.host}:${config_1.config.server.port}`);
            logger_1.logger.info(`📊 Environment: ${config_1.config.server.nodeEnv}`);
            logger_1.logger.info(`🔗 API Base URL: http://${config_1.config.server.host}:${config_1.config.server.port}${config_1.config.api.prefix}`);
            logger_1.logger.info(`💬 WebSocket server ready at ws://${config_1.config.server.host}:${config_1.config.server.port}/socket.io`);
        });
        const gracefulShutdown = async (signal) => {
            logger_1.logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);
            server.close(async () => {
                logger_1.logger.info('📴 HTTP server closed');
                try {
                    await (0, database_1.closeDatabase)();
                    logger_1.logger.info('✅ Graceful shutdown completed');
                    process.exit(0);
                }
                catch (error) {
                    logger_1.logger.error('❌ Error during shutdown:', error);
                    process.exit(1);
                }
            });
            setTimeout(() => {
                logger_1.logger.error('⚠️  Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('uncaughtException', (error) => {
            logger_1.logger.error('💥 Uncaught Exception:', error);
            process.exit(1);
        });
        process.on('unhandledRejection', (reason, promise) => {
            logger_1.logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
    }
    catch (error) {
        logger_1.logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=server.js.map