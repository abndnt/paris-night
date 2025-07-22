import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import xss from 'xss';
import validator from 'validator';

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input - The input to sanitize (string, object, or array)
 * @returns Sanitized input
 */
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    // Sanitize string input
    return xss(input);
  } else if (Array.isArray(input)) {
    // Recursively sanitize array elements
    return input.map(item => sanitizeInput(item));
  } else if (input !== null && typeof input === 'object') {
    // Recursively sanitize object properties
    const sanitizedObject: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitizedObject[key] = sanitizeInput(value);
    }
    return sanitizedObject;
  }
  
  // Return primitives unchanged
  return input;
};

/**
 * Validates and sanitizes an email address
 * @param email - The email to validate and sanitize
 * @returns Sanitized email or null if invalid
 */
export const sanitizeEmail = (email: string): string | null => {
  if (!validator.isEmail(email)) {
    return null;
  }
  return validator.normalizeEmail(email, {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false,
  });
};

/**
 * Sanitizes a URL to prevent open redirect vulnerabilities
 * @param url - The URL to sanitize
 * @param allowedDomains - List of allowed domains
 * @returns Sanitized URL or null if invalid
 */
export const sanitizeUrl = (url: string, allowedDomains: string[] = []): string | null => {
  if (!validator.isURL(url, { require_protocol: true })) {
    return null;
  }
  
  try {
    const parsedUrl = new URL(url);
    
    // Check if domain is allowed
    if (allowedDomains.length > 0 && !allowedDomains.some(domain => 
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`))
    ) {
      return null;
    }
    
    return url;
  } catch (error) {
    return null;
  }
};

/**
 * Generates a secure random token
 * @param length - Length of the token in bytes (default: 32)
 * @returns Secure random token as hex string
 */
export const generateSecureToken = (length: number = 32): string => {
  return randomBytes(length).toString('hex');
};

/**
 * Hashes a password securely using scrypt
 * @param password - The password to hash
 * @returns Hashed password with salt
 */
export const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
};

/**
 * Verifies a password against a hash
 * @param password - The password to verify
 * @param hashedPassword - The stored hash
 * @returns True if password matches
 */
export const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const [salt, hash] = hashedPassword.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const derivedKey = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, derivedKey);
};

/**
 * Generates a hash for a value (for non-sensitive data)
 * @param value - The value to hash
 * @returns Hashed value
 */
export const hashValue = (value: string): string => {
  return createHash('sha256').update(value).digest('hex');
};

/**
 * Masks sensitive data for logging
 * @param data - The data to mask
 * @param fieldsToMask - Fields to mask
 * @returns Data with sensitive fields masked
 */
export const maskSensitiveData = (
  data: Record<string, any>,
  fieldsToMask: string[] = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn']
): Record<string, any> => {
  const maskedData = { ...data };
  
  for (const key of Object.keys(maskedData)) {
    const lowerKey = key.toLowerCase();
    
    if (fieldsToMask.some(field => lowerKey.includes(field.toLowerCase()))) {
      maskedData[key] = '********';
    } else if (typeof maskedData[key] === 'object' && maskedData[key] !== null) {
      maskedData[key] = maskSensitiveData(maskedData[key], fieldsToMask);
    }
  }
  
  return maskedData;
};

/**
 * Validates a password strength
 * @param password - The password to validate
 * @returns Object with validation result and strength score
 */
export const validatePasswordStrength = (password: string): { 
  valid: boolean; 
  score: number; 
  feedback: string[] 
} => {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length < 8) {
    feedback.push('Password should be at least 8 characters long');
  } else {
    score += 1;
  }
  
  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password should contain at least one uppercase letter');
  } else {
    score += 1;
  }
  
  // Lowercase check
  if (!/[a-z]/.test(password)) {
    feedback.push('Password should contain at least one lowercase letter');
  } else {
    score += 1;
  }
  
  // Number check
  if (!/\d/.test(password)) {
    feedback.push('Password should contain at least one number');
  } else {
    score += 1;
  }
  
  // Special character check
  if (!/[^A-Za-z0-9]/.test(password)) {
    feedback.push('Password should contain at least one special character');
  } else {
    score += 1;
  }
  
  // Common password check (simplified)
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

/**
 * Generates a Content Security Policy header value
 * @returns CSP header value
 */
export const generateCSP = (): string => {
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

/**
 * Generates security headers for HTTP responses
 * @returns Object with security headers
 */
export const securityHeaders = (): Record<string, string> => {
  return {
    'Content-Security-Policy': generateCSP(),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
};

/**
 * Checks if a request is from a suspicious IP
 * @param ip - The IP address to check
 * @returns True if IP is suspicious
 */
export const isSuspiciousIP = async (ip: string): Promise<boolean> => {
  // This would typically integrate with an IP reputation service
  // For now, we'll just check against a simple blocklist
  const blockedIPs = [
    '0.0.0.0',
    '127.0.0.1', // For testing only, remove in production
  ];
  
  return blockedIPs.includes(ip);
};

/**
 * Validates and normalizes a phone number
 * @param phoneNumber - The phone number to validate
 * @returns Normalized phone number or null if invalid
 */
export const validatePhoneNumber = (phoneNumber: string): string | null => {
  if (!validator.isMobilePhone(phoneNumber)) {
    return null;
  }
  
  // Remove all non-digit characters
  return phoneNumber.replace(/\D/g, '');
};

/**
 * Encrypts sensitive data (simplified version - use a proper encryption library in production)
 * @param data - Data to encrypt
 * @param key - Encryption key
 * @returns Encrypted data
 */
export const encryptData = (data: string, key: string): string => {
  // This is a placeholder - in a real implementation, use a proper encryption library
  // like node-forge, crypto-js, or the Node.js crypto module with proper key management
  return `encrypted:${data}`;
};

/**
 * Decrypts sensitive data (simplified version - use a proper encryption library in production)
 * @param encryptedData - Data to decrypt
 * @param key - Encryption key
 * @returns Decrypted data
 */
export const decryptData = (encryptedData: string, key: string): string => {
  // This is a placeholder - in a real implementation, use a proper encryption library
  // like node-forge, crypto-js, or the Node.js crypto module with proper key management
  return encryptedData.replace('encrypted:', '');
};