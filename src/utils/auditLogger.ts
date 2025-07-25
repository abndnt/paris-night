import { Request } from 'express';
import * as winston from 'winston';
import { config } from '../config';
import { maskSensitiveData } from './security';

// Define audit log levels
const auditLevels = {
  levels: {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  },
  colors: {
    critical: 'red',
    high: 'magenta',
    medium: 'yellow',
    low: 'cyan',
    info: 'blue',
  },
};

// Add colors to winston
winston.addColors(auditLevels.colors);

// Create audit logger instance
export const auditLogger = winston.createLogger({
  levels: auditLevels.levels,
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'flight-search-saas-audit',
    environment: config.server.nodeEnv,
    version: process.env['npm_package_version'] || '1.0.0'
  },
  transports: [
    // Audit log file
    new winston.transports.File({ 
      filename: 'logs/audit.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),
  ],
});

// Add console transport for non-production environments
if (config.server.nodeEnv !== 'production') {
  auditLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [AUDIT] ${level}: ${message} ${metaStr}`;
      })
    ),
  }));
}

// Audit event types
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',
  ACCOUNT_LOCKOUT = 'ACCOUNT_LOCKOUT',
  
  // Authorization events
  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  ROLE_CHANGE = 'ROLE_CHANGE',
  
  // User management events
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_DISABLE = 'USER_DISABLE',
  USER_ENABLE = 'USER_ENABLE',
  
  // Data access events
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  DATA_DELETE = 'DATA_DELETE',
  
  // Payment events
  PAYMENT_ATTEMPT = 'PAYMENT_ATTEMPT',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILURE = 'PAYMENT_FAILURE',
  REFUND_REQUEST = 'REFUND_REQUEST',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  
  // Booking events
  BOOKING_CREATE = 'BOOKING_CREATE',
  BOOKING_UPDATE = 'BOOKING_UPDATE',
  BOOKING_CANCEL = 'BOOKING_CANCEL',
  
  // Points and rewards events
  POINTS_TRANSFER = 'POINTS_TRANSFER',
  POINTS_REDEMPTION = 'POINTS_REDEMPTION',
  REWARD_ACCOUNT_LINK = 'REWARD_ACCOUNT_LINK',
  REWARD_ACCOUNT_UNLINK = 'REWARD_ACCOUNT_UNLINK',
  
  // System events
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  API_KEY_CREATE = 'API_KEY_CREATE',
  API_KEY_REVOKE = 'API_KEY_REVOKE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  
  // GDPR events
  CONSENT_GIVEN = 'CONSENT_GIVEN',
  CONSENT_WITHDRAWN = 'CONSENT_WITHDRAWN',
  DATA_SUBJECT_REQUEST = 'DATA_SUBJECT_REQUEST',
  DATA_DELETION_REQUEST = 'DATA_DELETION_REQUEST',
  DATA_DELETION_COMPLETE = 'DATA_DELETION_COMPLETE',
  DATA_EXPORT_REQUEST = 'DATA_EXPORT_REQUEST',
  DATA_EXPORT_COMPLETE = 'DATA_EXPORT_COMPLETE',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BRUTE_FORCE_ATTEMPT = 'BRUTE_FORCE_ATTEMPT',
  IP_BLOCKED = 'IP_BLOCKED',
}

// Audit event severity
export enum AuditEventSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

// Audit event interface
export interface AuditEvent {
  eventType: AuditEventType;
  severity: AuditEventSeverity;
  userId?: string;
  username?: string;
  userEmail?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  status?: 'success' | 'failure';
  ip?: string;
  userAgent?: string;
  requestId?: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Log an audit event
 * @param event - The audit event to log
 */
export const logAuditEvent = (event: AuditEvent): void => {
  // Mask any sensitive data in the details
  const maskedDetails = event.details ? maskSensitiveData(event.details) : undefined;
  
  // Log the event
  auditLogger.log(event.severity, `${event.eventType}: ${event.action || ''}`, {
    ...event,
    details: maskedDetails,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Create an audit event from a request
 * @param req - Express request object
 * @param eventType - Type of audit event
 * @param severity - Severity of the event
 * @param details - Additional details
 * @returns Audit event object
 */
export const createAuditEventFromRequest = (
  req: Request,
  eventType: AuditEventType,
  severity: AuditEventSeverity,
  details?: Record<string, any>
): AuditEvent => {
  const user = (req as any).user;
  
  return {
    eventType,
    severity,
    userId: user?.id || 'anonymous',
    username: user?.username || 'anonymous',
    userEmail: user?.email || 'unknown',
    ip: req.ip || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    requestId: (req as any).id || 'unknown',
    details: details || {},
  };
};

/**
 * Middleware to log sensitive operations
 * @param eventType - Type of audit event
 * @param severity - Severity of the event
 * @param getResourceInfo - Function to extract resource info from request
 */
export const auditMiddleware = (
  eventType: AuditEventType,
  severity: AuditEventSeverity = AuditEventSeverity.INFO,
  getResourceInfo?: (req: Request) => { resourceType: string; resourceId: string; action: string }
) => {
  return (req: Request, res: any, next: Function): void => {
    // Store original end function
    const originalEnd = res.end;
    
    // Override end function
    res.end = function(chunk?: any, encoding?: any, callback?: any): any {
      // Restore original end
      res.end = originalEnd;
      
      // Get resource info if provided
      const resourceInfo = getResourceInfo ? getResourceInfo(req) : {
        resourceType: req.path.split('/')[1] || 'unknown',
        resourceId: req.params['id'] || 'unknown',
        action: req.method,
      };
      
      // Create and log audit event
      const auditEvent: AuditEvent = {
        eventType,
        severity,
        userId: (req as any).user?.id || 'anonymous',
        username: (req as any).user?.username || 'anonymous',
        userEmail: (req as any).user?.email || 'unknown',
        resourceType: resourceInfo.resourceType,
        resourceId: resourceInfo.resourceId,
        action: resourceInfo.action,
        status: res.statusCode < 400 ? 'success' : 'failure',
        ip: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        requestId: (req as any).id || 'unknown',
        details: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          responseTime: Date.now() - ((req as any).startTime || Date.now()),
        },
      };
      
      logAuditEvent(auditEvent);
      
      // Call original end
      return originalEnd.call(this, chunk, encoding, callback);
    };
    
    next();
  };
};

/**
 * Helper function to log authentication events
 */
export const logAuthEvent = (
  eventType: AuditEventType,
  userId: string,
  username: string,
  success: boolean,
  ip: string,
  userAgent: string,
  details?: Record<string, any>
): void => {
  logAuditEvent({
    eventType,
    severity: success ? AuditEventSeverity.INFO : AuditEventSeverity.MEDIUM,
    userId,
    username,
    action: eventType.toString(),
    status: success ? 'success' : 'failure',
    ip,
    userAgent,
    details: details || {},
  });
};

/**
 * Helper function to log data access events
 */
export const logDataAccessEvent = (
  userId: string,
  username: string,
  resourceType: string,
  resourceId: string,
  action: string,
  ip: string,
  userAgent: string,
  details?: Record<string, any>
): void => {
  logAuditEvent({
    eventType: AuditEventType.DATA_ACCESS,
    severity: AuditEventSeverity.LOW,
    userId,
    username,
    resourceType,
    resourceId,
    action,
    status: 'success',
    ip,
    userAgent,
    details: details || {},
  });
};

/**
 * Helper function to log GDPR-related events
 */
export const logGdprEvent = (
  eventType: AuditEventType,
  userId: string,
  username: string,
  userEmail: string,
  ip: string,
  userAgent: string,
  details?: Record<string, any>
): void => {
  logAuditEvent({
    eventType,
    severity: AuditEventSeverity.HIGH,
    userId,
    username,
    userEmail,
    action: eventType.toString(),
    status: 'success',
    ip,
    userAgent,
    details: details || {},
  });
};

/**
 * Helper function to log payment events
 */
export const logPaymentEvent = (
  eventType: AuditEventType,
  userId: string,
  amount: number,
  currency: string,
  paymentMethod: string,
  success: boolean,
  ip: string,
  userAgent: string,
  details?: Record<string, any>
): void => {
  logAuditEvent({
    eventType,
    severity: success ? AuditEventSeverity.MEDIUM : AuditEventSeverity.HIGH,
    userId,
    resourceType: 'payment',
    action: eventType.toString(),
    status: success ? 'success' : 'failure',
    ip,
    userAgent,
    details: {
      amount,
      currency,
      paymentMethod,
      ...details,
    },
  });
};

/**
 * Helper function to log security events
 */
export const logSecurityEvent = (
  eventType: AuditEventType,
  severity: AuditEventSeverity,
  ip: string,
  userAgent: string,
  userId?: string,
  details?: Record<string, any>
): void => {
  logAuditEvent({
    eventType,
    severity,
    userId: userId || 'anonymous',
    action: eventType.toString(),
    status: 'failure',
    ip,
    userAgent,
    details: details || {},
  });
};

/**
 * Helper function to log system configuration changes
 */
export const logConfigChange = (
  userId: string,
  username: string,
  configArea: string,
  oldValue: any,
  newValue: any,
  ip: string,
  userAgent: string
): void => {
  logAuditEvent({
    eventType: AuditEventType.CONFIG_CHANGE,
    severity: AuditEventSeverity.HIGH,
    userId,
    username,
    resourceType: 'config',
    resourceId: configArea,
    action: 'UPDATE',
    status: 'success',
    ip,
    userAgent,
    details: {
      configArea,
      oldValue: maskSensitiveData(oldValue),
      newValue: maskSensitiveData(newValue),
    },
  });
};