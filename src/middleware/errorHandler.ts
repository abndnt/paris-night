import { Request, Response, NextFunction } from 'express';
import { BaseError } from '../utils/errors';
import { loggers } from '../utils/logger';
import { errorTracker } from '../utils/errorTracking';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

// Error response interface
interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: any;
    requestId?: string;
    timestamp: string;
    recoverySteps?: string[];
    retryable?: boolean;
    supportReference?: string;
  };
}

// User-friendly error messages with recovery steps
interface ErrorMessageConfig {
  message: string;
  recoverySteps?: string[];
  retryable?: boolean;
}

const getUserFriendlyError = (error: BaseError): ErrorMessageConfig => {
  const friendlyErrors: Record<string, ErrorMessageConfig> = {
    ValidationError: {
      message: 'The information provided is invalid. Please check your input and try again.',
      recoverySteps: [
        'Review all required fields and ensure they are filled correctly',
        'Check for any formatting errors in dates, emails, or numbers',
        'Try again with corrected information'
      ],
      retryable: true
    },
    AuthenticationError: {
      message: 'Please log in to access this resource.',
      recoverySteps: [
        'Log in with your credentials',
        'If you forgot your password, use the password reset option',
        'Contact support if you continue to have issues accessing your account'
      ],
      retryable: true
    },
    AuthorizationError: {
      message: 'You do not have permission to perform this action.',
      recoverySteps: [
        'Check if you are logged in with the correct account',
        'Contact your administrator if you believe you should have access'
      ],
      retryable: false
    },
    NotFoundError: {
      message: 'The requested resource could not be found.',
      recoverySteps: [
        'Check that the URL or ID is correct',
        'The item may have been removed or is no longer available',
        'Return to the previous page and try again'
      ],
      retryable: false
    },
    ConflictError: {
      message: 'This action conflicts with existing data. Please try again.',
      recoverySteps: [
        'The item may have been modified by another user',
        'Refresh the page to get the latest data',
        'Try again with updated information'
      ],
      retryable: true
    },
    RateLimitError: {
      message: 'Too many requests. Please wait a moment before trying again.',
      recoverySteps: [
        'Wait for a few minutes before trying again',
        'Reduce the frequency of your requests'
      ],
      retryable: true
    },
    ExternalServiceError: {
      message: 'An external service is temporarily unavailable. Please try again later.',
      recoverySteps: [
        'Wait a few moments and try your request again',
        'If the problem persists, try again later'
      ],
      retryable: true
    },
    ServiceUnavailableError: {
      message: 'The service is temporarily unavailable. Please try again later.',
      recoverySteps: [
        'Wait a few moments and try your request again',
        'If the problem persists, try again later'
      ],
      retryable: true
    },
    TimeoutError: {
      message: 'The request timed out. Please try again.',
      recoverySteps: [
        'Check your internet connection',
        'Try again with a simpler request',
        'If the problem persists, try again later'
      ],
      retryable: true
    },
    FlightSearchError: {
      message: 'There was an issue with your flight search. Please try again.',
      recoverySteps: [
        'Check your search criteria for any errors',
        'Try searching with more flexible dates',
        'Try a different origin or destination airport'
      ],
      retryable: true
    },
    NoFlightsFoundError: {
      message: 'No flights were found matching your criteria. Please try different dates or destinations.',
      recoverySteps: [
        'Try searching with more flexible dates',
        'Consider nearby airports for your origin or destination',
        'Break your journey into separate segments'
      ],
      retryable: true
    },
    BookingError: {
      message: 'There was an issue with your booking. Please try again.',
      recoverySteps: [
        'Check that the flight is still available',
        'Verify your passenger information is correct',
        'Try booking again or select a different flight'
      ],
      retryable: true
    },
    PaymentError: {
      message: 'Payment processing failed. Please check your payment information and try again.',
      recoverySteps: [
        'Verify your payment details are correct',
        'Check with your bank if the transaction was declined',
        'Try a different payment method'
      ],
      retryable: true
    },
    PointsError: {
      message: 'There was an issue with your points. Please check your account and try again.',
      recoverySteps: [
        'Verify your reward account is connected correctly',
        'Check your points balance in the rewards section',
        'Try refreshing your points balance'
      ],
      retryable: true
    },
    InsufficientPointsError: {
      message: 'You do not have enough points for this redemption.',
      recoverySteps: [
        'Check your current points balance',
        'Consider a cash and points combination',
        'Look for flights with lower point requirements'
      ],
      retryable: false
    },
    DatabaseError: {
      message: 'We encountered a database issue. Please try again later.',
      recoverySteps: [
        'Wait a few moments and try your request again',
        'If the problem persists, contact support'
      ],
      retryable: true
    },
    InternalServerError: {
      message: 'An unexpected error occurred. Our team has been notified.',
      recoverySteps: [
        'Try refreshing the page',
        'Try again later',
        'If the problem persists, contact support'
      ],
      retryable: true
    }
  };

  return friendlyErrors[error.name] || {
    message: 'An unexpected error occurred. Please try again.',
    recoverySteps: [
      'Try refreshing the page',
      'Try again later',
      'If the problem persists, contact support'
    ],
    retryable: true
  };
};

