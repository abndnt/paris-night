"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlightSearchOrchestrator = void 0;
const SearchService_1 = require("./SearchService");
const logger_1 = require("../utils/logger");
class FlightSearchOrchestrator {
    constructor(database, redisClient, adapterFactory, socketIO, options = {}) {
        this.activeSearches = new Map();
        this.searchService = new SearchService_1.SearchService(database);
        this.adapterFactory = adapterFactory;
        this.redisClient = redisClient;
        this.socketIO = socketIO;
        this.options = {
            maxConcurrentSearches: options.maxConcurrentSearches || 5,
            searchTimeout: options.searchTimeout || 30000,
            enableRealTimeUpdates: options.enableRealTimeUpdates ?? true,
            cacheResults: options.cacheResults ?? true,
            cacheTtl: options.cacheTtl || 300
        };
    }
    async searchFlights(searchData, airlines = ['american-airlines', 'delta-airlines'], searchOptions = {}) {
        const search = await this.searchService.createFlightSearch(searchData);
        const searchId = search.id;
        const progress = {
            searchId,
            status: 'initializing',
            progress: 0,
            completedSources: [],
            totalSources: airlines.length,
            results: [],
            errors: [],
            startTime: new Date()
        };
        this.activeSearches.set(searchId, progress);
        this.emitSearchUpdate(searchId, progress);
        try {
            if (this.activeSearches.size > this.options.maxConcurrentSearches) {
                throw new Error('Maximum concurrent searches exceeded. Please try again later.');
            }
            progress.status = 'searching';
            progress.progress = 10;
            this.emitSearchUpdate(searchId, progress);
            const searchPromises = airlines.map(airline => this.searchSingleAirline(airline, search.searchCriteria, searchId));
            const searchResults = await Promise.allSettled(searchPromises.map(promise => this.withTimeout(promise, this.options.searchTimeout)));
            const allResults = [];
            const sources = [];
            const errors = [];
            searchResults.forEach((result, index) => {
                const airline = airlines[index];
                if (result.status === 'fulfilled' && result.value) {
                    allResults.push(...result.value.flights);
                    sources.push(airline);
                    progress.completedSources.push(airline);
                }
                else {
                    const error = result.status === 'rejected'
                        ? result.reason?.message || 'Unknown error'
                        : 'No results returned';
                    errors.push(`${airline}: ${error}`);
                    progress.errors.push(`${airline}: ${error}`);
                }
            });
            progress.status = 'aggregating';
            progress.progress = 80;
            progress.results = allResults;
            this.emitSearchUpdate(searchId, progress);
            let filteredResults = allResults;
            if (searchOptions.includeNearbyAirports) {
                logger_1.logger.info(`Nearby airports option enabled for search ${searchId}`);
            }
            const sortBy = searchOptions.sortBy || 'price';
            const sortOrder = searchOptions.sortOrder || 'asc';
            const sortedResults = this.searchService.sortFlightResults(filteredResults, sortBy, sortOrder);
            const updateData = {
                results: sortedResults,
                status: 'completed'
            };
            await this.searchService.updateFlightSearch(searchId, updateData);
            progress.status = 'completed';
            progress.progress = 100;
            progress.results = sortedResults;
            progress.estimatedCompletion = new Date();
            this.emitSearchUpdate(searchId, progress);
            if (this.options.cacheResults) {
                await this.cacheSearchResults(searchId, sortedResults);
            }
            const searchTime = Date.now() - progress.startTime.getTime();
            const result = {
                searchId,
                results: sortedResults,
                totalResults: sortedResults.length,
                searchTime,
                sources,
                cached: false,
                sortBy,
                sortOrder
            };
            this.activeSearches.delete(searchId);
            logger_1.logger.info(`Flight search completed: ${searchId}, ${result.totalResults} results from ${sources.length} sources in ${searchTime}ms`);
            return result;
        }
        catch (error) {
            progress.status = 'failed';
            progress.errors.push(error instanceof Error ? error.message : 'Unknown error');
            this.emitSearchUpdate(searchId, progress);
            await this.searchService.updateFlightSearch(searchId, { status: 'error' });
            this.activeSearches.delete(searchId);
            logger_1.logger.error(`Flight search failed: ${searchId}`, error);
            throw error;
        }
    }
    async filterSearchResults(searchId, filters) {
        const search = await this.searchService.getFlightSearch(searchId);
        if (!search) {
            throw new Error('Search not found');
        }
        if (!search.results || search.results.length === 0) {
            throw new Error('No results available to filter');
        }
        const filteredResults = this.searchService.filterFlightResults(search.results, filters);
        if (this.options.enableRealTimeUpdates) {
            this.socketIO?.emit('search:filtered', {
                searchId,
                filters,
                originalCount: search.results.length,
                filteredCount: filteredResults.length,
                results: filteredResults
            });
        }
        return {
            searchId,
            results: filteredResults,
            totalResults: filteredResults.length,
            searchTime: 0,
            sources: [],
            cached: true,
            filters
        };
    }
    async sortSearchResults(searchId, sortBy = 'price', sortOrder = 'asc') {
        const search = await this.searchService.getFlightSearch(searchId);
        if (!search) {
            throw new Error('Search not found');
        }
        if (!search.results || search.results.length === 0) {
            throw new Error('No results available to sort');
        }
        const sortedResults = this.searchService.sortFlightResults(search.results, sortBy, sortOrder);
        if (this.options.enableRealTimeUpdates) {
            this.socketIO?.emit('search:sorted', {
                searchId,
                sortBy,
                sortOrder,
                results: sortedResults
            });
        }
        return {
            searchId,
            results: sortedResults,
            totalResults: sortedResults.length,
            searchTime: 0,
            sources: [],
            cached: true,
            sortBy,
            sortOrder
        };
    }
    getSearchProgress(searchId) {
        return this.activeSearches.get(searchId) || null;
    }
    getActiveSearches() {
        return Array.from(this.activeSearches.values());
    }
    async cancelSearch(searchId) {
        const progress = this.activeSearches.get(searchId);
        if (!progress) {
            return false;
        }
        progress.status = 'failed';
        progress.errors.push('Search cancelled by user');
        this.emitSearchUpdate(searchId, progress);
        await this.searchService.updateFlightSearch(searchId, { status: 'error' });
        this.activeSearches.delete(searchId);
        logger_1.logger.info(`Search cancelled: ${searchId}`);
        return true;
    }
    async searchSingleAirline(airlineName, searchCriteria, searchId) {
        try {
            logger_1.logger.info(`Starting search for ${airlineName} - Search ID: ${searchId}`);
            const adapter = await this.adapterFactory.getAdapter(airlineName, 'mock');
            const request = {
                searchCriteria,
                requestId: `${searchId}-${airlineName}`,
                timestamp: new Date()
            };
            const response = await adapter.searchFlights(request);
            logger_1.logger.info(`Completed search for ${airlineName} - ${response.flights.length} results`);
            return response;
        }
        catch (error) {
            logger_1.logger.error(`Search failed for ${airlineName}:`, error);
            throw error;
        }
    }
    withTimeout(promise, timeoutMs) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Search timeout')), timeoutMs))
        ]);
    }
    emitSearchUpdate(searchId, progress) {
        if (this.options.enableRealTimeUpdates && this.socketIO) {
            this.socketIO.emit('search:progress', {
                searchId,
                status: progress.status,
                progress: progress.progress,
                completedSources: progress.completedSources,
                totalSources: progress.totalSources,
                resultsCount: progress.results.length,
                errors: progress.errors,
                estimatedCompletion: progress.estimatedCompletion
            });
        }
    }
    async cacheSearchResults(searchId, results) {
        try {
            const cacheKey = `search_results:${searchId}`;
            const cacheData = {
                searchId,
                results,
                timestamp: new Date(),
                ttl: this.options.cacheTtl
            };
            await this.redisClient.setEx(cacheKey, this.options.cacheTtl, JSON.stringify(cacheData));
            logger_1.logger.debug(`Cached search results for ${searchId}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to cache search results:', error);
        }
    }
    async healthCheck() {
        try {
            const adapterHealth = await this.adapterFactory.getAllAdapterHealth();
            let cacheHealth = false;
            try {
                await this.redisClient.ping();
                cacheHealth = true;
            }
            catch (error) {
                logger_1.logger.error('Cache health check failed:', error);
            }
            const healthyAdapters = Object.values(adapterHealth).filter(health => health.status === 'healthy').length;
            const totalAdapters = Object.keys(adapterHealth).length;
            let status = 'healthy';
            if (healthyAdapters === 0) {
                status = 'unhealthy';
            }
            else if (healthyAdapters < totalAdapters || !cacheHealth) {
                status = 'degraded';
            }
            return {
                status,
                activeSearches: this.activeSearches.size,
                adapterHealth,
                cacheHealth
            };
        }
        catch (error) {
            logger_1.logger.error('Health check failed:', error);
            return {
                status: 'unhealthy',
                activeSearches: this.activeSearches.size,
                adapterHealth: {},
                cacheHealth: false
            };
        }
    }
    async cleanup() {
        for (const searchId of Array.from(this.activeSearches.keys())) {
            await this.cancelSearch(searchId);
        }
        await this.adapterFactory.cleanup();
    }
}
exports.FlightSearchOrchestrator = FlightSearchOrchestrator;
//# sourceMappingURL=FlightSearchOrchestrator.js.map