"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logConfigChange = exports.logSecurityEvent = exports.logPaymentEvent = exports.logGdprEvent = exports.logDataAccessEvent = exports.logAuthEvent = exports.auditMiddleware = exports.createAuditEventFromRequest = exports.logAuditEvent = exports.AuditEventSeverity = exports.AuditEventType = exports.auditLogger = void 0;
const winston = __importStar(require("winston"));
const config_1 = require("../config");
const security_1 = require("./security");
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
winston.addColors(auditLevels.colors);
exports.auditLogger = winston.createLogger({
    levels: auditLevels.levels,
    level: 'info',
    format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }), winston.format.json()),
    defaultMeta: {
        service: 'flight-search-saas-audit',
        environment: config_1.config.server.nodeEnv,
        version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
        new winston.transports.File({
            filename: 'logs/audit.log',
            maxsize: 10485760,
            maxFiles: 10,
            tailable: true
        }),
    ],
});
if (config_1.config.server.nodeEnv !== 'production') {
    exports.auditLogger.add(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize({ all: true }), winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [AUDIT] ${level}: ${message} ${metaStr}`;
        })),
    }));
}
var AuditEventType;
(function (AuditEventType) {
    AuditEventType["LOGIN_SUCCESS"] = "LOGIN_SUCCESS";
    AuditEventType["LOGIN_FAILURE"] = "LOGIN_FAILURE";
    AuditEventType["LOGOUT"] = "LOGOUT";
    AuditEventType["PASSWORD_CHANGE"] = "PASSWORD_CHANGE";
    AuditEventType["PASSWORD_RESET_REQUEST"] = "PASSWORD_RESET_REQUEST";
    AuditEventType["PASSWORD_RESET_COMPLETE"] = "PASSWORD_RESET_COMPLETE";
    AuditEventType["ACCOUNT_LOCKOUT"] = "ACCOUNT_LOCKOUT";
    AuditEventType["ACCESS_DENIED"] = "ACCESS_DENIED";
    AuditEventType["PERMISSION_CHANGE"] = "PERMISSION_CHANGE";
    AuditEventType["ROLE_CHANGE"] = "ROLE_CHANGE";
    AuditEventType["USER_CREATE"] = "USER_CREATE";
    AuditEventType["USER_UPDATE"] = "USER_UPDATE";
    AuditEventType["USER_DELETE"] = "USER_DELETE";
    AuditEventType["USER_DISABLE"] = "USER_DISABLE";
    AuditEventType["USER_ENABLE"] = "USER_ENABLE";
    AuditEventType["DATA_ACCESS"] = "DATA_ACCESS";
    AuditEventType["DATA_EXPORT"] = "DATA_EXPORT";
    AuditEventType["DATA_IMPORT"] = "DATA_IMPORT";
    AuditEventType["DATA_DELETE"] = "DATA_DELETE";
    AuditEventType["PAYMENT_ATTEMPT"] = "PAYMENT_ATTEMPT";
    AuditEventType["PAYMENT_SUCCESS"] = "PAYMENT_SUCCESS";
    AuditEventType["PAYMENT_FAILURE"] = "PAYMENT_FAILURE";
    AuditEventType["REFUND_REQUEST"] = "REFUND_REQUEST";
    AuditEventType["REFUND_PROCESSED"] = "REFUND_PROCESSED";
    AuditEventType["BOOKING_CREATE"] = "BOOKING_CREATE";
    AuditEventType["BOOKING_UPDATE"] = "BOOKING_UPDATE";
    AuditEventType["BOOKING_CANCEL"] = "BOOKING_CANCEL";
    AuditEventType["POINTS_TRANSFER"] = "POINTS_TRANSFER";
    AuditEventType["POINTS_REDEMPTION"] = "POINTS_REDEMPTION";
    AuditEventType["REWARD_ACCOUNT_LINK"] = "REWARD_ACCOUNT_LINK";
    AuditEventType["REWARD_ACCOUNT_UNLINK"] = "REWARD_ACCOUNT_UNLINK";
    AuditEventType["CONFIG_CHANGE"] = "CONFIG_CHANGE";
    AuditEventType["API_KEY_CREATE"] = "API_KEY_CREATE";
    AuditEventType["API_KEY_REVOKE"] = "API_KEY_REVOKE";
    AuditEventType["SYSTEM_ERROR"] = "SYSTEM_ERROR";
    AuditEventType["CONSENT_GIVEN"] = "CONSENT_GIVEN";
    AuditEventType["CONSENT_WITHDRAWN"] = "CONSENT_WITHDRAWN";
    AuditEventType["DATA_SUBJECT_REQUEST"] = "DATA_SUBJECT_REQUEST";
    AuditEventType["DATA_DELETION_REQUEST"] = "DATA_DELETION_REQUEST";
    AuditEventType["DATA_DELETION_COMPLETE"] = "DATA_DELETION_COMPLETE";
    AuditEventType["DATA_EXPORT_REQUEST"] = "DATA_EXPORT_REQUEST";
    AuditEventType["DATA_EXPORT_COMPLETE"] = "DATA_EXPORT_COMPLETE";
    AuditEventType["SUSPICIOUS_ACTIVITY"] = "SUSPICIOUS_ACTIVITY";
    AuditEventType["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    AuditEventType["BRUTE_FORCE_ATTEMPT"] = "BRUTE_FORCE_ATTEMPT";
    AuditEventType["IP_BLOCKED"] = "IP_BLOCKED";
})(AuditEventType || (exports.AuditEventType = AuditEventType = {}));
var AuditEventSeverity;
(function (AuditEventSeverity) {
    AuditEventSeverity["CRITICAL"] = "critical";
    AuditEventSeverity["HIGH"] = "high";
    AuditEventSeverity["MEDIUM"] = "medium";
    AuditEventSeverity["LOW"] = "low";
    AuditEventSeverity["INFO"] = "info";
})(AuditEventSeverity || (exports.AuditEventSeverity = AuditEventSeverity = {}));
const logAuditEvent = (event) => {
    const maskedDetails = event.details ? (0, security_1.maskSensitiveData)(event.details) : undefined;
    exports.auditLogger.log(event.severity, `${event.eventType}: ${event.action || ''}`, {
        ...event,
        details: maskedDetails,
        timestamp: new Date().toISOString(),
    });
};
exports.logAuditEvent = logAuditEvent;
const createAuditEventFromRequest = (req, eventType, severity, details) => {
    const user = req.user;
    return {
        eventType,
        severity,
        userId: user?.id,
        username: user?.username,
        userEmail: user?.email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id,
        details,
    };
};
exports.createAuditEventFromRequest = createAuditEventFromRequest;
const auditMiddleware = (eventType, severity = AuditEventSeverity.INFO, getResourceInfo) => {
    return (req, res, next) => {
        const originalEnd = res.end;
        res.end = function (chunk, encoding, callback) {
            res.end = originalEnd;
            const resourceInfo = getResourceInfo ? getResourceInfo(req) : {
                resourceType: req.path.split('/')[1] || 'unknown',
                resourceId: req.params.id || 'unknown',
                action: req.method,
            };
            const auditEvent = {
                eventType,
                severity,
                userId: req.user?.id,
                username: req.user?.username,
                userEmail: req.user?.email,
                resourceType: resourceInfo.resourceType,
                resourceId: resourceInfo.resourceId,
                action: resourceInfo.action,
                status: res.statusCode < 400 ? 'success' : 'failure',
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                requestId: req.id,
                details: {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    responseTime: Date.now() - (req.startTime || Date.now()),
                },
            };
            (0, exports.logAuditEvent)(auditEvent);
            return originalEnd.call(this, chunk, encoding, callback);
        };
        next();
    };
};
exports.auditMiddleware = auditMiddleware;
const logAuthEvent = (eventType, userId, username, success, ip, userAgent, details) => {
    (0, exports.logAuditEvent)({
        eventType,
        severity: success ? AuditEventSeverity.INFO : AuditEventSeverity.MEDIUM,
        userId,
        username,
        action: eventType.toString(),
        status: success ? 'success' : 'failure',
        ip,
        userAgent,
        details,
    });
};
exports.logAuthEvent = logAuthEvent;
const logDataAccessEvent = (userId, username, resourceType, resourceId, action, ip, userAgent, details) => {
    (0, exports.logAuditEvent)({
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
        details,
    });
};
exports.logDataAccessEvent = logDataAccessEvent;
const logGdprEvent = (eventType, userId, username, userEmail, ip, userAgent, details) => {
    (0, exports.logAuditEvent)({
        eventType,
        severity: AuditEventSeverity.HIGH,
        userId,
        username,
        userEmail,
        action: eventType.toString(),
        status: 'success',
        ip,
        userAgent,
        details,
    });
};
exports.logGdprEvent = logGdprEvent;
const logPaymentEvent = (eventType, userId, amount, currency, paymentMethod, success, ip, userAgent, details) => {
    (0, exports.logAuditEvent)({
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
exports.logPaymentEvent = logPaymentEvent;
const logSecurityEvent = (eventType, severity, ip, userAgent, userId, details) => {
    (0, exports.logAuditEvent)({
        eventType,
        severity,
        userId,
        action: eventType.toString(),
        status: 'failure',
        ip,
        userAgent,
        details,
    });
};
exports.logSecurityEvent = logSecurityEvent;
const logConfigChange = (userId, username, configArea, oldValue, newValue, ip, userAgent) => {
    (0, exports.logAuditEvent)({
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
            oldValue: (0, security_1.maskSensitiveData)(oldValue),
            newValue: (0, security_1.maskSensitiveData)(newValue),
        },
    });
};
exports.logConfigChange = logConfigChange;
//# sourceMappingURL=auditLogger.js.map