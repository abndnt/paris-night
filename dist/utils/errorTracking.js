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
exports.sentryRequestIdMiddleware = exports.sentryRequestHandler = exports.sentryErrorHandler = exports.errorTracker = exports.initializeErrorTracking = void 0;
const Sentry = __importStar(require("@sentry/node"));
const profiling_node_1 = require("@sentry/profiling-node");
const config_1 = require("../config");
const logger_1 = require("./logger");
const errors_1 = require("./errors");
const initializeErrorTracking = () => {
    if (config_1.config.monitoring?.sentryDsn) {
        Sentry.init({
            dsn: config_1.config.monitoring.sentryDsn,
            environment: config_1.config.server.nodeEnv,
            release: process.env.npm_package_version || '1.0.0',
            tracesSampleRate: config_1.config.server.nodeEnv === 'production' ? 0.1 : 1.0,
            profilesSampleRate: config_1.config.server.nodeEnv === 'production' ? 0.05 : 0.5,
            integrations: [
                new profiling_node_1.ProfilingIntegration(),
                Sentry.httpIntegration({ tracing: true }),
                Sentry.expressIntegration(),
                Sentry.postgresIntegration(),
                Sentry.redisIntegration(),
            ],
            beforeSend(event, hint) {
                if (event.request?.headers) {
                    delete event.request.headers.authorization;
                    delete event.request.headers.cookie;
                }
                const originalException = hint.originalException;
                if (originalException instanceof errors_1.BaseError) {
                    event.contexts = {
                        ...event.contexts,
                        errorContext: originalException.context || {},
                        errorType: {
                            name: originalException.name,
                            isOperational: originalException.isOperational,
                            statusCode: originalException.statusCode
                        }
                    };
                }
                return event;
            },
            beforeBreadcrumb(breadcrumb) {
                if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
                    if (breadcrumb.data.url.includes('/auth/') ||
                        breadcrumb.data.url.includes('token=') ||
                        breadcrumb.data.url.includes('apiKey=')) {
                        return null;
                    }
                }
                return breadcrumb;
            },
        });
        logger_1.logger.info('Error tracking initialized with Sentry');
    }
    else {
        logger_1.logger.warn('Sentry DSN not configured, error tracking disabled');
    }
};
exports.initializeErrorTracking = initializeErrorTracking;
exports.errorTracker = {
    captureException: (error, context, user) => {
        if (config_1.config.monitoring?.sentryDsn) {
            Sentry.withScope((scope) => {
                if (context) {
                    Object.keys(context).forEach(key => {
                        scope.setContext(key, context[key]);
                    });
                }
                if (user) {
                    scope.setUser({
                        id: user.id,
                        email: user.email,
                        username: user.username,
                        role: user.role,
                    });
                }
                scope.setTag('version', process.env.npm_package_version || '1.0.0');
                scope.setTag('environment', config_1.config.server.nodeEnv);
                if (error instanceof errors_1.BaseError) {
                    scope.setFingerprint([error.name, error.statusCode.toString()]);
                }
                Sentry.captureException(error);
            });
        }
        logger_1.logger.error('Exception captured', error, context);
    },
    captureMessage: (message, level = 'info', context) => {
        if (config_1.config.monitoring?.sentryDsn) {
            Sentry.withScope((scope) => {
                if (context) {
                    Object.keys(context).forEach(key => {
                        scope.setContext(key, context[key]);
                    });
                }
                Sentry.captureMessage(message, level);
            });
        }
        logger_1.logger.log(level === 'warning' ? 'warn' : level, message, context);
    },
    addBreadcrumb: (message, category, data) => {
        if (config_1.config.monitoring?.sentryDsn) {
            Sentry.addBreadcrumb({
                message,
                category,
                data,
                timestamp: Date.now() / 1000,
            });
        }
    },
    setUser: (user) => {
        if (config_1.config.monitoring?.sentryDsn) {
            Sentry.setUser(user);
        }
    },
    clearUser: () => {
        if (config_1.config.monitoring?.sentryDsn) {
            Sentry.setUser(null);
        }
    },
    setTag: (key, value) => {
        if (config_1.config.monitoring?.sentryDsn) {
            Sentry.setTag(key, value);
        }
    },
    setContext: (name, context) => {
        if (config_1.config.monitoring?.sentryDsn) {
            Sentry.setContext(name, context);
        }
    },
    startTransaction: (name, operation) => {
        if (config_1.config.monitoring?.sentryDsn) {
            return Sentry.startTransaction({ name, op: operation });
        }
        return null;
    },
    finishTransaction: (transaction) => {
        if (transaction && typeof transaction.finish === 'function') {
            transaction.finish();
        }
    },
    startSpan: (transaction, name, operation) => {
        if (transaction && typeof transaction.startChild === 'function') {
            return transaction.startChild({
                op: operation,
                description: name
            });
        }
        return null;
    },
    captureErrorWithRecovery: (error, recoverySteps, context, user) => {
        if (config_1.config.monitoring?.sentryDsn) {
            Sentry.withScope((scope) => {
                if (context) {
                    Object.keys(context).forEach(key => {
                        scope.setContext(key, context[key]);
                    });
                }
                scope.setContext('recovery', {
                    recoverable: true,
                    steps: recoverySteps,
                    timestamp: new Date().toISOString()
                });
                if (user) {
                    scope.setUser({
                        id: user.id,
                        email: user.email,
                        username: user.username,
                        role: user.role,
                    });
                }
                Sentry.captureException(error);
            });
        }
        logger_1.logger.error('Exception captured with recovery steps', error, {
            ...context,
            recoverySteps
        });
    },
    healthCheck: async () => {
        if (!config_1.config.monitoring?.sentryDsn) {
            return { status: 'disabled', details: { reason: 'No Sentry DSN configured' } };
        }
        try {
            const testTransaction = Sentry.startTransaction({
                name: 'health-check',
                op: 'test',
            });
            testTransaction.finish();
            return { status: 'healthy' };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
};
const sentryErrorHandler = (error, req, res, next) => {
    const shouldHandle = error.status >= 500 ||
        error.status === 429 ||
        error.status === 413 ||
        (error instanceof errors_1.BaseError && !error.isOperational);
    if (shouldHandle && config_1.config.monitoring?.sentryDsn) {
        Sentry.captureException(error);
    }
    next(error);
};
exports.sentryErrorHandler = sentryErrorHandler;
const sentryRequestHandler = (req, res, next) => {
    Sentry.withScope((scope) => {
        if (req.user) {
            scope.setUser({
                id: req.user.id,
                email: req.user.email,
                username: req.user.username,
                role: req.user.role,
            });
        }
        scope.setContext('request', {
            method: req.method,
            url: req.url,
            headers: req.headers,
            query: req.query,
        });
        next();
    });
};
exports.sentryRequestHandler = sentryRequestHandler;
const sentryRequestIdMiddleware = (req, _res, next) => {
    if (req.id) {
        Sentry.configureScope(scope => {
            scope.setTag('requestId', req.id);
        });
    }
    next();
};
exports.sentryRequestIdMiddleware = sentryRequestIdMiddleware;
//# sourceMappingURL=errorTracking.js.map