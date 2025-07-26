import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.server.nodeEnv
  });
});

// Basic API info
app.get('/api', (_req, res) => {
  res.json({
    name: 'Flight Search SaaS API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      docs: '/api/docs'
    }
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

const PORT = process.env.DEV_PORT || 3001;
const HOST = config.server.host || 'localhost';

app.listen(PORT, HOST, () => {
  logger.info(`🚀 Development server running on http://${HOST}:${PORT}`);
  logger.info('📋 Available endpoints:');
  logger.info(`   Health: http://${HOST}:${PORT}/api/health`);
  logger.info(`   API Info: http://${HOST}:${PORT}/api`);
});

export default app;