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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const errorTracking = __importStar(require("./utils/errorTracking.simple"));
const app = (0, express_1.default)();
errorTracking.initializeErrorTracking();
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)(config_1.config.cors));
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config_1.config.server.nodeEnv,
        version: '1.0.0'
    });
});
app.post('/api/flights/search', (req, res) => {
    const { origin, destination, departureDate, passengers = 1 } = req.body;
    const mockFlights = [
        {
            id: 'FL001',
            airline: 'Mock Airlines',
            flightNumber: 'MA123',
            origin,
            destination,
            departureTime: `${departureDate}T08:00:00Z`,
            arrivalTime: `${departureDate}T12:00:00Z`,
            price: 299.99,
            currency: 'USD',
            duration: 240,
            layovers: 0
        },
        {
            id: 'FL002',
            airline: 'Test Airways',
            flightNumber: 'TA456',
            origin,
            destination,
            departureTime: `${departureDate}T14:00:00Z`,
            arrivalTime: `${departureDate}T18:30:00Z`,
            price: 349.99,
            currency: 'USD',
            duration: 270,
            layovers: 1
        }
    ];
    res.json({
        success: true,
        flights: mockFlights,
        totalResults: mockFlights.length,
        searchCriteria: { origin, destination, departureDate, passengers }
    });
});
app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    res.json({
        success: true,
        response: `I understand you're looking for flights. You said: "${message}". This is a mock response for testing.`,
        timestamp: new Date().toISOString()
    });
});
app.use(errorTracking.sentryErrorHandler);
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});
const port = config_1.config.server.port;
const host = config_1.config.server.host;
app.listen(port, host, () => {
    logger_1.logger.info(`🚀 Flight Search SaaS Server running on http://${host}:${port}`);
    logger_1.logger.info(`📊 Environment: ${config_1.config.server.nodeEnv}`);
    logger_1.logger.info(`🔍 Health check: http://${host}:${port}/api/health`);
    logger_1.logger.info(`✈️  Flight search: POST http://${host}:${port}/api/flights/search`);
    logger_1.logger.info(`💬 Chat: POST http://${host}:${port}/api/chat`);
});
exports.default = app;
//# sourceMappingURL=server.simple.js.map