import { Request } from 'express';
import * as winston from 'winston';
export declare const auditLogger: winston.Logger;
export declare enum AuditEventType {
    LOGIN_SUCCESS = "LOGIN_SUCCESS",
    LOGIN_FAILURE = "LOGIN_FAILURE",
    LOGOUT = "LOGOUT",
    PASSWORD_CHANGE = "PASSWORD_CHANGE",
    PASSWORD_RESET_REQUEST = "PASSWORD_RESET_REQUEST",
    PASSWORD_RESET_COMPLETE = "PASSWORD_RESET_COMPLETE",
    ACCOUNT_LOCKOUT = "ACCOUNT_LOCKOUT",
    ACCESS_DENIED = "ACCESS_DENIED",
    PERMISSION_CHANGE = "PERMISSION_CHANGE",
    ROLE_CHANGE = "ROLE_CHANGE",
    USER_CREATE = "USER_CREATE",
    USER_UPDATE = "USER_UPDATE",
    USER_DELETE = "USER_DELETE",
    USER_DISABLE = "USER_DISABLE",
    USER_ENABLE = "USER_ENABLE",
    DATA_ACCESS = "DATA_ACCESS",
    DATA_EXPORT = "DATA_EXPORT",
    DATA_IMPORT = "DATA_IMPORT",
    DATA_DELETE = "DATA_DELETE",
    PAYMENT_ATTEMPT = "PAYMENT_ATTEMPT",
    PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
    PAYMENT_FAILURE = "PAYMENT_FAILURE",
    REFUND_REQUEST = "REFUND_REQUEST",
    REFUND_PROCESSED = "REFUND_PROCESSED",
    BOOKING_CREATE = "BOOKING_CREATE",
    BOOKING_UPDATE = "BOOKING_UPDATE",
    BOOKING_CANCEL = "BOOKING_CANCEL",
    POINTS_TRANSFER = "POINTS_TRANSFER",
    POINTS_REDEMPTION = "POINTS_REDEMPTION",
    REWARD_ACCOUNT_LINK = "REWARD_ACCOUNT_LINK",
    REWARD_ACCOUNT_UNLINK = "REWARD_ACCOUNT_UNLINK",
    CONFIG_CHANGE = "CONFIG_CHANGE",
    API_KEY_CREATE = "API_KEY_CREATE",
    API_KEY_REVOKE = "API_KEY_REVOKE",
    SYSTEM_ERROR = "SYSTEM_ERROR",
    CONSENT_GIVEN = "CONSENT_GIVEN",
    CONSENT_WITHDRAWN = "CONSENT_WITHDRAWN",
    DATA_SUBJECT_REQUEST = "DATA_SUBJECT_REQUEST",
    DATA_DELETION_REQUEST = "DATA_DELETION_REQUEST",
    DATA_DELETION_COMPLETE = "DATA_DELETION_COMPLETE",
    DATA_EXPORT_REQUEST = "DATA_EXPORT_REQUEST",
    DATA_EXPORT_COMPLETE = "DATA_EXPORT_COMPLETE",
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    BRUTE_FORCE_ATTEMPT = "BRUTE_FORCE_ATTEMPT",
    IP_BLOCKED = "IP_BLOCKED"
}
export declare enum AuditEventSeverity {
    CRITICAL = "critical",
    HIGH = "high",
    MEDIUM = "medium",
    LOW = "low",
    INFO = "info"
}
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
export declare const logAuditEvent: (event: AuditEvent) => void;
export declare const createAuditEventFromRequest: (req: Request, eventType: AuditEventType, severity: AuditEventSeverity, details?: Record<string, any>) => AuditEvent;
export declare const auditMiddleware: (eventType: AuditEventType, severity?: AuditEventSeverity, getResourceInfo?: (req: Request) => {
    resourceType: string;
    resourceId: string;
    action: string;
}) => (req: Request, res: any, next: Function) => void;
export declare const logAuthEvent: (eventType: AuditEventType, userId: string, username: string, success: boolean, ip: string, userAgent: string, details?: Record<string, any>) => void;
export declare const logDataAccessEvent: (userId: string, username: string, resourceType: string, resourceId: string, action: string, ip: string, userAgent: string, details?: Record<string, any>) => void;
export declare const logGdprEvent: (eventType: AuditEventType, userId: string, username: string, userEmail: string, ip: string, userAgent: string, details?: Record<string, any>) => void;
export declare const logPaymentEvent: (eventType: AuditEventType, userId: string, amount: number, currency: string, paymentMethod: string, success: boolean, ip: string, userAgent: string, details?: Record<string, any>) => void;
export declare const logSecurityEvent: (eventType: AuditEventType, severity: AuditEventSeverity, ip: string, userAgent: string, userId?: string, details?: Record<string, any>) => void;
export declare const logConfigChange: (userId: string, username: string, configArea: string, oldValue: any, newValue: any, ip: string, userAgent: string) => void;
//# sourceMappingURL=auditLogger.d.ts.map