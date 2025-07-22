import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { errorHandler, asyncHandler } from '../middleware/errorHandler';
import { 
  ValidationError, 
  NotFoundError, 
  AuthenticationError,
  ExternalServiceError,
  DatabaseError
} from '../utils/errors';
import { config } from '../config';

// Mock config for testing
jest.mock('../config', () => ({
  config: {
    server: {
      nodeEnv: 'test'
    },
    monitoring: {
      sentryDsn: null
    }
  }
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  },
  loggers: {
    error: jest.fn(),
    request: jest.fn()
  }
}));

// Mock error tracker
jest.mock('../utils/errorTracking', () => ({
  errorTracker: {
    captureException: jest.fn(),
    captureErrorWithRecovery: jest.fn()
  }
}));

describe('Error Handling', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    
    // Add request ID middleware
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as any).id = 'test-request-id';
      next();
    });
    
    // Add routes for testing different error scenarios
    app.get('/api/validation-error', (_req, _res, next) => {
      next(new ValidationError('Invalid input data', { field: 'email' }));
    });
    
    app.get('/api/not-found-error', (_req, _res, next) => {
      next(new NotFoundError('User', { userId: '123' }));
    });
    
    app.get('/api/auth-error', (_req, _res, next) => {
      next(new AuthenticationError());
    });
    
    app.get('/api/external-service-error', (_req, _res, next) => {
      next(new ExternalServiceError('payment-gateway', 'Service unavailable'));
    });
    
    app.get('/api/database-error', (_req, _res, next) => {
      next(new DatabaseError('Database connection failed'));
    });
    
    app.get('/api/unexpected-error', (_req, _res, next) => {
      next(new Error('Something went wrong'));
    });
    
    app.get('/api/async-error', asyncHandler(async () => {
      throw new ValidationError('Async validation failed');
    }));
    
    // Add error handler middleware
    app.use(errorHandler);
  });

  test('should handle ValidationError with 400 status code', async () => {
    const response = await request(app).get('/api/validation-error');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('ValidationError');
    expect(response.body.error.message).toBe('Invalid input data');
    expect(response.body.error.requestId).toBe('test-request-id');
    expect(response.body.error.recoverySteps).toBeDefined();
    expect(response.body.error.retryable).toBe(true);
  });

  test('should handle NotFoundError with 404 status code', async () => {
    const response = await request(app).get('/api/not-found-error');
    
    expect(response.status).toBe(404);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('NotFoundError');
    expect(response.body.error.message).toContain('not found');
    expect(response.body.error.recoverySteps).toBeDefined();
    expect(response.body.error.retryable).toBe(false);
  });

  test('should handle AuthenticationError with 401 status code', async () => {
    const response = await request(app).get('/api/auth-error');
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('AuthenticationError');
    expect(response.body.error.recoverySteps).toBeDefined();
    expect(response.body.error.retryable).toBe(true);
  });

  test('should handle ExternalServiceError with 502 status code', async () => {
    const response = await request(app).get('/api/external-service-error');
    
    expect(response.status).toBe(502);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('ExternalServiceError');
    expect(response.body.error.recoverySteps).toBeDefined();
    expect(response.body.error.retryable).toBe(true);
  });

  test('should handle DatabaseError with 500 status code', async () => {
    const response = await request(app).get('/api/database-error');
    
    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('DatabaseError');
    expect(response.body.error.recoverySteps).toBeDefined();
    expect(response.body.error.retryable).toBe(true);
  });

  test('should handle unexpected errors with 500 status code', async () => {
    const response = await request(app).get('/api/unexpected-error');
    
    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('InternalServerError');
    expect(response.body.error.recoverySteps).toBeDefined();
    expect(response.body.error.supportReference).toBeDefined();
  });

  test('should handle async errors with asyncHandler', async () => {
    const response = await request(app).get('/api/async-error');
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('ValidationError');
    expect(response.body.error.message).toBe('Async validation failed');
  });
});