"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorFactory = exports.getErrorContext = exports.isOperationalError = exports.InsufficientPointsError = exports.PointsError = exports.PaymentError = exports.BookingError = exports.NoFlightsFoundError = exports.FlightSearchError = exports.BusinessLogicError = exports.DatabaseError = exports.TimeoutError = exports.ServiceUnavailableError = exports.ExternalServiceError = exports.InternalServerError = exports.RateLimitError = exports.UnprocessableEntityError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.BadRequestError = exports.ValidationError = exports.BaseError = void 0;
class BaseError extends Error {
    constructor(message, statusCode, isOperational = true, context) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.context = context;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.BaseError = BaseError;
class ValidationError extends BaseError {
    constructor(message, context) {
        super(message, 400, true, context);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class BadRequestError extends BaseError {
    constructor(message, context) {
        super(message, 400, true, context);
        this.name = 'BadRequestError';
    }
}
exports.BadRequestError = BadRequestError;
class AuthenticationError extends BaseError {
    constructor(message = 'Authentication required', context) {
        super(message, 401, true, context);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends BaseError {
    constructor(message = 'Insufficient permissions', context) {
        super(message, 403, true, context);
        this.name = 'AuthorizationError';
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends BaseError {
    constructor(resource, context) {
        super(`${resource} not found`, 404, true, context);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends BaseError {
    constructor(message, context) {
        super(message, 409, true, context);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class UnprocessableEntityError extends BaseError {
    constructor(message, context) {
        super(message, 422, true, context);
        this.name = 'UnprocessableEntityError';
    }
}
exports.UnprocessableEntityError = UnprocessableEntityError;
class RateLimitError extends BaseError {
    constructor(message = 'Too many requests', context) {
        super(message, 429, true, context);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
class InternalServerError extends BaseError {
    constructor(message = 'Internal server error', context) {
        super(message, 500, false, context);
        this.name = 'InternalServerError';
    }
}
exports.InternalServerError = InternalServerError;
class ExternalServiceError extends BaseError {
    constructor(service, message, context) {
        super(message || `External service ${service} is unavailable`, 502, true, context);
        this.name = 'ExternalServiceError';
    }
}
exports.ExternalServiceError = ExternalServiceError;
class ServiceUnavailableError extends BaseError {
    constructor(message = 'Service temporarily unavailable', context) {
        super(message, 503, true, context);
        this.name = 'ServiceUnavailableError';
    }
}
exports.ServiceUnavailableError = ServiceUnavailableError;
class TimeoutError extends BaseError {
    constructor(operation, context) {
        super(`Operation ${operation} timed out`, 504, true, context);
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
class DatabaseError extends BaseError {
    constructor(message, context) {
        super(message, 500, false, context);
        this.name = 'DatabaseError';
    }
}
exports.DatabaseError = DatabaseError;
class BusinessLogicError extends BaseError {
    constructor(message, statusCode = 400, context) {
        super(message, statusCode, true, context);
        this.name = 'BusinessLogicError';
    }
}
exports.BusinessLogicError = BusinessLogicError;
class FlightSearchError extends BaseError {
    constructor(message, context) {
        super(message, 400, true, context);
        this.name = 'FlightSearchError';
    }
}
exports.FlightSearchError = FlightSearchError;
class NoFlightsFoundError extends BaseError {
    constructor(searchCriteria) {
        super('No flights found for the given criteria', 404, true, { searchCriteria });
        this.name = 'NoFlightsFoundError';
    }
}
exports.NoFlightsFoundError = NoFlightsFoundError;
class BookingError extends BaseError {
    constructor(message, context) {
        super(message, 400, true, context);
        this.name = 'BookingError';
    }
}
exports.BookingError = BookingError;
class PaymentError extends BaseError {
    constructor(message, context) {
        super(message, 402, true, context);
        this.name = 'PaymentError';
    }
}
exports.PaymentError = PaymentError;
class PointsError extends BaseError {
    constructor(message, context) {
        super(message, 400, true, context);
        this.name = 'PointsError';
    }
}
exports.PointsError = PointsError;
class InsufficientPointsError extends BaseError {
    constructor(required, available, program) {
        super(`Insufficient points: ${available} available, ${required} required`, 400, true, {
            required,
            available,
            program,
        });
        this.name = 'InsufficientPointsError';
    }
}
exports.InsufficientPointsError = InsufficientPointsError;
const isOperationalError = (error) => {
    if (error instanceof BaseError) {
        return error.isOperational;
    }
    return false;
};
exports.isOperationalError = isOperationalError;
const getErrorContext = (error) => {
    if (error instanceof BaseError) {
        return error.context;
    }
    return undefined;
};
exports.getErrorContext = getErrorContext;
class ErrorFactory {
    static fromDatabaseError(error) {
        let message = 'Database operation failed';
        const context = { originalError: error.message };
        if (error.code) {
            switch (error.code) {
                case '23505':
                    message = 'Resource already exists';
                    break;
                case '23503':
                    message = 'Referenced resource does not exist';
                    break;
                case '23502':
                    message = 'Required field is missing';
                    break;
                case '42P01':
                    message = 'Database table not found';
                    break;
                default:
                    context.code = error.code;
            }
        }
        return new DatabaseError(message, context);
    }
    static fromValidationError(error) {
        if (error.details && Array.isArray(error.details)) {
            const messages = error.details.map((detail) => detail.message);
            return new ValidationError(`Validation failed: ${messages.join(', ')}`, {
                validationErrors: error.details,
            });
        }
        return new ValidationError(error.message || 'Validation failed');
    }
    static fromExternalApiError(service, error) {
        const context = {
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
exports.ErrorFactory = ErrorFactory;
//# sourceMappingURL=errors.js.map