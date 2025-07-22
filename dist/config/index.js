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
exports.config = void 0;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
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
    llm: {
        baseUrl: process.env['REQUESTY_BASE_URL'] || 'https://router.requesty.ai/v1',
        apiKey: process.env['REQUESTY_API_KEY'] || 'your-requesty-api-key',
        model: process.env['LLM_MODEL'] || 'openai/gpt-4o',
        fallbackModel: process.env['LLM_FALLBACK_MODEL'] || 'openai/gpt-3.5-turbo',
        referer: process.env['LLM_REFERER'] || 'https://flight-search-saas.com',
        title: process.env['LLM_TITLE'] || 'Flight Search SaaS',
        enableFallback: process.env['ENABLE_LLM_FALLBACK'] !== 'false',
    },
};
//# sourceMappingURL=index.js.map