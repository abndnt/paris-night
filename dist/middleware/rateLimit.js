"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strictRateLimit = exports.defaultRateLimit = exports.createRateLimit = void 0;
const database_1 = require("../config/database");
const config_1 = require("../config");
const createRateLimit = (options) => {
    const { windowMs, max, message = 'Too many requests, please try again later.', keyGenerator = (req) => req.ip || 'unknown', } = options;
    return async (req, res, next) => {
        try {
            const key = `rate_limit:${keyGenerator(req)}`;
            const current = await database_1.redisClient.get(key);
            if (current === null) {
                await database_1.redisClient.setEx(key, Math.ceil(windowMs / 1000), '1');
                next();
                return;
            }
            const count = parseInt(current, 10);
            if (count >= max) {
                res.status(429).json({
                    error: message,
                    retryAfter: Math.ceil(windowMs / 1000),
                });
                return;
            }
            await database_1.redisClient.incr(key);
            next();
        }
        catch (error) {
            console.warn('Rate limiting failed, allowing request:', error);
            next();
        }
    };
};
exports.createRateLimit = createRateLimit;
exports.defaultRateLimit = (0, exports.createRateLimit)({
    windowMs: config_1.config.rateLimit.windowMs,
    max: config_1.config.rateLimit.max,
});
exports.strictRateLimit = (0, exports.createRateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many attempts, please try again in 15 minutes.',
});
//# sourceMappingURL=rateLimit.js.map