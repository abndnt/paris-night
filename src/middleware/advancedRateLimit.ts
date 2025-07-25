import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/database';
import { config } from '../config';
// import { RateLimitError } from '../utils/errors'; // Unused import
import { loggers } from '../utils/logger';
import { errorTracker } from '../utils/errorTracking';

interface AdvancedRateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  headers?: boolean;
  handler?: (req: Request, res: Response) => void;
  skipFailedRequests?: boolean;
  requestWasSuccessful?: (req: Request, res: Response) => boolean;
  skip?: (req: Request, res: Response) => boolean;
  trustProxy?: boolean;
  blacklist?: string[];
  whitelist?: string[];
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  store?: any;
}

/**
 * Creates an advanced rate limiter middleware with additional security features
 */
export const createAdvancedRateLimit = (options: AdvancedRateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req: Request) => {
      // Use X-Forwarded-For if trustProxy is true, otherwise use req.ip
      const ip = options.trustProxy && req.headers['x-forwarded-for']
        ? (Array.isArray(req.headers['x-forwarded-for'])
            ? req.headers['x-forwarded-for'][0]
            : req.headers['x-forwarded-for']?.split(',')[0]?.trim())
        : req.ip;
      
      // Include user ID if authenticated for more precise rate limiting
      const userId = (req as any).user?.id || 'anonymous';
      
      // Include route path to have different limits for different endpoints
      const path = req.path || req.originalUrl || '/';
      
      return `rate_limit:${ip}:${userId}:${path}`;
    },
    skipSuccessfulRequests = false,
    headers = true,
    handler,
    skipFailedRequests = false,
    requestWasSuccessful = (_req: Request, res: Response) => res.statusCode < 400,
    skip,
    trustProxy = false,
    blacklist = [],
    whitelist = [],
    standardHeaders = true,
    legacyHeaders = false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip whitelisted IPs
      const ip = trustProxy && req.headers['x-forwarded-for']
        ? (Array.isArray(req.headers['x-forwarded-for'])
            ? req.headers['x-forwarded-for'][0]
            : req.headers['x-forwarded-for']?.split(',')[0]?.trim())
        : req.ip || 'unknown';
      
      if (ip && whitelist.includes(ip)) {
        return next();
      }
      
      // Block blacklisted IPs immediately
      if (ip && blacklist.includes(ip)) {
        loggers.security('Blocked blacklisted IP', { ip, url: req.originalUrl });
        res.status(403).json({
          error: {
            message: 'Access denied',
            code: 'BLACKLISTED',
          }
        });
        return;
      }
      
      // Skip if custom skip function returns true
      if (skip && skip(req, res)) {
        return next();
      }
      
      // Generate key for this request
      const key = keyGenerator(req);
      
      // Get current count from Redis
      const current = await redisClient.get(key);
      
      // Set headers if enabled
      if (headers) {
        if (standardHeaders) {
          res.setHeader('RateLimit-Limit', max);
          res.setHeader('RateLimit-Remaining', current === null ? max : Math.max(0, max - parseInt(current, 10)));
          res.setHeader('RateLimit-Reset', Math.ceil(Date.now() / 1000) + Math.ceil(windowMs / 1000));
        }
        
        if (legacyHeaders) {
          res.setHeader('X-RateLimit-Limit', max);
          res.setHeader('X-RateLimit-Remaining', current === null ? max : Math.max(0, max - parseInt(current, 10)));
          res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + Math.ceil(windowMs / 1000));
          res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
        }
      }
      
      if (current === null) {
        // First request in window
        await redisClient.setEx(key, Math.ceil(windowMs / 1000), '1');
        
        // Add response listener to handle skipSuccessfulRequests and skipFailedRequests
        if (skipSuccessfulRequests || skipFailedRequests) {
          res.on('finish', async () => {
            const successful = requestWasSuccessful(req, res);
            if ((skipSuccessfulRequests && successful) || (skipFailedRequests && !successful)) {
              try {
                await redisClient.decr(key);
              } catch (error) {
                // Ignore errors when decrementing
              }
            }
          });
        }
        
        return next();
      }

      const count = parseInt(current, 10);
      
      if (count >= max) {
        // Rate limit exceeded
        loggers.security('Rate limit exceeded', {
          ip,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          userId: (req as any).user?.id,
          requestId: (req as any).id,
          count,
          limit: max,
        });
        
        // Track rate limit events in error monitoring
        errorTracker.captureMessage(
          `Rate limit exceeded: ${req.method} ${req.path}`,
          'warning',
          {
            ip,
            path: req.path,
            method: req.method,
            count,
            limit: max,
          }
        );
        
        // Use custom handler if provided, otherwise use default
        if (handler) {
          return handler(req, res);
        }
        
        const retryAfter = Math.ceil(windowMs / 1000);
        
        if (standardHeaders) {
          res.setHeader('RateLimit-Limit', max);
          res.setHeader('RateLimit-Remaining', 0);
          res.setHeader('RateLimit-Reset', Math.ceil(Date.now() / 1000) + retryAfter);
        }
        
        if (legacyHeaders) {
          res.setHeader('Retry-After', retryAfter);
        }
        
        res.status(429).json({
          error: {
            message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: `${retryAfter} seconds`,
          }
        });
        return;
      }

      // Increment counter
      await redisClient.incr(key);
      
      // Add response listener to handle skipSuccessfulRequests and skipFailedRequests
      if (skipSuccessfulRequests || skipFailedRequests) {
        res.on('finish', async () => {
          const successful = requestWasSuccessful(req, res);
          if ((skipSuccessfulRequests && successful) || (skipFailedRequests && !successful)) {
            try {
              await redisClient.decr(key);
            } catch (error) {
              // Ignore errors when decrementing
            }
          }
        });
      }
      
      next();
    } catch (error) {
      // If Redis is down, allow the request to proceed but log the error
      loggers.error('Rate limiting failed', error as Error, {
        path: req.path,
        method: req.method,
      });
      next();
    }
  };
};

