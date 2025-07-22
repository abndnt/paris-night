import { Request, Response, NextFunction } from 'express';
import { securityHeaders } from '../utils/security';
import { config } from '../config';

/**
 * Middleware to add security headers to all responses
 */
export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const headers = securityHeaders();
  
  // Apply all security headers
  Object.entries(headers).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
  
  // Set SameSite cookie attribute
  res.cookie('cookieConsent', 'true', {
    httpOnly: true,
    secure: config.server.nodeEnv === 'production',
    sameSite: 'strict',
  });
  
  next();
};

/**
 * Middleware to prevent clickjacking
 */
export const noClickjackingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
};

/**
 * Middleware to prevent MIME type sniffing
 */
export const noSniffMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};

/**
 * Middleware to enable XSS protection
 */
export const xssProtectionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

/**
 * Middleware to enforce HTTPS
 */
export const httpsEnforcementMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (config.server.nodeEnv === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    // Redirect HTTP to HTTPS
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
  }
  
  next();
};

/**
 * Middleware to set referrer policy
 */
export const referrerPolicyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

/**
 * Middleware to set permissions policy
 */
export const permissionsPolicyMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self)'
  );
  next();
};

/**
 * Middleware to prevent cache for sensitive routes
 */
export const noCacheMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
};

/**
 * Middleware to detect and block suspicious requests
 */
export const suspiciousRequestDetection = (req: Request, res: Response, next: NextFunction): void => {
  // Check for suspicious query parameters
  const suspiciousParams = ['eval', 'exec', 'script', 'alert', 'document.cookie', 'onload'];
  const queryString = req.url.split('?')[1] || '';
  
  if (suspiciousParams.some(param => queryString.toLowerCase().includes(param))) {
    return res.status(403).json({
      error: {
        message: 'Suspicious request detected',
        code: 'SUSPICIOUS_REQUEST',
      }
    });
  }
  
  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-host', 'x-host'];
  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      return res.status(403).json({
        error: {
          message: 'Suspicious request detected',
          code: 'SUSPICIOUS_REQUEST',
        }
      });
    }
  }
  
  next();
};