// Create error response
const createErrorResponse = (error: BaseError, requestId?: string): ErrorResponse => {
  const isProduction = config.server.nodeEnv === 'production';
  const friendlyError = getUserFriendlyError(error);
  
  return {
    error: {
      message: isProduction ? friendlyError.message : error.message,
      code: error.name,
      details: isProduction ? undefined : error.context,
      requestId: requestId || uuidv4(),
      timestamp: new Date().toISOString(),
      recoverySteps: friendlyError.recoverySteps,
      retryable: friendlyError.retryable,
      supportReference: `ERR-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000).toString(36).toUpperCase()}`
    },
  };
};

// Request ID middleware
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  (req as any).id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Main error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = (req as any).id || uuidv4();
  const startTime = (req as any).startTime || Date.now();
  const duration = Date.now() - startTime;

  // Add request context for better debugging
  const requestContext = {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: (req as any).user?.id,
    duration: `${duration}ms`,
    query: req.query,
    body: config.server.nodeEnv === 'production' ? '[redacted]' : req.body,
  };

  // Handle operational errors
  if (error instanceof BaseError) {
    // Log the error with context
    loggers.error(`${error.name}: ${error.message}`, error, {
      ...requestContext,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      errorContext: error.context
    });

    // Track error in monitoring system
    if (!error.isOperational) {
      // Non-operational errors are bugs that should be fixed
      errorTracker.captureException(error, requestContext, (req as any).user);
    } else {
      // For operational errors, we might want recovery steps
      const friendlyError = getUserFriendlyError(error);
      if (friendlyError.recoverySteps) {
        errorTracker.captureErrorWithRecovery(
          error, 
          friendlyError.recoverySteps, 
          requestContext, 
          (req as any).user
        );
      }
    }

    const errorResponse = createErrorResponse(error, requestId);
    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle unexpected errors (these are always bugs)
  loggers.error('Unexpected error', error, requestContext);

  // Track unexpected errors with high severity
  errorTracker.captureException(error, {
    ...requestContext,
    severity: 'critical',
    unhandled: true
  }, (req as any).user);

  // Return generic error response with recovery steps
  const genericErrorConfig = getUserFriendlyError({ name: 'InternalServerError' } as BaseError);
  const genericError = {
    error: {
      message: config.server.nodeEnv === 'production' 
        ? genericErrorConfig.message
        : error.message,
      code: 'InternalServerError',
      requestId,
      timestamp: new Date().toISOString(),
      recoverySteps: genericErrorConfig.recoverySteps,
      retryable: genericErrorConfig.retryable,
      supportReference: `ERR-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000).toString(36).toUpperCase()}`
    },
  };

  res.status(500).json(genericError);
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = req.id || 'unknown';
  
  loggers.request(req, res);
  
  res.status(404).json({
    error: {
      message: 'The requested endpoint was not found.',
      code: 'NotFound',
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error handler
export const validationErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error.name === 'ValidationError' || error.isJoi) {
    const validationError = new (require('../utils/errors').ValidationError)(
      error.message,
      { details: error.details }
    );
    return errorHandler(validationError, req, res, next);
  }
  next(error);
};

// Database error handler
export const databaseErrorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error.code && typeof error.code === 'string') {
    const dbError = require('../utils/errors').ErrorFactory.fromDatabaseError(error);
    return errorHandler(dbError, req, res, next);
  }
  next(error);
};

// Rate limit error handler
export const rateLimitHandler = (req: Request, res: Response): void => {
  const requestId = req.id || 'unknown';
  
  loggers.security('Rate limit exceeded', {
    requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.url,
  });

  res.status(429).json({
    error: {
      message: 'Too many requests. Please wait a moment before trying again.',
      code: 'RateLimitError',
      requestId,
      timestamp: new Date().toISOString(),
      retryAfter: '60 seconds',
    },
  });
};