/**
 * Default rate limiter for general API endpoints
 */
export const defaultAdvancedRateLimit = createAdvancedRateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimit = createAdvancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts, please try again in 15 minutes.',
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
  standardHeaders: true,
  trustProxy: true,
});

/**
 * Very strict rate limiter for sensitive operations
 */
export const sensitiveOperationRateLimit = createAdvancedRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: 'Too many attempts for sensitive operation, please try again later.',
  standardHeaders: true,
  trustProxy: true,
});

/**
 * API rate limiter for public API endpoints
 */
export const apiRateLimit = createAdvancedRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'API rate limit exceeded, please slow down your requests.',
  standardHeaders: true,
  trustProxy: true,
  keyGenerator: (req: Request) => {
    // Use API key if available, otherwise use IP
    const apiKey = req.headers['x-api-key'] || req.query['apiKey'];
    const ip = req.ip || 'unknown';
    return `api_rate_limit:${apiKey || ip}`;
  },
});

/**
 * DDoS protection middleware
 * This is a more aggressive rate limiter that triggers when a potential DDoS is detected
 */
export const ddosProtection = createAdvancedRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute from same IP
  message: 'Too many requests detected. Access temporarily blocked.',
  standardHeaders: true,
  trustProxy: true,
  keyGenerator: (req: Request) => {
    // Only use IP for DDoS protection
    const ip = req.ip || 'unknown';
    return `ddos_protection:${ip}`;
  },
  handler: (req: Request, res: Response) => {
    // Log potential DDoS attempt
    loggers.security('Potential DDoS attempt detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      headers: req.headers,
    });
    
    // Track in error monitoring with high severity
    errorTracker.captureMessage(
      'Potential DDoS attempt blocked',
      'error',
      {
        ip: req.ip,
        path: req.path,
        method: req.method,
      }
    );
    
    // Return 429 with minimal response to reduce server load
    res.status(429).send('Too many requests');
  },
});