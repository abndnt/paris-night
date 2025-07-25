"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ddosProtection = exports.apiRateLimit = exports.sensitiveOperationRateLimit = exports.authRateLimit = exports.defaultAdvancedRateLimit = exports.createAdvancedRateLimit = void 0;
const database_1 = require("../config/database");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const errorTracking_1 = require("../utils/errorTracking");
const createAdvancedRateLimit = (options) => {
    const { windowMs, max, message = 'Too many requests, please try again later.', keyGenerator = (req) => {
        const ip = options.trustProxy && req.headers['x-forwarded-for']
            ? (Array.isArray(req.headers['x-forwarded-for'])
                ? req.headers['x-forwarded-for'][0]
                : req.headers['x-forwarded-for']?.split(',')[0]?.trim())
            : req.ip;
        const userId = req.user?.id || 'anonymous';
        const path = req.path || req.originalUrl || '/';
        return `rate_limit:${ip}:${userId}:${path}`;
    }, skipSuccessfulRequests = false, headers = true, handler, skipFailedRequests = false, requestWasSuccessful = (_req, res) => res.statusCode < 400, skip, trustProxy = false, blacklist = [], whitelist = [], standardHeaders = true, legacyHeaders = false, } = options;
    return async (req, res, next) => {
        try {
            const ip = trustProxy && req.headers['x-forwarded-for']
                ? (Array.isArray(req.headers['x-forwarded-for'])
                    ? req.headers['x-forwarded-for'][0]
                    : req.headers['x-forwarded-for']?.split(',')[0]?.trim())
                : req.ip || 'unknown';
            if (ip && whitelist.includes(ip)) {
                return next();
            }
            if (ip && blacklist.includes(ip)) {
                logger_1.loggers.security('Blocked blacklisted IP', { ip, url: req.originalUrl });
                res.status(403).json({
                    error: {
                        message: 'Access denied',
                        code: 'BLACKLISTED',
                    }
                });
                return;
            }
            if (skip && skip(req, res)) {
                return next();
            }
            const key = keyGenerator(req);
            const current = await database_1.redisClient.get(key);
            if (headers) {
                if (standardHeaders) {
                    res.setHeader('RateLimit-Limit', max);
                    res.setHeader('RateLimit-Remaining', current === null ? max : Math.max(0, max - parseInt(current, 10)));
                    res.setHeader('RateLimit-Reset', Math.ceil(Date.now() / 1000) + Math.ceil(windowMs / 1000));
                }
                if (legacyHeaders) {
                    res.setHeader('X-RateLimit-Limit', max);
                    res.setHeader('X-RateLimit-Remaining', current === null ? max : Math.max(0, max - parseInt(current, 10)));
                    res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + Math.ceil(windowMs / 1000));
                    res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
                }
            }
            if (current === null) {
                await database_1.redisClient.setEx(key, Math.ceil(windowMs / 1000), '1');
                if (skipSuccessfulRequests || skipFailedRequests) {
                    res.on('finish', async () => {
                        const successful = requestWasSuccessful(req, res);
                        if ((skipSuccessfulRequests && successful) || (skipFailedRequests && !successful)) {
                            try {
                                await database_1.redisClient.decr(key);
                            }
                            catch (error) {
                            }
                        }
                    });
                }
                return next();
            }
            const count = parseInt(current, 10);
            if (count >= max) {
                logger_1.loggers.security('Rate limit exceeded', {
                    ip,
                    path: req.path,
                    method: req.method,
                    userAgent: req.get('User-Agent'),
                    userId: req.user?.id,
                    requestId: req.id,
                    count,
                    limit: max,
                });
                errorTracking_1.errorTracker.captureMessage(`Rate limit exceeded: ${req.method} ${req.path}`, 'warning', {
                    ip,
                    path: req.path,
                    method: req.method,
                    count,
                    limit: max,
                });
                if (handler) {
                    return handler(req, res);
                }
                const retryAfter = Math.ceil(windowMs / 1000);
                if (standardHeaders) {
                    res.setHeader('RateLimit-Limit', max);
                    res.setHeader('RateLimit-Remaining', 0);
                    res.setHeader('RateLimit-Reset', Math.ceil(Date.now() / 1000) + retryAfter);
                }
                if (legacyHeaders) {
                    res.setHeader('Retry-After', retryAfter);
                }
                res.status(429).json({
                    error: {
                        message,
                        code: 'RATE_LIMIT_EXCEEDED',
                        retryAfter: `${retryAfter} seconds`,
                    }
                });
                return;
            }
            await database_1.redisClient.incr(key);
            if (skipSuccessfulRequests || skipFailedRequests) {
                res.on('finish', async () => {
                    const successful = requestWasSuccessful(req, res);
                    if ((skipSuccessfulRequests && successful) || (skipFailedRequests && !successful)) {
                        try {
                            await database_1.redisClient.decr(key);
                        }
                        catch (error) {
                        }
                    }
                });
            }
            next();
        }
        catch (error) {
            logger_1.loggers.error('Rate limiting failed', error, {
                path: req.path,
                method: req.method,
            });
            next();
        }
    };
};
exports.createAdvancedRateLimit = createAdvancedRateLimit;
exports.defaultAdvancedRateLimit = (0, exports.createAdvancedRateLimit)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy: true,
});
exports.authRateLimit = (0, exports.createAdvancedRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again in 15 minutes.',
    skipSuccessfulRequests: true,
    standardHeaders: true,
    trustProxy: true,
});
exports.sensitiveOperationRateLimit = (0, exports.createAdvancedRateLimit)({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many attempts for sensitive operation, please try again later.',
    standardHeaders: true,
    trustProxy: true,
});
exports.apiRateLimit = (0, exports.createAdvancedRateLimit)({
    windowMs: 60 * 1000,
    max: 60,
    message: 'API rate limit exceeded, please slow down your requests.',
    standardHeaders: true,
    trustProxy: true,
    keyGenerator: (req) => {
        const apiKey = req.headers['x-api-key'] || req.query['apiKey'];
        const ip = req.ip || 'unknown';
        return `api_rate_limit:${apiKey || ip}`;
    },
});
exports.ddosProtection = (0, exports.createAdvancedRateLimit)({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: 'Too many requests detected. Access temporarily blocked.',
    standardHeaders: true,
    trustProxy: true,
    keyGenerator: (req) => {
        const ip = req.ip || 'unknown';
        return `ddos_protection:${ip}`;
    },
    handler: (req, res) => {
        logger_1.loggers.security('Potential DDoS attempt detected', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            headers: req.headers,
        });
        errorTracking_1.errorTracker.captureMessage('Potential DDoS attempt blocked', 'error', {
            ip: req.ip,
            path: req.path,
            method: req.method,
        });
        res.status(429).send('Too many requests');
    },
});
//# sourceMappingURL=advancedRateLimit.js.map