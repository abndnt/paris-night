"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const HealthCheckService_1 = require("../services/HealthCheckService");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.get('/health', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const includeMetrics = req.query.metrics === 'true';
    const startTime = Date.now();
    try {
        const health = await HealthCheckService_1.healthCheckService.checkHealth(includeMetrics);
        const duration = Date.now() - startTime;
        logger_1.logger.info(`Health check completed in ${duration}ms`, {
            status: health.status,
            duration: `${duration}ms`,
            requestId: req.id
        });
        const statusCode = health.status === 'healthy' ? 200 :
            health.status === 'degraded' ? 207 : 503;
        res.status(statusCode).json(health);
    }
    catch (error) {
        logger_1.logger.error('Health check failed', error);
        res.status(500).json({
            status: 'error',
            timestamp: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
router.get('/ready', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const readiness = await HealthCheckService_1.healthCheckService.readinessCheck();
        const statusCode = readiness.ready ? 200 : 503;
        res.status(statusCode).json(readiness);
    }
    catch (error) {
        logger_1.logger.error('Readiness check failed', error, {
            requestId: req.id
        });
        res.status(503).json({
            status: 'not ready',
            ready: false,
            timestamp: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
router.get('/live', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    try {
        const liveness = await HealthCheckService_1.healthCheckService.quickCheck();
        res.status(200).json(liveness);
    }
    catch (error) {
        logger_1.logger.warn('Liveness check error', error, {
            requestId: req.id
        });
        res.status(200).json({
            status: 'alive',
            timestamp: new Date(),
            warning: 'Error occurred during check'
        });
    }
}));
router.get('/health/:service', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { service } = req.params;
    const validServices = ['database', 'redis', 'disk', 'errorTracking'];
    if (!validServices.includes(service)) {
        return res.status(400).json({
            error: `Invalid service: ${service}. Valid services are: ${validServices.join(', ')}`
        });
    }
    try {
        const health = await HealthCheckService_1.healthCheckService.checkHealth(false);
        if (!health.services[service]) {
            return res.status(404).json({
                error: `Service ${service} not found in health check results`
            });
        }
        const serviceHealth = health.services[service];
        const statusCode = serviceHealth.status === 'healthy' ? 200 :
            serviceHealth.status === 'degraded' ? 207 : 503;
        res.status(statusCode).json({
            service,
            ...serviceHealth
        });
    }
    catch (error) {
        logger_1.logger.error(`Health check for service ${service} failed`, error);
        res.status(500).json({
            service,
            status: 'error',
            timestamp: new Date(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}));
exports.default = router;
//# sourceMappingURL=health.js.map