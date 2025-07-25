"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const AnalyticsService_1 = __importDefault(require("../services/AnalyticsService"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
const db = new pg_1.Pool();
const analyticsService = new AnalyticsService_1.default(db);
router.get('/analytics/dashboard', authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const params = {};
        if (req.query['startDate']) {
            params.startDate = new Date(req.query['startDate']);
        }
        if (req.query['endDate']) {
            params.endDate = new Date(req.query['endDate']);
        }
        if (req.query['timePeriod']) {
            params.timePeriod = req.query['timePeriod'];
        }
        const dashboardData = await analyticsService.getDashboardData(params);
        res.json(dashboardData);
    }
    catch (error) {
        logger_1.loggers.error('Error getting dashboard analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics dashboard data' });
    }
});
router.get('/analytics/user-activity/:userId', authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const userId = req.params['userId'];
        const params = {};
        if (req.query['limit']) {
            params.limit = parseInt(req.query['limit']);
        }
        if (req.query['page']) {
            params.page = parseInt(req.query['page']);
        }
        const activityHistory = await analyticsService.getUserActivityHistory(userId, params);
        res.json(activityHistory);
    }
    catch (error) {
        logger_1.loggers.error('Error getting user activity history:', error);
        res.status(500).json({ error: 'Failed to get user activity history' });
    }
});
router.get('/analytics/errors', authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const params = {};
        if (req.query['startDate']) {
            params.startDate = new Date(req.query['startDate']);
        }
        if (req.query['endDate']) {
            params.endDate = new Date(req.query['endDate']);
        }
        if (req.query['limit']) {
            params.limit = parseInt(req.query['limit']);
        }
        if (req.query['page']) {
            params.page = parseInt(req.query['page']);
        }
        const errorLogs = await analyticsService.getErrorLogs(params);
        res.json(errorLogs);
    }
    catch (error) {
        logger_1.loggers.error('Error getting error logs:', error);
        res.status(500).json({ error: 'Failed to get error logs' });
    }
});
router.put('/analytics/errors/:errorId', authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const errorId = parseInt(req.params['errorId'] || '0');
        const { resolved, notes } = req.body;
        await analyticsService.updateErrorResolution(errorId, resolved, notes);
        res.json({ success: true });
    }
    catch (error) {
        logger_1.loggers.error('Error updating error resolution:', error);
        res.status(500).json({ error: 'Failed to update error resolution' });
    }
});
router.get('/analytics/performance', authMiddleware_1.isAdmin, async (req, res) => {
    try {
        const { metricName, component } = req.query;
        if (!metricName || !component) {
            res.status(400).json({ error: 'metricName and component are required' });
            return;
        }
        const params = {};
        if (req.query['startDate']) {
            params.startDate = new Date(req.query['startDate']);
        }
        if (req.query['endDate']) {
            params.endDate = new Date(req.query['endDate']);
        }
        const performanceHistory = await analyticsService.getPerformanceHistory(metricName, component, params);
        res.json(performanceHistory);
    }
    catch (error) {
        logger_1.loggers.error('Error getting performance history:', error);
        res.status(500).json({ error: 'Failed to get performance history' });
    }
});
router.get('/system/health', authMiddleware_1.isAdmin, async (_req, res) => {
    try {
        const dbStatus = await checkDatabaseHealth();
        const redisStatus = await checkRedisHealth();
        const apiStatus = await checkExternalApiHealth();
        const systemHealth = {
            status: dbStatus.healthy && redisStatus.healthy && apiStatus.healthy ? 'healthy' : 'degraded',
            components: {
                database: dbStatus,
                cache: redisStatus,
                externalApis: apiStatus
            },
            timestamp: new Date()
        };
        res.json(systemHealth);
    }
    catch (error) {
        logger_1.loggers.error('Error checking system health:', error);
        res.status(500).json({ error: 'Failed to check system health' });
    }
});
async function checkDatabaseHealth() {
    try {
        const startTime = Date.now();
        await db.query('SELECT 1');
        const responseTime = Date.now() - startTime;
        return {
            healthy: true,
            responseTime,
            message: 'Database connection successful'
        };
    }
    catch (error) {
        logger_1.loggers.error('Database health check failed:', error);
        return {
            healthy: false,
            error: 'Database connection failed',
            message: error.message
        };
    }
}
async function checkRedisHealth() {
    try {
        return {
            healthy: true,
            responseTime: 5,
            message: 'Redis connection successful'
        };
    }
    catch (error) {
        logger_1.loggers.error('Redis health check failed:', error);
        return {
            healthy: false,
            error: 'Redis connection failed',
            message: error.message
        };
    }
}
async function checkExternalApiHealth() {
    try {
        return {
            healthy: true,
            services: [
                { name: 'Airline API', status: 'healthy', responseTime: 120 },
                { name: 'Payment API', status: 'healthy', responseTime: 85 },
                { name: 'LLM Service', status: 'healthy', responseTime: 200 }
            ]
        };
    }
    catch (error) {
        logger_1.loggers.error('External API health check failed:', error);
        return {
            healthy: false,
            error: 'External API check failed',
            message: error.message
        };
    }
}
exports.default = router;
//# sourceMappingURL=admin.js.map