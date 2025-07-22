import request from 'supertest';
import express from 'express';
import { healthCheckService } from '../services/HealthCheckService';
import { asyncHandler } from '../middleware/errorHandler';

// Mock the health check service
jest.mock('../services/HealthCheckService', () => ({
  healthCheckService: {
    checkHealth: jest.fn(),
    readinessCheck: jest.fn(),
    quickCheck: jest.fn()
  }
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Health Check Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    
    // Set up health check routes
    app.get('/health', asyncHandler(async (req, res) => {
      const includeMetrics = req.query.metrics === 'true';
      const health = await healthCheckService.checkHealth(includeMetrics);
      const statusCode = health.status === 'healthy' ? 200 : 
                         health.status === 'degraded' ? 207 : 503;
      res.status(statusCode).json(health);
    }));
    
    app.get('/ready', asyncHandler(async (_req, res) => {
      const readiness = await healthCheckService.readinessCheck();
      const statusCode = readiness.ready ? 200 : 503;
      res.status(statusCode).json(readiness);
    }));
    
    app.get('/live', asyncHandler(async (_req, res) => {
      const liveness = await healthCheckService.quickCheck();
      res.status(200).json(liveness);
    }));
    
    // Reset mocks
    jest.clearAllMocks();
  });

  test('should return 200 for healthy status', async () => {
    // Mock healthy response
    (healthCheckService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'healthy',
      version: '1.0.0',
      environment: 'test',
      timestamp: new Date(),
      uptime: 100,
      services: {
        database: { status: 'healthy', lastChecked: new Date() },
        redis: { status: 'healthy', lastChecked: new Date() }
      }
    });
    
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.services).toBeDefined();
    expect(response.body.services.database.status).toBe('healthy');
    expect(response.body.services.redis.status).toBe('healthy');
  });

  test('should return 207 for degraded status', async () => {
    // Mock degraded response
    (healthCheckService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'degraded',
      version: '1.0.0',
      environment: 'test',
      timestamp: new Date(),
      uptime: 100,
      services: {
        database: { status: 'healthy', lastChecked: new Date() },
        redis: { status: 'degraded', lastChecked: new Date() }
      }
    });
    
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(207);
    expect(response.body.status).toBe('degraded');
    expect(response.body.services).toBeDefined();
    expect(response.body.services.database.status).toBe('healthy');
    expect(response.body.services.redis.status).toBe('degraded');
  });

  test('should return 503 for unhealthy status', async () => {
    // Mock unhealthy response
    (healthCheckService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'unhealthy',
      version: '1.0.0',
      environment: 'test',
      timestamp: new Date(),
      uptime: 100,
      services: {
        database: { status: 'unhealthy', lastChecked: new Date() },
        redis: { status: 'healthy', lastChecked: new Date() }
      }
    });
    
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
    expect(response.body.services).toBeDefined();
    expect(response.body.services.database.status).toBe('unhealthy');
    expect(response.body.services.redis.status).toBe('healthy');
  });

  test('should include metrics when requested', async () => {
    // Mock response with metrics
    (healthCheckService.checkHealth as jest.Mock).mockResolvedValue({
      status: 'healthy',
      version: '1.0.0',
      environment: 'test',
      timestamp: new Date(),
      uptime: 100,
      services: {
        database: { status: 'healthy', lastChecked: new Date() },
        redis: { status: 'healthy', lastChecked: new Date() }
      },
      systemMetrics: {
        cpuUsage: 0.5,
        memoryUsage: {
          total: 8000000000,
          free: 4000000000,
          used: 4000000000,
          percentUsed: 50
        },
        uptime: 3600,
        processMemory: {
          rss: 100000000,
          heapTotal: 50000000,
          heapUsed: 40000000,
          external: 10000000
        }
      }
    });
    
    const response = await request(app).get('/health?metrics=true');
    
    expect(response.status).toBe(200);
    expect(response.body.systemMetrics).toBeDefined();
    expect(response.body.systemMetrics.cpuUsage).toBeDefined();
    expect(response.body.systemMetrics.memoryUsage).toBeDefined();
  });

  test('should return 200 for ready status', async () => {
    // Mock ready response
    (healthCheckService.readinessCheck as jest.Mock).mockResolvedValue({
      status: 'ready',
      ready: true,
      timestamp: new Date()
    });
    
    const response = await request(app).get('/ready');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
    expect(response.body.ready).toBe(true);
  });

  test('should return 503 for not ready status', async () => {
    // Mock not ready response
    (healthCheckService.readinessCheck as jest.Mock).mockResolvedValue({
      status: 'not ready',
      ready: false,
      timestamp: new Date()
    });
    
    const response = await request(app).get('/ready');
    
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('not ready');
    expect(response.body.ready).toBe(false);
  });

  test('should return 200 for liveness check', async () => {
    // Mock liveness response
    (healthCheckService.quickCheck as jest.Mock).mockResolvedValue({
      status: 'alive',
      timestamp: new Date()
    });
    
    const response = await request(app).get('/live');
    
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('alive');
  });
});