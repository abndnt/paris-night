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
exports.loggers = exports.logger = void 0;
const winston = __importStar(require("winston"));
const config_1 = require("../config");
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'blue',
    },
};
winston.addColors(customLevels.colors);
const structuredFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.errors({ stack: true }), winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }), winston.format.json());
const consoleFormat = winston.format.combine(winston.format.timestamp({ format: 'HH:mm:ss' }), winston.format.colorize({ all: true }), winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
}));
exports.logger = winston.createLogger({
    level: config_1.config.logging.level,
    levels: customLevels.levels,
    format: structuredFormat,
    defaultMeta: {
        service: 'flight-search-saas',
        environment: config_1.config.server.nodeEnv,
        version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880,
            maxFiles: 5,
            tailable: true
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880,
            maxFiles: 5,
            tailable: true
        }),
        new winston.transports.File({
            filename: 'logs/access.log',
            level: 'http',
            maxsize: 5242880,
            maxFiles: 5,
            tailable: true
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
    ],
    rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' })
    ],
});
if (config_1.config.server.nodeEnv !== 'production') {
    exports.logger.add(new winston.transports.Console({
        format: consoleFormat,
        level: 'debug'
    }));
}
exports.loggers = {
    request: (req, res, duration) => {
        exports.logger.http('HTTP Request', {
            method: req.method,
            url: req.url,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            statusCode: res.statusCode,
            duration: duration ? `${duration}ms` : undefined,
            userId: req.user?.id,
            requestId: req.id,
        });
    },
    error: (message, error, context) => {
        exports.logger.error(message, {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
            ...context,
        });
    },
    business: (event, data) => {
        exports.logger.info(`Business Event: ${event}`, {
            event,
            ...data,
        });
    },
    performance: (operation, duration, metadata) => {
        exports.logger.info(`Performance: ${operation}`, {
            operation,
            duration: `${duration}ms`,
            ...metadata,
        });
    },
    security: (event, data) => {
        exports.logger.warn(`Security Event: ${event}`, {
            event,
            ...data,
        });
    },
    database: (operation, table, duration, error) => {
        const level = error ? 'error' : 'debug';
        exports.logger.log(level, `Database: ${operation}`, {
            operation,
            table,
            duration: duration ? `${duration}ms` : undefined,
            error: error ? {
                name: error.name,
                message: error.message,
            } : undefined,
        });
    },
    externalApi: (service, operation, duration, error) => {
        const level = error ? 'error' : 'debug';
        exports.logger.log(level, `External API: ${service}`, {
            service,
            operation,
            duration: duration ? `${duration}ms` : undefined,
            error: error ? {
                name: error.name,
                message: error.message,
            } : undefined,
        });
    },
};
//# sourceMappingURL=logger.js.map