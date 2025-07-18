import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/database';
import { config } from '../config';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export const createRateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req: Request) => req.ip || 'unknown',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `rate_limit:${keyGenerator(req)}`;
      const current = await redisClient.get(key);
      
      if (current === null) {
        // First request in window
        await redisClient.setEx(key, Math.ceil(windowMs / 1000), '1');
        next();
        return;
      }

      const count = parseInt(current, 10);
      
      if (count >= max) {
        res.status(429).json({
          error: message,
          retryAfter: Math.ceil(windowMs / 1000),
        });
        return;
      }

      // Increment counter
      await redisClient.incr(key);
      next();
    } catch (error) {
      // If Redis is down, allow the request to proceed
      console.warn('Rate limiting failed, allowing request:', error);
      next();
    }
  };
};

// Default rate limiter
export const defaultRateLimit = createRateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
});

// Strict rate limiter for sensitive endpoints
export const strictRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: 'Too many attempts, please try again in 15 minutes.',
});