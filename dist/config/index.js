"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    server: {
        port: parseInt(process.env['PORT'] || '3000', 10),
        host: process.env['HOST'] || '0.0.0.0',
        nodeEnv: process.env['NODE_ENV'] || 'development',
    },
    database: {
        url: process.env['DATABASE_URL'] || 'postgresql://flight_user:flight_password@localhost:5432/flight_search_db',
    },
    redis: {
        url: process.env['REDIS_URL'] || 'redis://localhost:6379',
    },
    jwt: {
        secret: process.env['JWT_SECRET'] || 'your-super-secret-jwt-key-change-in-production',
        expiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
    },
    api: {
        prefix: '/api',
        version: 'v1',
    },
    cors: {
        origin: process.env['CORS_ORIGIN'] || '*',
        credentials: true,
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
    },
    logging: {
        level: process.env['LOG_LEVEL'] || 'info',
    },
};
//# sourceMappingURL=index.js.map