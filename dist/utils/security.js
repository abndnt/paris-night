"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptData = exports.encryptData = exports.validatePhoneNumber = exports.isSuspiciousIP = exports.securityHeaders = exports.generateCSP = exports.validatePasswordStrength = exports.maskSensitiveData = exports.hashValue = exports.verifyPassword = exports.hashPassword = exports.generateSecureToken = exports.sanitizeUrl = exports.sanitizeEmail = exports.sanitizeInput = void 0;
const crypto_1 = require("crypto");
const xss_1 = __importDefault(require("xss"));
const validator_1 = __importDefault(require("validator"));
const sanitizeInput = (input) => {
    if (typeof input === 'string') {
        return (0, xss_1.default)(input);
    }
    else if (Array.isArray(input)) {
        return input.map(item => (0, exports.sanitizeInput)(item));
    }
    else if (input !== null && typeof input === 'object') {
        const sanitizedObject = {};
        for (const [key, value] of Object.entries(input)) {
            sanitizedObject[key] = (0, exports.sanitizeInput)(value);
        }
        return sanitizedObject;
    }
    return input;
};
exports.sanitizeInput = sanitizeInput;
const sanitizeEmail = (email) => {
    if (!validator_1.default.isEmail(email)) {
        return null;
    }
    return validator_1.default.normalizeEmail(email, {
        gmail_remove_dots: false,
        gmail_remove_subaddress: false,
        outlookdotcom_remove_subaddress: false,
        yahoo_remove_subaddress: false,
        icloud_remove_subaddress: false,
    });
};
exports.sanitizeEmail = sanitizeEmail;
const sanitizeUrl = (url, allowedDomains = []) => {
    if (!validator_1.default.isURL(url, { require_protocol: true })) {
        return null;
    }
    try {
        const parsedUrl = new URL(url);
        if (allowedDomains.length > 0 && !allowedDomains.some(domain => parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`))) {
            return null;
        }
        return url;
    }
    catch (error) {
        return null;
    }
};
exports.sanitizeUrl = sanitizeUrl;
const generateSecureToken = (length = 32) => {
    return (0, crypto_1.randomBytes)(length).toString('hex');
};
exports.generateSecureToken = generateSecureToken;
const hashPassword = (password) => {
    const salt = (0, crypto_1.randomBytes)(16).toString('hex');
    const hash = (0, crypto_1.scryptSync)(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
};
exports.hashPassword = hashPassword;
const verifyPassword = (password, hashedPassword) => {
    const [salt, hash] = hashedPassword.split(':');
    const hashBuffer = Buffer.from(hash, 'hex');
    const derivedKey = (0, crypto_1.scryptSync)(password, salt, 64);
    return (0, crypto_1.timingSafeEqual)(hashBuffer, derivedKey);
};
exports.verifyPassword = verifyPassword;
const hashValue = (value) => {
    return (0, crypto_1.createHash)('sha256').update(value).digest('hex');
};
exports.hashValue = hashValue;
const maskSensitiveData = (data, fieldsToMask = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn']) => {
    const maskedData = { ...data };
    for (const key of Object.keys(maskedData)) {
        const lowerKey = key.toLowerCase();
        if (fieldsToMask.some(field => lowerKey.includes(field.toLowerCase()))) {
            maskedData[key] = '********';
        }
        else if (typeof maskedData[key] === 'object' && maskedData[key] !== null) {
            maskedData[key] = (0, exports.maskSensitiveData)(maskedData[key], fieldsToMask);
        }
    }
    return maskedData;
};
exports.maskSensitiveData = maskSensitiveData;
const validatePasswordStrength = (password) => {
    const feedback = [];
    let score = 0;
    if (password.length < 8) {
        feedback.push('Password should be at least 8 characters long');
    }
    else {
        score += 1;
    }
    if (!/[A-Z]/.test(password)) {
        feedback.push('Password should contain at least one uppercase letter');
    }
    else {
        score += 1;
    }
    if (!/[a-z]/.test(password)) {
        feedback.push('Password should contain at least one lowercase letter');
    }
    else {
        score += 1;
    }
    if (!/\d/.test(password)) {
        feedback.push('Password should contain at least one number');
    }
    else {
        score += 1;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        feedback.push('Password should contain at least one special character');
    }
    else {
        score += 1;
    }
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome'];
    if (commonPasswords.includes(password.toLowerCase())) {
        feedback.push('Password is too common');
        score = 0;
    }
    return {
        valid: score >= 4 && password.length >= 8,
        score,
        feedback,
    };
};
exports.validatePasswordStrength = validatePasswordStrength;
const generateCSP = () => {
    return [
        "default-src 'self'",
        "script-src 'self' https://cdn.jsdelivr.net",
        "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' https://cdn.jsdelivr.net",
        "connect-src 'self' https://api.example.com",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "block-all-mixed-content",
        "upgrade-insecure-requests",
    ].join('; ');
};
exports.generateCSP = generateCSP;
const securityHeaders = () => {
    return {
        'Content-Security-Policy': (0, exports.generateCSP)(),
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    };
};
exports.securityHeaders = securityHeaders;
const isSuspiciousIP = async (ip) => {
    const blockedIPs = [
        '0.0.0.0',
        '127.0.0.1',
    ];
    return blockedIPs.includes(ip);
};
exports.isSuspiciousIP = isSuspiciousIP;
const validatePhoneNumber = (phoneNumber) => {
    if (!validator_1.default.isMobilePhone(phoneNumber)) {
        return null;
    }
    return phoneNumber.replace(/\D/g, '');
};
exports.validatePhoneNumber = validatePhoneNumber;
const encryptData = (data, key) => {
    return `encrypted:${data}`;
};
exports.encryptData = encryptData;
const decryptData = (encryptedData, key) => {
    return encryptedData.replace('encrypted:', '');
};
exports.decryptData = decryptData;
//# sourceMappingURL=security.js.map