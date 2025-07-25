"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const config_1 = require("../config");
const logger_1 = require("./logger");
const errorHandler_1 = require("../middleware/errorHandler");
const advancedRateLimit_1 = require("../middleware/advancedRateLimit");
const routes_1 = require("../routes");
const requestLogger_1 = require("../middleware/requestLogger");
const errorTracking_1 = require("../utils/errorTracking");
const errorTracking_2 = require("../utils/errorTracking");
const securityHeaders_1 = require("../middleware/securityHeaders");
const createApp = (db, io) => {
    const app = (0, express_1.default)();
    (0, errorTracking_2.initializeErrorTracking)();
    app.use(errorHandler_1.requestIdMiddleware);
    if (config_1.config.monitoring.sentryDsn) {
        app.use(errorTracking_1.sentryRequestHandler);
        app.use(errorTracking_1.sentryTracingHandler);
        app.use(errorTracking_1.sentryRequestIdMiddleware);
    }
    app.use(advancedRateLimit_1.ddosProtection);
    app.use(securityHeaders_1.suspiciousRequestDetection);
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://api.stripe.com"],
                frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
                upgradeInsecureRequests: [],
            },
        },
        xssFilter: true,
        noSniff: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));
    app.use(securityHeaders_1.securityHeadersMiddleware);
    app.use(securityHeaders_1.noClickjackingMiddleware);
    app.use(securityHeaders_1.noSniffMiddleware);
    app.use(securityHeaders_1.xssProtectionMiddleware);
    app.use(securityHeaders_1.httpsEnforcementMiddleware);
    app.use(securityHeaders_1.referrerPolicyMiddleware);
    app.use(securityHeaders_1.permissionsPolicyMiddleware);
    app.use((0, cors_1.default)({
        ...config_1.config.cors,
        credentials: true,
        maxAge: 86400,
    }));
    app.use(express_1.default.json({
        limit: '1mb',
        verify: (req, res, buf) => {
            req.rawBody = buf;
        }
    }));
    app.use(express_1.default.urlencoded({
        extended: true,
        limit: '1mb'
    }));
    app.use((0, compression_1.default)());
    app.use(requestLogger_1.requestLoggerMiddleware);
    app.use(requestLogger_1.apiPerformanceMiddleware);
    app.use((0, morgan_1.default)('combined', {
        stream: {
            write: (message) => {
                logger_1.logger.info(message.trim());
            },
        },
        skip: (req) => {
            return req.url.includes('/health') || req.url.includes('/live') || req.url.includes('/ready');
        }
    }));
    app.use(advancedRateLimit_1.defaultAdvancedRateLimit);
    app.set('trust proxy', 1);
    app.use(requestLogger_1.apiPerformanceFinishMiddleware);
    app.use(config_1.config.api.prefix, (0, routes_1.createRouter)(db, io));
    app.use(errorHandler_1.notFoundHandler);
    if (config_1.config.monitoring.sentryDsn) {
        app.use(errorTracking_1.sentryErrorHandler);
    }
    app.use(errorHandler_1.errorHandler);
    return app;
};
exports.createApp = createApp;
const app = (0, exports.createApp)({});
exports.default = app;
//# sourceMappingURL=app.js.map