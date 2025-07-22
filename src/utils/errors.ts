// Custom error classes for different types of errors
export abstract class BaseError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request errors
export class ValidationError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
    this.name = 'ValidationError';
  }
}

export class BadRequestError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
    this.name = 'BadRequestError';
  }
}

// 401 Unauthorized errors
export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, 401, true, context);
    this.name = 'AuthenticationError';
  }
}

// 403 Forbidden errors
export class AuthorizationError extends BaseError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, 403, true, context);
    this.name = 'AuthorizationError';
  }
}

// 404 Not Found errors
export class NotFoundError extends BaseError {
  constructor(resource: string, context?: Record<string, any>) {
    super(`${resource} not found`, 404, true, context);
    this.name = 'NotFoundError';
  }
}

// 409 Conflict errors
export class ConflictError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 409, true, context);
    this.name = 'ConflictError';
  }
}

// 422 Unprocessable Entity errors
export class UnprocessableEntityError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 422, true, context);
    this.name = 'UnprocessableEntityError';
  }
}

// 429 Too Many Requests errors
export class RateLimitError extends BaseError {
  constructor(message: string = 'Too many requests', context?: Record<string, any>) {
    super(message, 429, true, context);
    this.name = 'RateLimitError';
  }
}

// 500 Internal Server errors
export class InternalServerError extends BaseError {
  constructor(message: string = 'Internal server error', context?: Record<string, any>) {
    super(message, 500, false, context);
    this.name = 'InternalServerError';
  }
}

// 502 Bad Gateway errors (external service failures)
export class ExternalServiceError extends BaseError {
  constructor(service: string, message?: string, context?: Record<string, any>) {
    super(message || `External service ${service} is unavailable`, 502, true, context);
    this.name = 'ExternalServiceError';
  }
}

// 503 Service Unavailable errors
export class ServiceUnavailableError extends BaseError {
  constructor(message: string = 'Service temporarily unavailable', context?: Record<string, any>) {
    super(message, 503, true, context);
    this.name = 'ServiceUnavailableError';
  }
}

// 504 Gateway Timeout errors
export class TimeoutError extends BaseError {
  constructor(operation: string, context?: Record<string, any>) {
    super(`Operation ${operation} timed out`, 504, true, context);
    this.name = 'TimeoutError';
  }
}

// Database specific errors
export class DatabaseError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, false, context);
    this.name = 'DatabaseError';
  }
}

// Business logic errors
export class BusinessLogicError extends BaseError {
  constructor(message: string, statusCode: number = 400, context?: Record<string, any>) {
    super(message, statusCode, true, context);
    this.name = 'BusinessLogicError';
  }
}

// Flight search specific errors
export class FlightSearchError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
    this.name = 'FlightSearchError';
  }
}

export class NoFlightsFoundError extends BaseError {
  constructor(searchCriteria: Record<string, any>) {
    super('No flights found for the given criteria', 404, true, { searchCriteria });
    this.name = 'NoFlightsFoundError';
  }
}

// Booking specific errors
export class BookingError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
    this.name = 'BookingError';
  }
}

export class PaymentError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 402, true, context);
    this.name = 'PaymentError';
  }
}

// Points and rewards errors
export class PointsError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
    this.name = 'PointsError';
  }
}

export class InsufficientPointsError extends BaseError {
  constructor(required: number, available: number, program: string) {
    super(`Insufficient points: ${available} available, ${required} required`, 400, true, {
      required,
      available,
      program,
    });
    this.name = 'InsufficientPointsError';
  }
}

// Utility functions for error handling
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof BaseError) {
    return error.isOperational;
  }
  return false;
};

export const getErrorContext = (error: Error): Record<string, any> | undefined => {
  if (error instanceof BaseError) {
    return error.context;
  }
  return undefined;
};

// Error factory for creating errors from different sources
export class ErrorFactory {
  static fromDatabaseError(error: any): DatabaseError {
    let message = 'Database operation failed';
    const context: Record<string, any> = { originalError: error.message };

    // PostgreSQL specific error handling
    if (error.code) {
      switch (error.code) {
        case '23505': // unique_violation
          message = 'Resource already exists';
          break;
        case '23503': // foreign_key_violation
          message = 'Referenced resource does not exist';
          break;
        case '23502': // not_null_violation
          message = 'Required field is missing';
          break;
        case '42P01': // undefined_table
          message = 'Database table not found';
          break;
        default:
          context.code = error.code;
      }
    }

    return new DatabaseError(message, context);
  }

  static fromValidationError(error: any): ValidationError {
    if (error.details && Array.isArray(error.details)) {
      const messages = error.details.map((detail: any) => detail.message);
      return new ValidationError(`Validation failed: ${messages.join(', ')}`, {
        validationErrors: error.details,
      });
    }
    return new ValidationError(error.message || 'Validation failed');
  }

  static fromExternalApiError(service: string, error: any): ExternalServiceError {
    const context: Record<string, any> = {
      service,
      originalError: error.message,
    };

    if (error.response) {
      context.status = error.response.status;
      context.statusText = error.response.statusText;
    }

    return new ExternalServiceError(service, error.message, context);
  }
}