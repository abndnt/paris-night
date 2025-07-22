import * as winston from 'winston';
import { config } from '../config';

// Define custom log levels
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

// Add colors to winston
winston.addColors(customLevels.colors);

// Define structured log format
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
  })
);

// Create logger instance with enhanced configuration
export const logger = winston.createLogger({
  level: config.logging.level,
  levels: customLevels.levels,
  format: structuredFormat,
  defaultMeta: { 
    service: 'flight-search-saas',
    environment: config.server.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Error logs
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Combined logs
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // HTTP access logs
    new winston.transports.File({ 
      filename: 'logs/access.log', 
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
});

// Add console transport for non-production environments
if (config.server.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Structured logging helpers
export const loggers = {
  // Request logging
  request: (req: any, res: any, duration?: number) => {
    logger.http('HTTP Request', {
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

  // Error logging with context
  error: (message: string, error: Error, context?: Record<string, any>) => {
    logger.error(message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    });
  },

  // Business logic logging
  business: (event: string, data: Record<string, any>) => {
    logger.info(`Business Event: ${event}`, {
      event,
      ...data,
    });
  },

  // Performance logging
  performance: (operation: string, duration: number, metadata?: Record<string, any>) => {
    logger.info(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...metadata,
    });
  },

  // Security logging
  security: (event: string, data: Record<string, any>) => {
    logger.warn(`Security Event: ${event}`, {
      event,
      ...data,
    });
  },

  // Database logging
  database: (operation: string, table?: string, duration?: number, error?: Error) => {
    const level = error ? 'error' : 'debug';
    logger.log(level, `Database: ${operation}`, {
      operation,
      table,
      duration: duration ? `${duration}ms` : undefined,
      error: error ? {
        name: error.name,
        message: error.message,
      } : undefined,
    });
  },

  // External API logging
  externalApi: (service: string, operation: string, duration?: number, error?: Error) => {
    const level = error ? 'error' : 'debug';
    logger.log(level, `External API: ${service}`, {
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