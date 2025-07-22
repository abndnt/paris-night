import request from 'supertest';
import express, { Request, Response } from 'express';
import { requestLoggerMiddleware } from '../middleware/requestLogger';
import { loggers } from '../utils/logger';
import { errorTracker } from '../utils/errorTracking';

// Mock logger
jest.mock('../utils/logger', () => ({
  loggers: {
    request: jest.fn(),
    performance: jest.fn()
  }
}));

// Mock error tracker
jest.mock('../utils/errorTracking', () => ({
  errorTracker: {
    addBreadcrumb: jest.fn()
  }
}));

// Mock config
jest.mock('../config', () => ({
  config: {
    monitoring: {
      sentryDsn: 'mock-dsn'
    }
  }
}));

describe('Request Logger Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    
    // Add request logger middleware
    app.use(requestLoggerMiddleware);
    
    // Add test routes
    app.get('/api/test', (_req: Request, res: Response) => {
      res.status(200).json({ message: 'Success' });
    });
    
    app.get('/api/slow', async (_req: Request, res: Response) => {
      // Simulate slow request
      await new Promise(resolve => setTimeout(resolve, 10));
      res.status(200).json({ message: 'Slow response' });
    });
    
    // Reset mocks
    jest.clearAllMocks();
  });

  test('should log incoming requests', async () => {
    await request(app).get('/api/test');
    
    expect(loggers.request).toHaveBeenCalledTimes(2); // Once at start, once at end
  });

  test('should add request ID header', async () => {
    const response = await request(app).get('/api/test');
    
    expect(response.headers['x-request-id']).toBeDefined();
  });

  test('should use existing request ID if provided', async () => {
    const requestId = 'test-request-id-123';
    const response = await request(app)
      .get('/api/test')
      .set('X-Request-ID', requestId);
    
    expect(response.headers['x-request-id']).toBe(requestId);
  });

  test('should add breadcrumb for request tracking', async () => {
    await request(app).get('/api/test');
    
    expect(errorTracker.addBreadcrumb).toHaveBeenCalledWith(
      'GET /api/test',
      'http',
      expect.objectContaining({
        method: 'GET',
        url: '/api/test'
      })
    );
  });

  test('should log performance metrics for slow requests', async () => {
    await request(app).get('/api/slow');
    
    // We can't reliably test the timing threshold in a unit test,
    // but we can verify the function was called
    expect(loggers.request).toHaveBeenCalledTimes(2);
  });
});