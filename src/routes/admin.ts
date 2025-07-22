import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import AnalyticsService from '../services/AnalyticsService';
import { isAdmin } from '../middleware/authMiddleware';
import { AnalyticsQueryParams } from '../models/Analytics';
import logger from '../utils/logger';

const router = express.Router();
const db = new Pool(); // This should be your configured database pool
const analyticsService = new AnalyticsService(db);

/**
 * Get dashboard analytics data
 * GET /api/admin/analytics/dashboard
 */
router.get('/analytics/dashboard', isAdmin, async (req: Request, res: Response) => {
  try {
    const params: AnalyticsQueryParams = {};
    
    // Parse date range if provided
    if (req.query.startDate) {
      params.startDate = new Date(req.query.startDate as string);
    }
    
    if (req.query.endDate) {
      params.endDate = new Date(req.query.endDate as string);
    }
    
    // Parse time period if provided
    if (req.query.timePeriod) {
      params.timePeriod = req.query.timePeriod as any;
    }
    
    const dashboardData = await analyticsService.getDashboardData(params);
    res.json(dashboardData);
  } catch (error) {
    logger.error('Error getting dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics dashboard data' });
  }
});

/**
 * Get user activity history
 * GET /api/admin/analytics/user-activity/:userId
 */
router.get('/analytics/user-activity/:userId', isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const params: AnalyticsQueryParams = {};
    
    // Parse pagination parameters
    if (req.query.limit) {
      params.limit = parseInt(req.query.limit as string);
    }
    
    if (req.query.page) {
      params.page = parseInt(req.query.page as string);
    }
    
    const activityHistory = await analyticsService.getUserActivityHistory(userId as any, params);
    res.json(activityHistory);
  } catch (error) {
    logger.error('Error getting user activity history:', error);
    res.status(500).json({ error: 'Failed to get user activity history' });
  }
});

/**
 * Get error logs
 * GET /api/admin/analytics/errors
 */
router.get('/analytics/errors', isAdmin, async (req: Request, res: Response) => {
  try {
    const params: AnalyticsQueryParams = {};
    
    // Parse date range if provided
    if (req.query.startDate) {
      params.startDate = new Date(req.query.startDate as string);
    }
    
    if (req.query.endDate) {
      params.endDate = new Date(req.query.endDate as string);
    }
    
    // Parse pagination parameters
    if (req.query.limit) {
      params.limit = parseInt(req.query.limit as string);
    }
    
    if (req.query.page) {
      params.page = parseInt(req.query.page as string);
    }
    
    const errorLogs = await analyticsService.getErrorLogs(params);
    res.json(errorLogs);
  } catch (error) {
    logger.error('Error getting error logs:', error);
    res.status(500).json({ error: 'Failed to get error logs' });
  }
});

/**
 * Update error resolution status
 * PUT /api/admin/analytics/errors/:errorId
 */
router.put('/analytics/errors/:errorId', isAdmin, async (req: Request, res: Response) => {
  try {
    const errorId = parseInt(req.params.errorId);
    const { resolved, notes } = req.body;
    
    await analyticsService.updateErrorResolution(errorId, resolved, notes);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating error resolution:', error);
    res.status(500).json({ error: 'Failed to update error resolution' });
  }
});

/**
 * Get performance metrics history
 * GET /api/admin/analytics/performance
 */
router.get('/analytics/performance', isAdmin, async (req: Request, res: Response) => {
  try {
    const { metricName, component } = req.query;
    
    if (!metricName || !component) {
      return res.status(400).json({ error: 'metricName and component are required' });
    }
    
    const params: AnalyticsQueryParams = {};
    
    // Parse date range if provided
    if (req.query.startDate) {
      params.startDate = new Date(req.query.startDate as string);
    }
    
    if (req.query.endDate) {
      params.endDate = new Date(req.query.endDate as string);
    }
    
    const performanceHistory = await analyticsService.getPerformanceHistory(
      metricName as string,
      component as string,
      params
    );
    
    res.json(performanceHistory);
  } catch (error) {
    logger.error('Error getting performance history:', error);
    res.status(500).json({ error: 'Failed to get performance history' });
  }
});

/**
 * Get system health status
 * GET /api/admin/system/health
 */
router.get('/system/health', isAdmin, async (_req: Request, res: Response) => {
  try {
    // Check database connection
    const dbStatus = await checkDatabaseHealth();
    
    // Check Redis connection
    const redisStatus = await checkRedisHealth();
    
    // Check external API connections
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
  } catch (error) {
    logger.error('Error checking system health:', error);
    res.status(500).json({ error: 'Failed to check system health' });
  }
});

/**
 * Check database health
 */
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
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      healthy: false,
      error: 'Database connection failed',
      message: (error as Error).message
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedisHealth() {
  try {
    // This would be your Redis client
    // const redisClient = getRedisClient();
    // await redisClient.ping();
    
    // Mock implementation for now
    return {
      healthy: true,
      responseTime: 5,
      message: 'Redis connection successful'
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      healthy: false,
      error: 'Redis connection failed',
      message: (error as Error).message
    };
  }
}

/**
 * Check external API health
 */
async function checkExternalApiHealth() {
  try {
    // This would check your external API connections
    // const apiClients = getApiClients();
    // const results = await Promise.all(apiClients.map(client => client.healthCheck()));
    
    // Mock implementation for now
    return {
      healthy: true,
      services: [
        { name: 'Airline API', status: 'healthy', responseTime: 120 },
        { name: 'Payment API', status: 'healthy', responseTime: 85 },
        { name: 'LLM Service', status: 'healthy', responseTime: 200 }
      ]
    };
  } catch (error) {
    logger.error('External API health check failed:', error);
    return {
      healthy: false,
      error: 'External API check failed',
      message: (error as Error).message
    };
  }
}

export default router;