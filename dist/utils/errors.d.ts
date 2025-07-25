export declare abstract class BaseError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly context?: Record<string, any>;
    constructor(message: string, statusCode: number, isOperational?: boolean, context?: Record<string, any>);
}
export declare class ValidationError extends BaseError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class BadRequestError extends BaseError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class AuthenticationError extends BaseError {
    constructor(message?: string, context?: Record<string, any>);
}
export declare class AuthorizationError extends BaseError {
    constructor(message?: string, context?: Record<string, any>);
}
export declare class NotFoundError extends BaseError {
    constructor(resource: string, context?: Record<string, any>);
}
export declare class ConflictError extends BaseError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class UnprocessableEntityError extends BaseError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class RateLimitError extends BaseError {
    constructor(message?: string, context?: Record<string, any>);
}
export declare class InternalServerError extends BaseError {
    constructor(message?: string, context?: Record<string, any>);
}
export declare class ExternalServiceError extends BaseError {
    constructor(service: string, message?: string, context?: Record<string, any>);
}
export declare class ServiceUnavailableError extends BaseError {
    constructor(message?: string, context?: Record<string, any>);
}
export declare class TimeoutError extends BaseError {
    constructor(operation: string, context?: Record<string, any>);
}
export declare class DatabaseError extends BaseError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class BusinessLogicError extends BaseError {
    constructor(message: string, statusCode?: number, context?: Record<string, any>);
}
export declare class FlightSearchError extends BaseError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class NoFlightsFoundError extends BaseError {
    constructor(searchCriteria: Record<string, any>);
}
export declare class BookingError extends BaseError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class PaymentError extends BaseError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class PointsError extends BaseError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class InsufficientPointsError extends BaseError {
    constructor(required: number, available: number, program: string);
}
export declare const isOperationalError: (error: Error) => boolean;
export declare const getErrorContext: (error: Error) => Record<string, any> | undefined;
export declare class ErrorFactory {
    static fromDatabaseError(error: any): DatabaseError;
    static fromValidationError(error: any): ValidationError;
    static fromExternalApiError(service: string, error: any): ExternalServiceError;
}
//# sourceMappingURL=errors.d.ts.map