import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
import { config } from '../config';
import { logger } from './logger';
import { errorHandler, notFoundHandler, requestIdMiddleware } from '../middleware/errorHandler';
import { defaultAdvancedRateLimit, ddosProtection } from '../middleware/advancedRateLimit';
import { createRouter } from '../routes';
import { requestLoggerMiddleware, apiPerformanceMiddleware, apiPerformanceFinishMiddleware } from '../middleware/requestLogger';
import { sentryRequestHandler, sentryErrorHandler, sentryRequestIdMiddleware } from '../utils/errorTracking';
import { initializeErrorTracking } from '../utils/errorTracking';
import { 
  securityHeadersMiddleware, 
  noClickjackingMiddleware, 
  noSniffMiddleware,
  xssProtectionMiddleware,
  httpsEnforcementMiddleware,
  referrerPolicyMiddleware,
  permissionsPolicyMiddleware,
  suspiciousRequestDetection
} from '../middleware/securityHeaders';

// Create Express application factory
export const createApp = (db: Pool, io?: SocketIOServer): express.Application => {
  const app = express();
  
  // Initialize error tracking
  initializeErrorTracking();

  // Request ID middleware (must be first to ensure all requests have an ID)
  app.use(requestIdMiddleware);
  
  // Sentry request handler (for error tracking)
  if (config.monitoring.sentryDsn) {
    app.use(sentryRequestHandler);
    // Sentry tracing is handled automatically by the new SDK
    app.use(sentryRequestIdMiddleware);
  }

  // DDoS protection (must come early in the middleware chain)
  app.use(ddosProtection);
  
  // Suspicious request detection
  app.use(suspiciousRequestDetection);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.stripe.com"],
        frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
        upgradeInsecureRequests: [],
      },
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
  
  // Additional security headers
  app.use(securityHeadersMiddleware);
  app.use(noClickjackingMiddleware);
  app.use(noSniffMiddleware);
  app.use(xssProtectionMiddleware);
  app.use(httpsEnforcementMiddleware);
  app.use(referrerPolicyMiddleware);
  app.use(permissionsPolicyMiddleware);

  // CORS configuration
  app.use(cors({
    ...config.cors,
    // Enhanced CORS security
    credentials: true,
    maxAge: 86400, // 24 hours
  }));

  // Request parsing middleware with validation
  app.use(express.json({ 
    limit: '1mb', // Reduced from 10mb for security
    verify: (req, _res, buf) => {
      // Store raw body for signature verification (e.g., for webhooks)
      (req as any).rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '1mb' // Reduced from 10mb for security
  }));

  // Compression middleware
  app.use(compression());

  // Request logging middleware
  app.use(requestLoggerMiddleware);
  
  // API performance tracking
  app.use(apiPerformanceMiddleware);

  // Logging middleware (for HTTP requests)
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      },
    },
    skip: (req) => {
      // Skip health check endpoints to reduce noise
      return req.url.includes('/health') || req.url.includes('/live') || req.url.includes('/ready');
    }
  }));

  // Enhanced rate limiting
  app.use(defaultAdvancedRateLimit);

  // Trust proxy for accurate IP addresses
  app.set('trust proxy', 1);
  
  // API performance finish middleware
  app.use(apiPerformanceFinishMiddleware);

  // API routes
  app.use(config.api.prefix, createRouter(db, io));

  // 404 handler
  app.use(notFoundHandler);
  
  // Sentry error handler (must come before express error handler)
  if (config.monitoring.sentryDsn) {
    app.use(sentryErrorHandler);
  }

  // Global error handler
  app.use(errorHandler);

  return app;
};

// Default app for backward compatibility
const app = createApp({} as Pool);
export default app;