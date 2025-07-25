"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequestSize = exports.validateContentType = exports.commonValidationSchemas = exports.validateRequest = void 0;
const joi_1 = __importDefault(require("joi"));
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const security_1 = require("../utils/security");
const validateRequest = (schema, options = {}) => {
    const { sanitize = true, abortEarly = false, stripUnknown = true, logValidationErrors = true, } = options;
    return (req, _res, next) => {
        const validationErrors = {};
        let hasErrors = false;
        const validatePart = (part, schema) => {
            if (!schema)
                return;
            const currentValue = req[part];
            let sanitizedValue = currentValue;
            if (sanitize && currentValue) {
                sanitizedValue = (0, security_1.sanitizeInput)(currentValue);
            }
            const { error, value } = schema.validate(sanitizedValue, {
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
            }
            else {
                if (part === 'body' || part === 'query' || part === 'params') {
                    req[part] = value;
                }
            }
        };
        validatePart('body', schema.body);
        validatePart('query', schema.query);
        validatePart('params', schema.params);
        validatePart('headers', schema.headers);
        if (hasErrors) {
            if (logValidationErrors) {
                logger_1.loggers.security('Validation failed', {
                    errors: validationErrors,
                    path: req.path,
                    method: req.method,
                    ip: req.ip,
                    userId: req.user?.id,
                });
            }
            const validationError = new errors_1.ValidationError('Validation failed', {
                validationErrors,
                path: req.path,
                method: req.method,
            });
            return next(validationError);
        }
        next();
    };
};
exports.validateRequest = validateRequest;
exports.commonValidationSchemas = {
    pagination: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
        sort: joi_1.default.string().pattern(/^[a-zA-Z0-9_]+:(asc|desc)$/),
    }),
    idParam: joi_1.default.object({
        id: joi_1.default.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    }),
    uuidParam: joi_1.default.object({
        id: joi_1.default.string().uuid().required(),
    }),
    dateRange: joi_1.default.object({
        startDate: joi_1.default.date().iso(),
        endDate: joi_1.default.date().iso().min(joi_1.default.ref('startDate')),
    }),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string()
        .min(8)
        .max(100)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .required()
        .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
    phoneNumber: joi_1.default.string()
        .pattern(/^\+?[1-9]\d{1,14}$/)
        .messages({
        'string.pattern.base': 'Phone number must be in E.164 format',
    }),
    apiKey: joi_1.default.string().pattern(/^[A-Za-z0-9_-]{20,}$/),
    searchQuery: joi_1.default.object({
        q: joi_1.default.string().min(1).max(100).required(),
        fields: joi_1.default.array().items(joi_1.default.string()),
    }),
};
const validateContentType = (allowedTypes) => {
    return (req, res, next) => {
        const contentType = req.headers['content-type'];
        if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
            res.status(415).json({
                error: {
                    message: `Unsupported Content-Type. Allowed types: ${allowedTypes.join(', ')}`,
                    code: 'UNSUPPORTED_CONTENT_TYPE',
                }
            });
            return;
        }
        next();
    };
};
exports.validateContentType = validateContentType;
const validateRequestSize = (maxSizeBytes) => {
    return (req, res, next) => {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);
        if (contentLength > maxSizeBytes) {
            res.status(413).json({
                error: {
                    message: `Request entity too large. Maximum size: ${maxSizeBytes} bytes`,
                    code: 'REQUEST_ENTITY_TOO_LARGE',
                }
            });
            return;
        }
        next();
    };
};
exports.validateRequestSize = validateRequestSize;
//# sourceMappingURL=enhancedValidation.js.map