import { createServer } from 'http';
import { createApp } from './app';
import { config } from '../config';
import { initializeDatabase, closeDatabase, database, redisClient } from '../config/database';
import { ChatService } from '../services/ChatService';
import { FlightSearchOrchestrator } from '../services/FlightSearchOrchestrator';
import { SearchWebSocketService } from '../services/SearchWebSocketService';
import { AirlineAdapterFactory } from '../factories/AirlineAdapterFactory';
import { logger } from './logger';

// Initialize server
const startServer = async (): Promise<void> => {
  try {
    // Initialize database connections
    await initializeDatabase();

    // Create app with database (without socket.io initially)
    const app = createApp(database);
    
    // Create HTTP server
    const server = createServer(app);

    // Initialize Chat Service with Socket.io
    const chatService = new ChatService(server, database);
    
    // Update app routes to include socket.io
    const appWithSocket = createApp(database, chatService.getIO());
    server.removeAllListeners('request');
    server.on('request', appWithSocket);
    
    // Initialize Flight Search Orchestrator
    const adapterFactory = new AirlineAdapterFactory({ redisClient });
    const searchOrchestrator = new FlightSearchOrchestrator(
      database,
      redisClient,
      adapterFactory,
      chatService.getIO(),
      {
        maxConcurrentSearches: 10,
        searchTimeout: 30000,
        enableRealTimeUpdates: true,
        cacheResults: true,
        cacheTtl: 300
      }
    );
    
    // Initialize Search WebSocket Service
    const searchWebSocketService = new SearchWebSocketService(
      chatService.getIO(),
      searchOrchestrator
    );

    // Start HTTP server
    server.listen(config.server.port, config.server.host, () => {
      logger.info(`🚀 Flight Search SaaS server running on http://${config.server.host}:${config.server.port}`);
      logger.info(`📊 Environment: ${config.server.nodeEnv}`);
      logger.info(`🔗 API Base URL: http://${config.server.host}:${config.server.port}${config.api.prefix}`);
      logger.info(`💬 WebSocket server ready at ws://${config.server.host}:${config.server.port}/socket.io`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('📴 HTTP server closed');
        
        try {
          await closeDatabase();
          logger.info('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();