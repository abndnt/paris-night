"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateProfile = exports.validateLogin = exports.validateRegister = exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.registerSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email()
        .required()
        .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
    }),
    password: joi_1.default.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
        .required()
        .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required',
    }),
    firstName: joi_1.default.string()
        .min(1)
        .max(100)
        .optional()
        .messages({
        'string.min': 'First name cannot be empty',
        'string.max': 'First name cannot exceed 100 characters',
    }),
    lastName: joi_1.default.string()
        .min(1)
        .max(100)
        .optional()
        .messages({
        'string.min': 'Last name cannot be empty',
        'string.max': 'Last name cannot exceed 100 characters',
    }),
    phoneNumber: joi_1.default.string()
        .pattern(new RegExp('^[+]?[1-9]\\d{1,14}$'))
        .optional()
        .messages({
        'string.pattern.base': 'Please provide a valid phone number',
    }),
});
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string()
        .email()
        .required()
        .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
    }),
    password: joi_1.default.string()
        .required()
        .messages({
        'any.required': 'Password is required',
    }),
});
exports.updateProfileSchema = joi_1.default.object({
    firstName: joi_1.default.string()
        .min(1)
        .max(100)
        .optional()
        .messages({
        'string.min': 'First name cannot be empty',
        'string.max': 'First name cannot exceed 100 characters',
    }),
    lastName: joi_1.default.string()
        .min(1)
        .max(100)
        .optional()
        .messages({
        'string.min': 'Last name cannot be empty',
        'string.max': 'Last name cannot exceed 100 characters',
    }),
    phoneNumber: joi_1.default.string()
        .pattern(new RegExp('^[+]?[1-9]\\d{1,14}$'))
        .optional()
        .allow('')
        .messages({
        'string.pattern.base': 'Please provide a valid phone number',
    }),
    dateOfBirth: joi_1.default.date()
        .max('now')
        .optional()
        .messages({
        'date.max': 'Date of birth cannot be in the future',
    }),
    passportNumber: joi_1.default.string()
        .min(6)
        .max(20)
        .optional()
        .allow('')
        .messages({
        'string.min': 'Passport number must be at least 6 characters',
        'string.max': 'Passport number cannot exceed 20 characters',
    }),
});
const validateRegister = (data) => {
    return exports.registerSchema.validate(data, { abortEarly: false });
};
exports.validateRegister = validateRegister;
const validateLogin = (data) => {
    return exports.loginSchema.validate(data, { abortEarly: false });
};
exports.validateLogin = validateLogin;
const validateUpdateProfile = (data) => {
    return exports.updateProfileSchema.validate(data, { abortEarly: false });
};
exports.validateUpdateProfile = validateUpdateProfile;
//# sourceMappingURL=authValidation.js.map