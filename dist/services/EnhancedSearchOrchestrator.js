"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedSearchOrchestrator = void 0;
const FlightSearchOrchestrator_1 = require("./FlightSearchOrchestrator");
const RouteOptimizationService_1 = require("./RouteOptimizationService");
const AdvancedSearchFilters_1 = require("./AdvancedSearchFilters");
const logger_1 = require("../utils/logger");
class EnhancedSearchOrchestrator extends FlightSearchOrchestrator_1.FlightSearchOrchestrator {
    constructor(database, redisClient, adapterFactory, socketIO, options = {}) {
        super(database, redisClient, adapterFactory, socketIO, options);
        this.searchAnalytics = new Map();
        this.routeOptimizer = new RouteOptimizationService_1.RouteOptimizationService();
        this.advancedFilters = new AdvancedSearchFilters_1.AdvancedSearchFilters();
    }
    async enhancedSearchFlights(searchData, options = {}) {
        const startTime = Date.now();
        logger_1.logger.info(`Starting enhanced flight search for ${searchData.searchCriteria.origin} to ${searchData.searchCriteria.destination}`);
        const analytics = {
            searchId: '',
            originalCriteria: searchData.searchCriteria,
            totalFlightsFound: 0,
            filtersApplied: [],
            optimizationUsed: false,
            routeType: 'direct',
            searchDuration: 0,
            userSavings: 0,
            timestamp: new Date()
        };
        try {
            const basicResult = await this.searchFlights(searchData, options.airlines, {
                includeNearbyAirports: options.includeNearbyAirports,
                flexibleDates: options.flexibleDates,
                sortBy: 'price',
                sortOrder: 'asc'
            });
            analytics.searchId = basicResult.searchId;
            analytics.totalFlightsFound = basicResult.totalResults;
            let enhancedResult = {
                ...basicResult
            };
            if (options.powerUserFilters) {
                const { filteredFlights, filterResult } = await this.advancedFilters.applyAdvancedFilters(basicResult.results, options.powerUserFilters);
                enhancedResult.results = filteredFlights;
                enhancedResult.totalResults = filteredFlights.length;
                enhancedResult.filterResult = filterResult;
                enhancedResult.powerUserAnalysis = {
                    availableOptions: this.advancedFilters.getAvailableFilterOptions(basicResult.results),
                    recommendations: this.advancedFilters.generateFilterRecommendations(searchData.searchCriteria, basicResult.results),
                    appliedFilters: filterResult.appliedFilters
                };
                analytics.filtersApplied = filterResult.appliedFilters;
                this.emitEnhancedUpdate(basicResult.searchId, 'filtering', {
                    originalCount: basicResult.totalResults,
                    filteredCount: filteredFlights.length,
                    filtersApplied: filterResult.appliedFilters
                });
            }
            if (options.routeOptimization && enhancedResult.results.length > 0) {
                const optimizedRoute = await this.routeOptimizer.optimizeRoute(searchData.searchCriteria, enhancedResult.results, options.routeOptimization);
                enhancedResult.optimizedRoute = optimizedRoute;
                analytics.optimizationUsed = true;
                analytics.routeType = optimizedRoute.routeType;
                analytics.userSavings = optimizedRoute.savings;
                if (options.routeOptimization.considerPositioning) {
                    const positioningOptions = await this.routeOptimizer.findPositioningFlights(searchData.searchCriteria, enhancedResult.results);
                    enhancedResult.positioningOptions = positioningOptions;
                }
                this.emitEnhancedUpdate(basicResult.searchId, 'optimization', {
                    routeType: optimizedRoute.routeType,
                    savings: optimizedRoute.savings,
                    optimizationScore: optimizedRoute.optimizationScore
                });
            }
            if (options.multiCity) {
                const multiCityRoute = await this.routeOptimizer.optimizeMultiCityRoute(options.multiCity, enhancedResult.results);
                enhancedResult.multiCityRoute = multiCityRoute;
                analytics.routeType = 'multi-city';
                this.emitEnhancedUpdate(basicResult.searchId, 'multi-city', {
                    cities: options.multiCity.cities,
                    totalCost: multiCityRoute.totalCost,
                    segments: multiCityRoute.optimizedFlights.length
                });
            }
            analytics.searchDuration = Date.now() - startTime;
            this.searchAnalytics.set(basicResult.searchId, analytics);
            await this.cacheEnhancedResults(basicResult.searchId, enhancedResult);
            logger_1.logger.info(`Enhanced search completed: ${basicResult.searchId}, ${enhancedResult.totalResults} results, ${analytics.searchDuration}ms`);
            return enhancedResult;
        }
        catch (error) {
            analytics.searchDuration = Date.now() - startTime;
            logger_1.logger.error('Enhanced search failed:', error);
            throw error;
        }
    }
    async getPositioningFlightSuggestions(searchId, maxDetourMiles = 500) {
        const search = await this.searchService.getFlightSearch(searchId);
        if (!search || !search.results || search.results.length === 0) {
            throw new Error('Search not found or has no results');
        }
        return await this.routeOptimizer.findPositioningFlights(search.searchCriteria, search.results, maxDetourMiles);
    }
    async optimizeExistingSearch(searchId, options) {
        const search = await this.searchService.getFlightSearch(searchId);
        if (!search || !search.results || search.results.length === 0) {
            throw new Error('Search not found or has no results');
        }
        const optimizedRoute = await this.routeOptimizer.optimizeRoute(search.searchCriteria, search.results, options);
        this.emitEnhancedUpdate(searchId, 'optimization-applied', {
            routeType: optimizedRoute.routeType,
            savings: optimizedRoute.savings,
            optimizationScore: optimizedRoute.optimizationScore
        });
        return optimizedRoute;
    }
    async applyAdvancedFiltersToSearch(searchId, filters) {
        const search = await this.searchService.getFlightSearch(searchId);
        if (!search || !search.results || search.results.length === 0) {
            throw new Error('Search not found or has no results');
        }
        const result = await this.advancedFilters.applyAdvancedFilters(search.results, filters);
        this.emitEnhancedUpdate(searchId, 'filters-applied', {
            originalCount: search.results.length,
            filteredCount: result.filteredFlights.length,
            filtersApplied: result.filterResult.appliedFilters
        });
        return result;
    }
    getSearchAnalytics(searchId) {
        return this.searchAnalytics.get(searchId) || null;
    }
    getAllSearchAnalytics() {
        return Array.from(this.searchAnalytics.values());
    }
    async generateSearchInsights(searchId) {
        const analytics = this.searchAnalytics.get(searchId);
        if (!analytics) {
            throw new Error('Search analytics not found');
        }
        const search = await this.searchService.getFlightSearch(searchId);
        if (!search) {
            throw new Error('Search not found');
        }
        const insights = [];
        const recommendations = [];
        let potentialSavings = 0;
        let alternativeRoutes = 0;
        if (search.results && search.results.length > 0) {
            const prices = search.results.map(f => f.pricing.totalPrice);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
            insights.push(`Price range: $${minPrice} - $${maxPrice} (avg: $${Math.round(avgPrice)})`);
            const directFlights = search.results.filter(f => f.route.length === 1);
            const connectingFlights = search.results.filter(f => f.route.length > 1);
            if (directFlights.length > 0 && connectingFlights.length > 0) {
                const directAvgPrice = directFlights.reduce((sum, f) => sum + f.pricing.totalPrice, 0) / directFlights.length;
                const connectingAvgPrice = connectingFlights.reduce((sum, f) => sum + f.pricing.totalPrice, 0) / connectingFlights.length;
                if (connectingAvgPrice < directAvgPrice) {
                    potentialSavings = Math.round(directAvgPrice - connectingAvgPrice);
                    recommendations.push(`Save ~$${potentialSavings} by choosing connecting flights over direct`);
                }
            }
            const origins = [...new Set(search.results.map(f => f.route[0]?.origin))];
            const destinations = [...new Set(search.results.map(f => f.route[f.route.length - 1]?.destination))];
            alternativeRoutes = (origins.length - 1) + (destinations.length - 1);
            if (alternativeRoutes > 0) {
                insights.push(`${alternativeRoutes} alternative airport options available`);
                recommendations.push('Consider nearby airports for potentially better deals');
            }
            const departureHours = search.results.map(f => f.route[0]?.departureTime.getHours() || 0);
            const earlyFlights = departureHours.filter(h => h < 8).length;
            const lateFlights = departureHours.filter(h => h > 20).length;
            if (earlyFlights > 0 || lateFlights > 0) {
                insights.push(`${earlyFlights} early morning and ${lateFlights} late evening options`);
                if (earlyFlights > 0) {
                    recommendations.push('Early morning flights often offer better prices');
                }
            }
        }
        if (analytics.optimizationUsed) {
            insights.push(`Route optimization applied: ${analytics.routeType} routing`);
            if (analytics.userSavings > 0) {
                insights.push(`Optimization saved $${analytics.userSavings}`);
            }
        }
        else {
            recommendations.push('Enable route optimization for potentially better deals');
        }
        if (analytics.filtersApplied.length > 0) {
            insights.push(`${analytics.filtersApplied.length} advanced filters applied`);
        }
        else {
            recommendations.push('Use advanced filters to narrow down options');
        }
        return {
            insights,
            recommendations,
            potentialSavings,
            alternativeRoutes
        };
    }
    emitEnhancedUpdate(searchId, type, data) {
        if (this.socketIO) {
            this.socketIO.emit('enhanced-search:update', {
                searchId,
                type,
                data,
                timestamp: new Date()
            });
        }
    }
    async cacheEnhancedResults(searchId, result) {
        try {
            const cacheKey = `enhanced_search:${searchId}`;
            const cacheData = {
                searchId,
                result,
                timestamp: new Date()
            };
            await this.redisClient.setEx(cacheKey, 1800, JSON.stringify(cacheData));
            logger_1.logger.debug(`Cached enhanced search results for ${searchId}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to cache enhanced search results:', error);
        }
    }
    async getCachedEnhancedResults(searchId) {
        try {
            const cacheKey = `enhanced_search:${searchId}`;
            const cached = await this.redisClient.get(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                return data.result;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('Failed to get cached enhanced results:', error);
            return null;
        }
    }
    async enhancedHealthCheck() {
        const baseHealth = await this.healthCheck();
        return {
            status: baseHealth.status,
            baseOrchestrator: baseHealth,
            routeOptimizer: true,
            advancedFilters: true,
            activeAnalytics: this.searchAnalytics.size
        };
    }
    async enhancedCleanup() {
        this.searchAnalytics.clear();
        await this.cleanup();
    }
}
exports.EnhancedSearchOrchestrator = EnhancedSearchOrchestrator;
//# sourceMappingURL=EnhancedSearchOrchestrator.js.map