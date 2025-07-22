import { Request, Response, NextFunction } from 'express';
import { loggers } from '../utils/logger';
import { errorTracker } from '../utils/errorTracking';
import { config } from '../config';

/**
 * Middleware to log incoming requests
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Add start time to request object for duration calculation
  (req as any).startTime = Date.now();
  
  // Add request ID if not already present
  if (!(req as any).id) {
    (req as any).id = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    res.setHeader('X-Request-ID', (req as any).id);
  }
  
  // Log basic request info
  loggers.request(req, res);
  
  // Add breadcrumb for request in error tracking
  if (config.monitoring.sentryDsn) {
    errorTracker.addBreadcrumb(
      `${req.method} ${req.originalUrl || req.url}`,
      'http',
      {
        method: req.method,
        url: req.originalUrl || req.url,
        status_code: res.statusCode,
        request_id: (req as any).id
      }
    );
  }
  
  // Capture response finish to log completion
  const originalEnd = res.end;
  
  res.end = function(chunk?: any, encoding?: any, callback?: any): any {
    // Restore original end
    res.end = originalEnd;
    
    // Calculate request duration
    const duration = Date.now() - (req as any).startTime;
    
    // Log request completion
    loggers.request(req, res, duration);
    
    // Add performance metric for slow requests
    if (duration > 1000) { // Log requests taking more than 1 second
      loggers.performance(`Slow request: ${req.method} ${req.originalUrl || req.url}`, duration, {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        requestId: (req as any).id
      });
    }
    
    // Call original end
    return originalEnd.call(this, chunk, encoding, callback);
  };
  
  next();
};

/**
 * Middleware to track API performance
 */
export const apiPerformanceMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  // Skip for non-API routes
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }
  
  // Start transaction for API request
  const transaction = errorTracker.startTransaction(
    `${req.method} ${req.route?.path || req.path}`,
    'http.server'
  );
  
  // Store transaction in request for later use
  (req as any).transaction = transaction;
  
  next();
};

/**
 * Middleware to finish API performance tracking
 */
export const apiPerformanceFinishMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip for non-API routes
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }
  
  // Finish transaction on response finish
  const originalEnd = res.end;
  
  res.end = function(chunk?: any, encoding?: any, callback?: any): any {
    // Restore original end
    res.end = originalEnd;
    
    // Finish transaction if it exists
    const transaction = (req as any).transaction;
    if (transaction) {
      transaction.setHttpStatus(res.statusCode);
      errorTracker.finishTransaction(transaction);
    }
    
    // Call original end
    return originalEnd.call(this, chunk, encoding, callback);
  };
  
  next();
};