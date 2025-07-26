import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { healthCheckService } from '../services/HealthCheckService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Comprehensive health check endpoint
 * GET /health
 */
router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const includeMetrics = req.query['metrics'] === 'true';
  const startTime = Date.now();
  
  try {
    const health = await healthCheckService.checkHealth(includeMetrics);
    const duration = Date.now() - startTime;
    
    // Log health check result
    logger.info(`Health check completed in ${duration}ms`, {
      status: health.status,
      duration: `${duration}ms`,
      requestId: (req as any).id
    });
    
    // Set appropriate status code based on health status
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 207 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed', error as Error);
    
    res.status(500).json({
      status: 'error',
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * Readiness check endpoint for Kubernetes/container orchestration
 * GET /ready
 */
router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  try {
    const readiness = await healthCheckService.readinessCheck();
    
    const statusCode = readiness.ready ? 200 : 503;
    res.status(statusCode).json(readiness);
  } catch (error) {
    logger.error('Readiness check failed', error as Error, {
      requestId: (req as any).id
    });
    
    res.status(503).json({
      status: 'not ready',
      ready: false,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

/**
 * Liveness check endpoint for Kubernetes/container orchestration
 * GET /live
 */
router.get('/live', asyncHandler(async (req: Request, res: Response) => {
  try {
    const liveness = await healthCheckService.quickCheck();
    res.status(200).json(liveness);
  } catch (error) {
    // Even if there's an error, we return 200 for liveness
    // as long as the application is running and can respond
    logger.warn('Liveness check error', error as Error, {
      requestId: (req as any).id
    });
    
    res.status(200).json({
      status: 'alive',
      timestamp: new Date(),
      warning: 'Error occurred during check'
    });
  }
}));

/**
 * Service-specific health check endpoint
 * GET /health/:service
 */
router.get('/health/:service', asyncHandler(async (req: Request, res: Response) => {
  const { service } = req.params;
  const validServices = ['database', 'redis', 'disk', 'errorTracking'];
  
  if (!service || !validServices.includes(service)) {
    return res.status(400).json({
      error: `Invalid service: ${service}. Valid services are: ${validServices.join(', ')}`
    });
  }
  
  try {
    const health = await healthCheckService.checkHealth(false);
    
    if (!health.services[service]) {
      return res.status(404).json({
        error: `Service ${service} not found in health check results`
      });
    }
    
    const serviceHealth = health.services[service];
    const statusCode = serviceHealth && serviceHealth.status === 'healthy' ? 200 : 
                       serviceHealth && serviceHealth.status === 'degraded' ? 207 : 503;
    
    return res.status(statusCode).json({
      service,
      ...serviceHealth
    });
  } catch (error) {
    logger.error(`Health check for service ${service} failed`, error as Error);
    
    return res.status(500).json({
      service,
      status: 'error',
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;