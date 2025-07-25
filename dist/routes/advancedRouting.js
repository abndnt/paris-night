"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EnhancedSearchOrchestrator_1 = require("../services/EnhancedSearchOrchestrator");
const AirlineAdapterFactory_1 = require("../factories/AirlineAdapterFactory");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
const adapterFactory = new AirlineAdapterFactory_1.AirlineAdapterFactory({ redisClient: database_1.redisClient });
const enhancedOrchestrator = new EnhancedSearchOrchestrator_1.EnhancedSearchOrchestrator(database_1.database, database_1.redisClient, adapterFactory, undefined, {
    maxConcurrentSearches: 10,
    searchTimeout: 45000,
    enableRealTimeUpdates: true,
    cacheResults: true
});
const routeOptimizationSchema = joi_1.default.object({
    considerPositioning: joi_1.default.boolean().default(false),
    maxPositioningDetour: joi_1.default.number().min(50).max(1000).default(500),
    allowStopovers: joi_1.default.boolean().default(false),
    maxStopoverDuration: joi_1.default.number().min(4).max(72).default(24),
    considerOpenJaw: joi_1.default.boolean().default(false),
    maxGroundTransportTime: joi_1.default.number().min(1).max(12).default(6),
    prioritizeTime: joi_1.default.boolean().default(false),
    prioritizeCost: joi_1.default.boolean().default(true),
    prioritizePoints: joi_1.default.boolean().default(false)
});
const powerUserFiltersSchema = joi_1.default.object({
    aircraftTypes: joi_1.default.array().items(joi_1.default.string()).optional(),
    excludeAircraftTypes: joi_1.default.array().items(joi_1.default.string()).optional(),
    alliancePreference: joi_1.default.string().valid('star-alliance', 'oneworld', 'skyteam').optional(),
    departureTimeWindows: joi_1.default.array().items(joi_1.default.object({
        start: joi_1.default.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        end: joi_1.default.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        timezone: joi_1.default.string().optional()
    })).optional(),
    arrivalTimeWindows: joi_1.default.array().items(joi_1.default.object({
        start: joi_1.default.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        end: joi_1.default.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        timezone: joi_1.default.string().optional()
    })).optional(),
    maxTotalTravelTime: joi_1.default.number().min(60).max(2880).optional(),
    minLayoverTime: joi_1.default.number().min(30).max(480).optional(),
    maxLayoverTime: joi_1.default.number().min(60).max(1440).optional(),
    preferredLayoverAirports: joi_1.default.array().items(joi_1.default.string().length(3)).optional(),
    avoidLayoverAirports: joi_1.default.array().items(joi_1.default.string().length(3)).optional(),
    maxSegments: joi_1.default.number().min(1).max(5).optional(),
    directFlightsOnly: joi_1.default.boolean().optional(),
    avoidRedEyes: joi_1.default.boolean().optional(),
    preferDaytimeFlights: joi_1.default.boolean().optional(),
    wifiRequired: joi_1.default.boolean().optional(),
    lieFlat: joi_1.default.boolean().optional(),
    fuelEfficientAircraftOnly: joi_1.default.boolean().optional(),
    awardAvailabilityOnly: joi_1.default.boolean().optional()
});
const multiCitySchema = joi_1.default.object({
    cities: joi_1.default.array().items(joi_1.default.string().length(3)).min(3).max(10).required(),
    departureDate: joi_1.default.date().greater('now').required(),
    returnDate: joi_1.default.date().greater(joi_1.default.ref('departureDate')).optional(),
    passengers: joi_1.default.object({
        adults: joi_1.default.number().integer().min(1).max(9).required(),
        children: joi_1.default.number().integer().min(0).max(8).default(0),
        infants: joi_1.default.number().integer().min(0).max(8).default(0)
    }).required(),
    cabinClass: joi_1.default.string().valid('economy', 'premium', 'business', 'first').default('economy'),
    flexible: joi_1.default.boolean().default(false),
    maxLayoverTime: joi_1.default.number().min(60).max(1440).optional(),
    minLayoverTime: joi_1.default.number().min(30).max(480).optional()
});
const enhancedSearchSchema = joi_1.default.object({
    userId: joi_1.default.string().uuid().optional(),
    searchCriteria: joi_1.default.object({
        origin: joi_1.default.string().length(3).uppercase().required(),
        destination: joi_1.default.string().length(3).uppercase().required(),
        departureDate: joi_1.default.date().greater('now').required(),
        returnDate: joi_1.default.date().greater(joi_1.default.ref('departureDate')).optional(),
        passengers: joi_1.default.object({
            adults: joi_1.default.number().integer().min(1).max(9).required(),
            children: joi_1.default.number().integer().min(0).max(8).default(0),
            infants: joi_1.default.number().integer().min(0).max(8).default(0)
        }).required(),
        cabinClass: joi_1.default.string().valid('economy', 'premium', 'business', 'first').default('economy'),
        flexible: joi_1.default.boolean().default(false)
    }).required(),
    airlines: joi_1.default.array().items(joi_1.default.string()).optional(),
    includeNearbyAirports: joi_1.default.boolean().default(false),
    flexibleDates: joi_1.default.boolean().default(false),
    routeOptimization: routeOptimizationSchema.optional(),
    powerUserFilters: powerUserFiltersSchema.optional(),
    multiCity: multiCitySchema.optional()
});
router.post('/enhanced-search', auth_1.optionalAuth, async (req, res) => {
    try {
        const { error, value } = enhancedSearchSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                })),
            });
            return;
        }
        const searchData = {
            userId: req.user?.id || value.userId,
            searchCriteria: value.searchCriteria
        };
        const options = {
            airlines: value.airlines,
            includeNearbyAirports: value.includeNearbyAirports,
            flexibleDates: value.flexibleDates,
            routeOptimization: value.routeOptimization,
            powerUserFilters: value.powerUserFilters,
            multiCity: value.multiCity
        };
        const result = await enhancedOrchestrator.enhancedSearchFlights(searchData, options);
        logger_1.logger.info(`Enhanced search completed: ${result.searchId} for user: ${req.user?.id || 'anonymous'}`);
        res.status(201).json({
            message: 'Enhanced flight search completed successfully',
            searchId: result.searchId,
            results: result.results,
            totalResults: result.totalResults,
            searchTime: result.searchTime,
            sources: result.sources,
            optimizedRoute: result.optimizedRoute,
            filterResult: result.filterResult,
            positioningOptions: result.positioningOptions,
            multiCityRoute: result.multiCityRoute,
            powerUserAnalysis: result.powerUserAnalysis
        });
    }
    catch (error) {
        logger_1.logger.error('Error in enhanced flight search:', error);
        res.status(500).json({
            error: 'Internal server error during enhanced flight search',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/searches/:searchId/positioning', auth_1.optionalAuth, async (req, res) => {
    try {
        const { searchId } = req.params;
        const { maxDetourMiles = 500 } = req.query;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        const maxDetour = parseInt(maxDetourMiles) || 500;
        if (maxDetour < 50 || maxDetour > 1000) {
            res.status(400).json({ error: 'Max detour miles must be between 50 and 1000' });
            return;
        }
        const suggestions = await enhancedOrchestrator.getPositioningFlightSuggestions(searchId, maxDetour);
        res.json({
            searchId,
            positioningOptions: suggestions,
            count: suggestions.length,
            maxDetourMiles: maxDetour
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting positioning flight suggestions:', error);
        res.status(500).json({
            error: 'Internal server error while getting positioning suggestions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/searches/:searchId/optimize', auth_1.optionalAuth, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        const { error, value } = routeOptimizationSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                })),
            });
            return;
        }
        const optimizedRoute = await enhancedOrchestrator.optimizeExistingSearch(searchId, value);
        res.json({
            searchId,
            optimizedRoute,
            message: 'Route optimization applied successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error optimizing existing search:', error);
        res.status(500).json({
            error: 'Internal server error while optimizing route',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/searches/:searchId/advanced-filter', auth_1.optionalAuth, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        const { error, value } = powerUserFiltersSchema.validate(req.body);
        if (error) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                })),
            });
            return;
        }
        const result = await enhancedOrchestrator.applyAdvancedFiltersToSearch(searchId, value);
        res.json({
            searchId,
            filteredFlights: result.filteredFlights,
            filterResult: result.filterResult,
            message: 'Advanced filters applied successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error applying advanced filters:', error);
        res.status(500).json({
            error: 'Internal server error while applying filters',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/multi-city-search', auth_1.optionalAuth, async (req, res) => {
    try {
        const { error, value } = multiCitySchema.validate(req.body);
        if (error) {
            res.status(400).json({
                error: 'Validation failed',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                })),
            });
            return;
        }
        const searchData = {
            userId: req.user?.id,
            searchCriteria: {
                origin: value.cities[0],
                destination: value.cities[value.cities.length - 1],
                departureDate: value.departureDate,
                returnDate: value.returnDate,
                passengers: value.passengers,
                cabinClass: value.cabinClass,
                flexible: value.flexible
            }
        };
        const options = {
            multiCity: value
        };
        const result = await enhancedOrchestrator.enhancedSearchFlights(searchData, options);
        logger_1.logger.info(`Multi-city search completed: ${result.searchId} for ${value.cities.length} cities`);
        res.status(201).json({
            message: 'Multi-city flight search completed successfully',
            searchId: result.searchId,
            multiCityRoute: result.multiCityRoute,
            cities: value.cities,
            totalSegments: result.multiCityRoute?.optimizedFlights.length || 0,
            totalCost: result.multiCityRoute?.totalCost || 0,
            totalTime: result.multiCityRoute?.totalTime || 0,
            savings: result.multiCityRoute?.savings || 0
        });
    }
    catch (error) {
        logger_1.logger.error('Error in multi-city search:', error);
        res.status(500).json({
            error: 'Internal server error during multi-city search',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/searches/:searchId/analytics', auth_1.optionalAuth, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        const analytics = enhancedOrchestrator.getSearchAnalytics(searchId);
        if (!analytics) {
            res.status(404).json({ error: 'Search analytics not found' });
            return;
        }
        const insights = await enhancedOrchestrator.generateSearchInsights(searchId);
        res.json({
            searchId,
            analytics,
            insights: insights.insights,
            recommendations: insights.recommendations,
            potentialSavings: insights.potentialSavings,
            alternativeRoutes: insights.alternativeRoutes
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting search analytics:', error);
        res.status(500).json({
            error: 'Internal server error while getting analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/analytics/all', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const allAnalytics = enhancedOrchestrator.getAllSearchAnalytics();
        const totalSearches = allAnalytics.length;
        const optimizedSearches = allAnalytics.filter(a => a.optimizationUsed).length;
        const totalSavings = allAnalytics.reduce((sum, a) => sum + a.userSavings, 0);
        const avgSearchDuration = allAnalytics.reduce((sum, a) => sum + a.searchDuration, 0) / totalSearches;
        const routeTypeDistribution = allAnalytics.reduce((acc, a) => {
            acc[a.routeType] = (acc[a.routeType] || 0) + 1;
            return acc;
        }, {});
        res.json({
            summary: {
                totalSearches,
                optimizedSearches,
                optimizationRate: totalSearches > 0 ? (optimizedSearches / totalSearches) * 100 : 0,
                totalSavings,
                avgSearchDuration: Math.round(avgSearchDuration),
                routeTypeDistribution
            },
            analytics: allAnalytics.map(a => ({
                searchId: a.searchId,
                routeType: a.routeType,
                optimizationUsed: a.optimizationUsed,
                userSavings: a.userSavings,
                searchDuration: a.searchDuration,
                timestamp: a.timestamp
            }))
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting all analytics:', error);
        res.status(500).json({
            error: 'Internal server error while getting analytics'
        });
    }
});
router.get('/health', async (_req, res) => {
    try {
        const health = await enhancedOrchestrator.enhancedHealthCheck();
        const statusCode = health.status === 'healthy' ? 200 :
            health.status === 'degraded' ? 206 : 503;
        res.status(statusCode).json({
            status: health.status,
            services: {
                baseOrchestrator: health.baseOrchestrator.status,
                routeOptimizer: health.routeOptimizer ? 'healthy' : 'unhealthy',
                advancedFilters: health.advancedFilters ? 'healthy' : 'unhealthy'
            },
            activeAnalytics: health.activeAnalytics,
            timestamp: new Date()
        });
    }
    catch (error) {
        logger_1.logger.error('Error checking enhanced routing health:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: 'Health check failed',
            timestamp: new Date()
        });
    }
});
router.get('/searches/:searchId/filter-options', auth_1.optionalAuth, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        const search = await enhancedOrchestrator.searchService.getFlightSearch(searchId);
        if (!search || !search.results || search.results.length === 0) {
            res.status(404).json({ error: 'Search not found or has no results' });
            return;
        }
        const advancedFilters = new (await Promise.resolve().then(() => __importStar(require('../services/AdvancedSearchFilters')))).AdvancedSearchFilters();
        const availableOptions = advancedFilters.getAvailableFilterOptions(search.results);
        const recommendations = advancedFilters.generateFilterRecommendations(search.searchCriteria, search.results);
        res.json({
            searchId,
            availableOptions,
            recommendations,
            totalResults: search.results.length
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting filter options:', error);
        res.status(500).json({
            error: 'Internal server error while getting filter options',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=advancedRouting.js.map