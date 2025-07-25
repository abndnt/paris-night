"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheckService = exports.HealthCheckService = void 0;
const database_1 = require("../config/database");
const errorTracking_1 = require("../utils/errorTracking");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const os_1 = __importDefault(require("os"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class HealthCheckService {
    constructor() {
        this.serviceHealthCache = {};
        this.lastFullCheck = new Date(0);
        this.cacheValidityMs = 30000;
    }
    getSystemMetrics() {
        const totalMemory = os_1.default.totalmem();
        const freeMemory = os_1.default.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = process.memoryUsage();
        return {
            cpuUsage: os_1.default.loadavg()[0],
            memoryUsage: {
                total: totalMemory,
                free: freeMemory,
                used: usedMemory,
                percentUsed: (usedMemory / totalMemory) * 100
            },
            uptime: os_1.default.uptime(),
            processMemory: {
                rss: memoryUsage.rss,
                heapTotal: memoryUsage.heapTotal,
                heapUsed: memoryUsage.heapUsed,
                external: memoryUsage.external
            }
        };
    }
    async checkDatabaseHealth() {
        try {
            const startTime = Date.now();
            const client = await database_1.pool.connect();
            try {
                await client.query('SELECT 1');
                const duration = Date.now() - startTime;
                return {
                    status: 'healthy',
                    details: {
                        responseTime: `${duration}ms`,
                        connections: {
                            total: database_1.pool.totalCount,
                            idle: database_1.pool.idleCount,
                            waiting: database_1.pool.waitingCount
                        }
                    },
                    lastChecked: new Date()
                };
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            logger_1.logger.error('Database health check failed', error);
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error'
                },
                lastChecked: new Date()
            };
        }
    }
    async checkRedisHealth() {
        try {
            const startTime = Date.now();
            await database_1.redisClient.ping();
            const duration = Date.now() - startTime;
            const info = await database_1.redisClient.info();
            const infoLines = info.split('\r\n');
            const metrics = {};
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
        }
        catch (error) {
            logger_1.logger.error('Redis health check failed', error);
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error'
                },
                lastChecked: new Date()
            };
        }
    }
    async checkDiskSpace() {
        try {
            const currentDir = process.cwd();
            const stats = fs_1.default.statSync(currentDir);
            const logsDir = path_1.default.join(currentDir, 'logs');
            let canWrite = false;
            try {
                const testFile = path_1.default.join(logsDir, '.health-check-test');
                fs_1.default.writeFileSync(testFile, 'test', { flag: 'w' });
                fs_1.default.unlinkSync(testFile);
                canWrite = true;
            }
            catch (writeError) {
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
        }
        catch (error) {
            logger_1.logger.error('Disk space check failed', error);
            return {
                status: 'degraded',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error'
                },
                lastChecked: new Date()
            };
        }
    }
    async checkErrorTrackingHealth() {
        try {
            const healthResult = await errorTracking_1.errorTracker.healthCheck();
            return {
                status: healthResult.status === 'healthy' ? 'healthy' : 'degraded',
                details: healthResult.details,
                lastChecked: new Date()
            };
        }
        catch (error) {
            logger_1.logger.error('Error tracking health check failed', error);
            return {
                status: 'degraded',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error'
                },
                lastChecked: new Date()
            };
        }
    }
    isHealthResultValid(service) {
        if (!this.serviceHealthCache[service])
            return false;
        const now = new Date();
        const lastChecked = this.serviceHealthCache[service].lastChecked;
        return (now.getTime() - lastChecked.getTime()) < this.cacheValidityMs;
    }
    async getServiceHealth(service) {
        if (this.isHealthResultValid(service)) {
            return this.serviceHealthCache[service];
        }
        let result;
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
        this.serviceHealthCache[service] = result;
        return result;
    }
    async checkHealth(includeMetrics = false) {
        const now = new Date();
        const services = {};
        services.database = await this.getServiceHealth('database');
        services.redis = await this.getServiceHealth('redis');
        services.disk = await this.getServiceHealth('disk');
        services.errorTracking = await this.getServiceHealth('errorTracking');
        let status = 'healthy';
        for (const serviceKey in services) {
            const serviceHealth = services[serviceKey];
            if (serviceHealth.status === 'unhealthy') {
                status = 'unhealthy';
                break;
            }
            else if (serviceHealth.status === 'degraded' && status === 'healthy') {
                status = 'degraded';
            }
        }
        const response = {
            status,
            version: process.env.npm_package_version || '1.0.0',
            environment: config_1.config.server.nodeEnv,
            timestamp: now,
            uptime: process.uptime(),
            services
        };
        if (includeMetrics) {
            response.systemMetrics = this.getSystemMetrics();
        }
        this.lastFullCheck = now;
        return response;
    }
    async quickCheck() {
        return {
            status: 'alive',
            timestamp: new Date()
        };
    }
    async readinessCheck() {
        try {
            const dbHealth = await this.getServiceHealth('database');
            const redisHealth = await this.getServiceHealth('redis');
            const ready = dbHealth.status !== 'unhealthy' && redisHealth.status !== 'unhealthy';
            return {
                status: ready ? 'ready' : 'not ready',
                ready,
                timestamp: new Date()
            };
        }
        catch (error) {
            logger_1.logger.error('Readiness check failed', error);
            return {
                status: 'not ready',
                ready: false,
                timestamp: new Date()
            };
        }
    }
}
exports.HealthCheckService = HealthCheckService;
exports.healthCheckService = new HealthCheckService();
//# sourceMappingURL=HealthCheckService.js.map