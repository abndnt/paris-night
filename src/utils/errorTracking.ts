import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from '../config';
import { logger } from './logger';
import { BaseError } from './errors';

// Initialize Sentry
export const initializeErrorTracking = (): void => {
  if (config.monitoring?.sentryDsn) {
    Sentry.init({
      dsn: config.monitoring.sentryDsn,
      environment: config.server.nodeEnv,
      release: process.env['npm_package_version'] || '1.0.0',
      tracesSampleRate: config.server.nodeEnv === 'production' ? 0.1 : 1.0,
      profilesSampleRate: config.server.nodeEnv === 'production' ? 0.05 : 0.5,
      integrations: [
        nodeProfilingIntegration(),
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
        Sentry.postgresIntegration(),
        Sentry.redisIntegration(),
      ],
      beforeSend(event, hint) {
        // Filter out sensitive information
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        
        // Add error context for custom errors
        const originalException = hint.originalException;
        if (originalException instanceof BaseError) {
          event.contexts = {
            ...event.contexts,
            errorContext: originalException.context || {},
            errorType: {
              name: originalException.name,
              isOperational: originalException.isOperational,
              statusCode: originalException.statusCode
            }
          };
        }
        
        return event;
      },
      beforeBreadcrumb(breadcrumb) {
        // Filter sensitive breadcrumbs
        if (breadcrumb.category === 'http' && breadcrumb.data?.['url']) {
          // Filter auth endpoints and any paths with tokens
          if (
            breadcrumb.data['url'].includes('/auth/') ||
            breadcrumb.data['url'].includes('token=') ||
            breadcrumb.data['url'].includes('apiKey=')
          ) {
            return null;
          }
        }
        return breadcrumb;
      },
    });

    logger.info('Error tracking initialized with Sentry');
  } else {
    logger.warn('Sentry DSN not configured, error tracking disabled');
  }
};

// Error tracking utilities
export const errorTracker = {
  // Capture exception with context
  captureException: (error: Error, context?: Record<string, any>, user?: any) => {
    if (config.monitoring?.sentryDsn) {
      Sentry.withScope((scope) => {
        if (context) {
          Object.keys(context).forEach(key => {
            scope.setContext(key, context[key]);
          });
        }
        if (user) {
          scope.setUser({
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
          });
        }
        
        // Add service version and environment
        scope.setTag('version', process.env['npm_package_version'] || '1.0.0');
        scope.setTag('environment', config.server.nodeEnv);
        
        // Add error fingerprinting for grouping similar errors
        if (error instanceof BaseError) {
          scope.setFingerprint([error.name, error.statusCode.toString()]);
        }
        
        Sentry.captureException(error);
      });
    }
    
    // Always log to winston as well
    logger.error('Exception captured', error, context);
  },

  // Capture message with level
  captureMessage: (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) => {
    if (config.monitoring?.sentryDsn) {
      Sentry.withScope((scope) => {
        if (context) {
          Object.keys(context).forEach(key => {
            scope.setContext(key, context[key]);
          });
        }
        Sentry.captureMessage(message, level);
      });
    }
    
    logger.log(level === 'warning' ? 'warn' : level, message, context);
  },

  // Add breadcrumb
  addBreadcrumb: (message: string, category: string, data?: Record<string, any>) => {
    if (config.monitoring?.sentryDsn) {
      Sentry.addBreadcrumb({
        message,
        category,
        data: data || {},
        timestamp: Date.now() / 1000,
      });
    }
  },

  // Set user context
  setUser: (user: { id: string; email?: string; username?: string; role?: string }) => {
    if (config.monitoring?.sentryDsn) {
      Sentry.setUser(user);
    }
  },

  // Clear user context
  clearUser: () => {
    if (config.monitoring?.sentryDsn) {
      Sentry.setUser(null);
    }
  },

  // Set tag
  setTag: (key: string, value: string) => {
    if (config.monitoring?.sentryDsn) {
      Sentry.setTag(key, value);
    }
  },

  // Set extra context
  setContext: (name: string, context: Record<string, any>) => {
    if (config.monitoring?.sentryDsn) {
      Sentry.setContext(name, context);
    }
  },

  // Performance monitoring
  startTransaction: (name: string, operation: string) => {
    if (config.monitoring?.sentryDsn) {
      return Sentry.startSpan({ name, op: operation }, () => {});
    }
    return null;
  },
  
  // Finish transaction
  finishTransaction: (transaction: any) => {
    if (transaction && typeof transaction.finish === 'function') {
      transaction.finish();
    }
  },
  
  // Create child span
  startSpan: (transaction: any, name: string, operation: string) => {
    if (transaction && typeof transaction.startChild === 'function') {
      return transaction.startChild({
        op: operation,
        description: name
      });
    }
    return null;
  },
  
  // Capture error with recovery info
  captureErrorWithRecovery: (error: Error, recoverySteps: string[], context?: Record<string, any>, user?: any) => {
    if (config.monitoring?.sentryDsn) {
      Sentry.withScope((scope) => {
        if (context) {
          Object.keys(context).forEach(key => {
            scope.setContext(key, context[key]);
          });
        }
        
        // Add recovery information
        scope.setContext('recovery', {
          recoverable: true,
          steps: recoverySteps,
          timestamp: new Date().toISOString()
        });
        
        if (user) {
          scope.setUser({
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
          });
        }
        
        Sentry.captureException(error);
      });
    }
    
    // Always log to winston as well
    logger.error('Exception captured with recovery steps', error, { 
      ...context,
      recoverySteps 
    });
  },
  
  // Health check for error tracking system
  healthCheck: async (): Promise<{ status: string; details?: Record<string, any> }> => {
    if (!config.monitoring?.sentryDsn) {
      return { status: 'disabled', details: { reason: 'No Sentry DSN configured' } };
    }
    
    try {
      // Test sending a transaction to Sentry
      Sentry.startSpan({ name: 'health-check', op: 'test' }, () => {
        // Test span completed
      });
      
      return { status: 'healthy' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        } 
      };
    }
  }
};

// Express error handler middleware
export const sentryErrorHandler = (error: any, _req: any, _res: any, next: any) => {
  // Check if we should handle this error
  const shouldHandle = error.status >= 500 || 
                      error.status === 429 || 
                      error.status === 413 || 
                      (error instanceof BaseError && !error.isOperational);
  
  if (shouldHandle && config.monitoring?.sentryDsn) {
    Sentry.captureException(error);
  }
  
  next(error);
};

// Express request handler middleware
export const sentryRequestHandler = (req: any, _res: any, next: any) => {
  // Set up Sentry scope for this request
  Sentry.withScope((scope) => {
    if (req.user) {
      scope.setUser({
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
        role: req.user.role,
      });
    }
    
    scope.setContext('request', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
    });
    
    next();
  });
};

// Middleware to add request ID to Sentry scope
export const sentryRequestIdMiddleware = (req: any, _res: any, next: Function) => {
  if (req.id) {
    Sentry.withScope(scope => {
      scope.setTag('requestId', req.id);
    });
  }
  next();
};