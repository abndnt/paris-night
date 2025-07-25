import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
interface EnhancedValidationOptions {
    sanitize?: boolean;
    abortEarly?: boolean;
    stripUnknown?: boolean;
    logValidationErrors?: boolean;
}
export declare const validateRequest: (schema: {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
    headers?: Joi.ObjectSchema;
}, options?: EnhancedValidationOptions) => (req: Request, res: Response, next: NextFunction) => void;
export declare const commonValidationSchemas: {
    pagination: Joi.ObjectSchema<any>;
    idParam: Joi.ObjectSchema<any>;
    uuidParam: Joi.ObjectSchema<any>;
    dateRange: Joi.ObjectSchema<any>;
    email: Joi.StringSchema<string>;
    password: Joi.StringSchema<string>;
    phoneNumber: Joi.StringSchema<string>;
    apiKey: Joi.StringSchema<string>;
    searchQuery: Joi.ObjectSchema<any>;
};
export declare const validateContentType: (allowedTypes: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRequestSize: (maxSizeBytes: number) => (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=enhancedValidation.d.ts.map