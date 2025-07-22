import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';
import { loggers } from '../utils/logger';
import { sanitizeInput } from '../utils/security';

/**
 * Enhanced validation options
 */
interface EnhancedValidationOptions {
  sanitize?: boolean;
  abortEarly?: boolean;
  stripUnknown?: boolean;
  logValidationErrors?: boolean;
}

/**
 * Enhanced validation middleware with sanitization and detailed error reporting
 */
export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}, options: EnhancedValidationOptions = {}) => {
  const {
    sanitize = true,
    abortEarly = false,
    stripUnknown = true,
    logValidationErrors = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const validationErrors: Record<string, any> = {};
    let hasErrors = false;

    // Helper function to validate and sanitize a part of the request
    const validatePart = (part: keyof Request, schema?: Joi.ObjectSchema) => {
      if (!schema) return;

      // Apply sanitization if enabled
      if (sanitize && req[part]) {
        req[part] = sanitizeInput(req[part]);
      }

      const { error, value } = schema.validate(req[part], {
        abortEarly,
        stripUnknown,
        convert: true,
      });

      if (error) {
        hasErrors = true;
        validationErrors[part] = error.details.map(detail => ({
          message: detail.message,
          path: detail.path,
          type: detail.type,
        }));
      } else {
        // Replace the request part with the validated (and potentially sanitized) value
        req[part] = value;
      }
    };

    // Validate each part of the request
    validatePart('body', schema.body);
    validatePart('query', schema.query);
    validatePart('params', schema.params);
    validatePart('headers', schema.headers);

    if (hasErrors) {
      if (logValidationErrors) {
        loggers.security('Validation failed', {
          errors: validationErrors,
          path: req.path,
          method: req.method,
          ip: req.ip,
          userId: (req as any).user?.id,
        });
      }

      const validationError = new ValidationError('Validation failed', {
        validationErrors,
        path: req.path,
        method: req.method,
      });

      return next(validationError);
    }

    next();
  };
};

/**
 * Create common validation schemas for reuse across endpoints
 */
export const commonValidationSchemas = {
  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().pattern(/^[a-zA-Z0-9_]+:(asc|desc)$/),
  }),

  // ID parameter schema
  idParam: Joi.object({
    id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  }),

  // UUID parameter schema
  uuidParam: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  // Date range schema
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
  }),

  // Email schema
  email: Joi.string().email().required(),

  // Password schema with security requirements
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),

  // Phone number schema
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format',
    }),

  // API key schema
  apiKey: Joi.string().pattern(/^[A-Za-z0-9_-]{20,}$/),

  // Search query schema
  searchQuery: Joi.object({
    q: Joi.string().min(1).max(100).required(),
    fields: Joi.array().items(Joi.string()),
  }),
};

/**
 * Middleware to validate content type
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      return res.status(415).json({
        error: {
          message: `Unsupported Content-Type. Allowed types: ${allowedTypes.join(', ')}`,
          code: 'UNSUPPORTED_CONTENT_TYPE',
        }
      });
    }
    
    next();
  };
};

/**
 * Middleware to validate request size
 */
export const validateRequestSize = (maxSizeBytes: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        error: {
          message: `Request entity too large. Maximum size: ${maxSizeBytes} bytes`,
          code: 'REQUEST_ENTITY_TOO_LARGE',
        }
      });
    }
    
    next();
  };
};