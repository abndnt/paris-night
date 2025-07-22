"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAirlineAdapter = void 0;
class BaseAirlineAdapter {
    constructor(name, config, rateLimiter, cache) {
        this.name = name;
        this.config = config;
        this.rateLimiter = rateLimiter;
        this.cache = cache;
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalResponseTime: 0
        };
        if (!this.validateConfig()) {
            throw new Error(`Invalid configuration for airline adapter: ${name}`);
        }
    }
    async searchFlights(request) {
        const startTime = Date.now();
        this.stats.totalRequests++;
        try {
            const rateLimitKey = `${this.name}:${Date.now()}`;
            if (!(await this.rateLimiter.checkLimit(rateLimitKey))) {
                throw new Error(`Rate limit exceeded for ${this.name}`);
            }
            const cacheKey = this.cache.generateKey(request.searchCriteria, this.name);
            const cachedResponse = await this.cache.get(cacheKey);
            if (cachedResponse) {
                return cachedResponse;
            }
            const rawResponse = await this.makeApiRequestWithRetry(request);
            const normalizedResponse = await this.normalizeResponse(rawResponse, request);
            await this.cache.set(cacheKey, normalizedResponse, 300);
            await this.rateLimiter.incrementCounter(rateLimitKey);
            this.stats.successfulRequests++;
            this.stats.totalResponseTime += Date.now() - startTime;
            this.stats.lastSuccessfulRequest = new Date();
            return normalizedResponse;
        }
        catch (error) {
            this.stats.failedRequests++;
            const airlineError = this.handleApiError(error);
            this.stats.lastError = airlineError;
            throw airlineError;
        }
    }
    async makeApiRequestWithRetry(request) {
        let lastError;
        for (let attempt = 0; attempt <= this.config.retryConfig.maxRetries; attempt++) {
            try {
                return await this.makeApiRequest(request);
            }
            catch (error) {
                lastError = error;
                if (attempt === this.config.retryConfig.maxRetries || !this.isRetryableError(error)) {
                    break;
                }
                const delay = this.config.retryConfig.initialDelay *
                    Math.pow(this.config.retryConfig.backoffMultiplier, attempt);
                await this.sleep(delay);
            }
        }
        throw lastError;
    }
    async healthCheck() {
        try {
            const testRequest = {
                searchCriteria: {
                    origin: 'LAX',
                    destination: 'JFK',
                    departureDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    passengers: { adults: 1, children: 0, infants: 0 },
                    cabinClass: 'economy',
                    flexible: false
                },
                requestId: `health-check-${Date.now()}`,
                timestamp: new Date()
            };
            await this.makeApiRequest(testRequest);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async getStatus() {
        const errorRate = this.stats.totalRequests > 0
            ? this.stats.failedRequests / this.stats.totalRequests
            : 0;
        const averageResponseTime = this.stats.successfulRequests > 0
            ? this.stats.totalResponseTime / this.stats.successfulRequests
            : 0;
        const status = {
            isHealthy: await this.healthCheck(),
            errorRate,
            averageResponseTime
        };
        if (this.stats.lastSuccessfulRequest) {
            status.lastSuccessfulRequest = this.stats.lastSuccessfulRequest;
        }
        return status;
    }
    validateConfig() {
        return !!(this.config.name &&
            this.config.apiKey &&
            this.config.baseUrl &&
            this.config.timeout > 0 &&
            this.config.rateLimit.requestsPerMinute > 0 &&
            this.config.rateLimit.requestsPerHour > 0 &&
            this.config.retryConfig.maxRetries >= 0 &&
            this.config.retryConfig.backoffMultiplier > 0 &&
            this.config.retryConfig.initialDelay > 0);
    }
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        if (!this.validateConfig()) {
            throw new Error(`Invalid configuration update for airline adapter: ${this.name}`);
        }
    }
    isRetryableError(error) {
        const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
        if (error.response?.status) {
            return retryableStatusCodes.includes(error.response.status);
        }
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            return true;
        }
        return false;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    generateRequestId() {
        return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.BaseAirlineAdapter = BaseAirlineAdapter;
//# sourceMappingURL=BaseAirlineAdapter.js.map