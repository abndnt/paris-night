"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.get('/health', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database: 'unknown',
            redis: 'unknown',
        },
    };
    try {
        const client = await database_1.pool.connect();
        await client.query('SELECT 1');
        client.release();
        health.services.database = 'healthy';
    }
    catch (error) {
        health.services.database = 'unhealthy';
        health.status = 'degraded';
    }
    try {
        await database_1.redisClient.ping();
        health.services.redis = 'healthy';
    }
    catch (error) {
        health.services.redis = 'unhealthy';
        health.status = 'degraded';
    }
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
}));
router.get('/ready', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    try {
        const client = await database_1.pool.connect();
        await client.query('SELECT 1');
        client.release();
        await database_1.redisClient.ping();
        res.status(200).json({
            status: 'ready',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'not ready',
            timestamp: new Date().toISOString(),
            error: 'Services not available',
        });
    }
}));
router.get('/live', (_req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
exports.default = router;
//# sourceMappingURL=health.js.map