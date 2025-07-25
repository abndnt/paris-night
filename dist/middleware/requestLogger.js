"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiPerformanceFinishMiddleware = exports.apiPerformanceMiddleware = exports.requestLoggerMiddleware = void 0;
const logger_1 = require("../utils/logger");
const errorTracking_1 = require("../utils/errorTracking");
const config_1 = require("../config");
const requestLoggerMiddleware = (req, res, next) => {
    req.startTime = Date.now();
    if (!req.id) {
        req.id = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        res.setHeader('X-Request-ID', req.id);
    }
    logger_1.loggers.request(req, res);
    if (config_1.config.monitoring.sentryDsn) {
        errorTracking_1.errorTracker.addBreadcrumb(`${req.method} ${req.originalUrl || req.url}`, 'http', {
            method: req.method,
            url: req.originalUrl || req.url,
            status_code: res.statusCode,
            request_id: req.id
        });
    }
    const originalEnd = res.end;
    res.end = function (chunk, encoding, callback) {
        res.end = originalEnd;
        const duration = Date.now() - req.startTime;
        logger_1.loggers.request(req, res, duration);
        if (duration > 1000) {
            logger_1.loggers.performance(`Slow request: ${req.method} ${req.originalUrl || req.url}`, duration, {
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                requestId: req.id
            });
        }
        return originalEnd.call(this, chunk, encoding, callback);
    };
    next();
};
exports.requestLoggerMiddleware = requestLoggerMiddleware;
const apiPerformanceMiddleware = (req, _res, next) => {
    if (!req.originalUrl.startsWith('/api')) {
        return next();
    }
    const transaction = errorTracking_1.errorTracker.startTransaction(`${req.method} ${req.route?.path || req.path}`, 'http.server');
    req.transaction = transaction;
    next();
};
exports.apiPerformanceMiddleware = apiPerformanceMiddleware;
const apiPerformanceFinishMiddleware = (req, res, next) => {
    if (!req.originalUrl.startsWith('/api')) {
        return next();
    }
    const originalEnd = res.end;
    res.end = function (chunk, encoding, callback) {
        res.end = originalEnd;
        const transaction = req.transaction;
        if (transaction) {
            transaction.setHttpStatus(res.statusCode);
            errorTracking_1.errorTracker.finishTransaction(transaction);
        }
        return originalEnd.call(this, chunk, encoding, callback);
    };
    next();
};
exports.apiPerformanceFinishMiddleware = apiPerformanceFinishMiddleware;
//# sourceMappingURL=requestLogger.js.map