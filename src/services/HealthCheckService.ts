import { pool, redisClient } from '../config/database';
import { errorTracker } from '../utils/errorTracking';
import { logger } from '../utils/logger';
import { config } from '../config';
import os from 'os';
import fs from 'fs';
import path from 'path';

// Health status types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

// Service health check result
export interface ServiceHealth {
  status: HealthStatus;
  details?: Record<string, any>;
  lastChecked: Date;
}

// System health metrics
export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: {
    total: number;
    free: number;
    used: number;
    percentUsed: number;
  };
  uptime: number;
  processMemory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

// Complete health check response
export interface HealthCheckResponse {
  status: HealthStatus;
  version: string;
  environment: string;
  timestamp: Date;
  uptime: number;
  services: Record<string, ServiceHealth>;
  systemMetrics?: SystemMetrics;
}

/**
 * Service for performing health checks on various system components
 */
export class HealthCheckService {
  private serviceHealthCache: Record<string, ServiceHealth> = {};
  private lastFullCheck: Date = new Date(0); // Initialize to epoch
  private readonly cacheValidityMs = 30000; // Cache health results for 30 seconds

  /**
   * Get system metrics
   */
  private getSystemMetrics(): SystemMetrics {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    const memoryUsage = process.memoryUsage();
    
    return {
      cpuUsage: os.loadavg()[0], // 1 minute load average
      memoryUsage: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        percentUsed: (usedMemory / totalMemory) * 100
      },
      uptime: os.uptime(),
      processMemory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external
      }
    };
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      const client = await pool.connect();
      
      try {
        await client.query('SELECT 1');
        const duration = Date.now() - startTime;
        
        return {
          status: 'healthy',
          details: {
            responseTime: `${duration}ms`,
            connections: {
              total: pool.totalCount,
              idle: pool.idleCount,
              waiting: pool.waitingCount
            }
          },
          lastChecked: new Date()
        };
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Database health check failed', error as Error);
      
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check Redis health
   */
  private async checkRedisHealth(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();
      await redisClient.ping();
      const duration = Date.now() - startTime;
      
      // Get Redis info for more detailed metrics
      const info = await redisClient.info();
      const infoLines = info.split('\r\n');
      const metrics: Record<string, string> = {};
      
      infoLines.forEach(line => {
        const parts = line.split(':');
        if (parts.length === 2) {
          metrics[parts[0]] = parts[1];
        }
      });
      
      return {
        status: 'healthy',
        details: {
          responseTime: `${duration}ms`,
          usedMemory: metrics['used_memory_human'],
          clients: metrics['connected_clients'],
          uptime: metrics['uptime_in_seconds']
        },
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Redis health check failed', error as Error);
      
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check disk space
   */
  private async checkDiskSpace(): Promise<ServiceHealth> {
    try {
      // Get the current directory
      const currentDir = process.cwd();
      
      // Use fs.statfs to get disk information (Node.js doesn't have a built-in way)
      // This is a simplified approach - in production you might want to use a package like 'diskusage'
      const stats = fs.statSync(currentDir);
      
      // Check if we can write to the logs directory
      const logsDir = path.join(currentDir, 'logs');
      let canWrite = false;
      
      try {
        // Try to write a test file
        const testFile = path.join(logsDir, '.health-check-test');
        fs.writeFileSync(testFile, 'test', { flag: 'w' });
        fs.unlinkSync(testFile);
        canWrite = true;
      } catch (writeError) {
        canWrite = false;
      }
      
      return {
        status: canWrite ? 'healthy' : 'degraded',
        details: {
          directory: currentDir,
          canWrite,
          size: stats.size,
          mode: stats.mode,
          uid: stats.uid,
          gid: stats.gid
        },
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Disk space check failed', error as Error);
      
      return {
        status: 'degraded',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check error tracking service health
   */
  private async checkErrorTrackingHealth(): Promise<ServiceHealth> {
    try {
      const healthResult = await errorTracker.healthCheck();
      
      return {
        status: healthResult.status === 'healthy' ? 'healthy' : 'degraded',
        details: healthResult.details,
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Error tracking health check failed', error as Error);
      
      return {
        status: 'degraded', // Degraded instead of unhealthy since this is not critical
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        lastChecked: new Date()
      };
    }
  }

  /**
   * Check if a service health result is still valid
   */
  private isHealthResultValid(service: string): boolean {
    if (!this.serviceHealthCache[service]) return false;
    
    const now = new Date();
    const lastChecked = this.serviceHealthCache[service].lastChecked;
    
    return (now.getTime() - lastChecked.getTime()) < this.cacheValidityMs;
  }

  /**
   * Get cached or fresh health check for a service
   */
  private async getServiceHealth(service: string): Promise<ServiceHealth> {
    // Return cached result if valid
    if (this.isHealthResultValid(service)) {
      return this.serviceHealthCache[service];
    }
    
    // Otherwise perform a fresh check
    let result: ServiceHealth;
    
    switch (service) {
      case 'database':
        result = await this.checkDatabaseHealth();
        break;
      case 'redis':
        result = await this.checkRedisHealth();
        break;
      case 'disk':
        result = await this.checkDiskSpace();
        break;
      case 'errorTracking':
        result = await this.checkErrorTrackingHealth();
        break;
      default:
        result = {
          status: 'unhealthy',
          details: { error: `Unknown service: ${service}` },
          lastChecked: new Date()
        };
    }
    
    // Cache the result
    this.serviceHealthCache[service] = result;
    return result;
  }

  /**
   * Perform a comprehensive health check of all services
   */
  public async checkHealth(includeMetrics = false): Promise<HealthCheckResponse> {
    const now = new Date();
    const services: Record<string, ServiceHealth> = {};
    
    // Check all core services
    services.database = await this.getServiceHealth('database');
    services.redis = await this.getServiceHealth('redis');
    services.disk = await this.getServiceHealth('disk');
    services.errorTracking = await this.getServiceHealth('errorTracking');
    
    // Determine overall status (healthy only if all services are healthy)
    let status: HealthStatus = 'healthy';
    
    for (const serviceKey in services) {
      const serviceHealth = services[serviceKey];
      
      if (serviceHealth.status === 'unhealthy') {
        status = 'unhealthy';
        break;
      } else if (serviceHealth.status === 'degraded' && status === 'healthy') {
        status = 'degraded';
      }
    }
    
    // Create response
    const response: HealthCheckResponse = {
      status,
      version: process.env.npm_package_version || '1.0.0',
      environment: config.server.nodeEnv,
      timestamp: now,
      uptime: process.uptime(),
      services
    };
    
    // Add system metrics if requested
    if (includeMetrics) {
      response.systemMetrics = this.getSystemMetrics();
    }
    
    this.lastFullCheck = now;
    return response;
  }

  /**
   * Quick health check for liveness probe
   */
  public async quickCheck(): Promise<{ status: string; timestamp: Date }> {
    return {
      status: 'alive',
      timestamp: new Date()
    };
  }

  /**
   * Readiness check to verify if the application is ready to serve traffic
   */
  public async readinessCheck(): Promise<{ status: string; ready: boolean; timestamp: Date }> {
    try {
      // Check only critical services for readiness
      const dbHealth = await this.getServiceHealth('database');
      const redisHealth = await this.getServiceHealth('redis');
      
      const ready = dbHealth.status !== 'unhealthy' && redisHealth.status !== 'unhealthy';
      
      return {
        status: ready ? 'ready' : 'not ready',
        ready,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Readiness check failed', error as Error);
      
      return {
        status: 'not ready',
        ready: false,
        timestamp: new Date()
      };
    }
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();