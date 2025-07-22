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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FlightSearch_1 = require("../models/FlightSearch");
const SearchService_1 = require("../services/SearchService");
const FlightSearchOrchestrator_1 = require("../services/FlightSearchOrchestrator");
const AirlineAdapterFactory_1 = require("../factories/AirlineAdapterFactory");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const logger_1 = require("../utils/logger");
const Joi = __importStar(require("joi"));
const router = (0, express_1.Router)();
const flightSearchModel = new FlightSearch_1.FlightSearchModel(database_1.database);
const searchService = new SearchService_1.SearchService(database_1.database);
const adapterFactory = new AirlineAdapterFactory_1.AirlineAdapterFactory({ redisClient: database_1.redisClient });
const searchOrchestrator = new FlightSearchOrchestrator_1.FlightSearchOrchestrator(database_1.database, database_1.redisClient, adapterFactory, undefined, {
    maxConcurrentSearches: 10,
    searchTimeout: 30000,
    enableRealTimeUpdates: true,
    cacheResults: true,
    cacheTtl: 300
});
const createSearchSchema = Joi.object({
    userId: Joi.string().uuid().optional(),
    searchCriteria: Joi.object({
        origin: Joi.string().length(3).uppercase().required(),
        destination: Joi.string().length(3).uppercase().required(),
        departureDate: Joi.date().greater('now').required(),
        returnDate: Joi.date().greater(Joi.ref('departureDate')).optional(),
        passengers: Joi.object({
            adults: Joi.number().integer().min(1).max(9).required(),
            children: Joi.number().integer().min(0).max(8).default(0),
            infants: Joi.number().integer().min(0).max(8).default(0)
        }).required(),
        cabinClass: Joi.string().valid('economy', 'premium', 'business', 'first').default('economy'),
        flexible: Joi.boolean().default(false)
    }).required()
});
const updateSearchSchema = Joi.object({
    results: Joi.array().items(Joi.object()).optional(),
    status: Joi.string().valid('pending', 'searching', 'completed', 'failed', 'expired').optional()
});
const getSearchesSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    status: Joi.string().valid('pending', 'searching', 'completed', 'failed', 'expired').optional()
});
const filterResultsSchema = Joi.object({
    maxPrice: Joi.number().positive().optional(),
    maxDuration: Joi.number().positive().optional(),
    maxLayovers: Joi.number().integer().min(0).optional(),
    preferredAirlines: Joi.array().items(Joi.string()).optional(),
    departureTimeRange: Joi.object({
        earliest: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
        latest: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
    }).optional()
});
const sortResultsSchema = Joi.object({
    sortBy: Joi.string().valid('price', 'duration', 'score', 'departure').default('price'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});
router.post('/searches', auth_1.optionalAuth, async (req, res) => {
    try {
        const { error, value } = createSearchSchema.validate(req.body);
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
        const validation = searchService.validateAndSuggestCorrections(searchData.searchCriteria);
        if (!validation.isValid) {
            res.status(400).json({
                error: 'Invalid search criteria',
                validationErrors: validation.errors,
                suggestions: validation.suggestions
            });
            return;
        }
        const search = await searchService.createFlightSearch(searchData);
        logger_1.logger.info(`Flight search created: ${search.id} for user: ${req.user?.id || 'anonymous'}`);
        res.status(201).json({
            message: 'Flight search created successfully',
            search: {
                id: search.id,
                userId: search.userId,
                searchCriteria: search.searchCriteria,
                status: search.status,
                createdAt: search.createdAt,
                expiresAt: search.expiresAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating flight search:', error);
        res.status(500).json({
            error: 'Internal server error while creating flight search'
        });
    }
});
router.get('/searches/:searchId', auth_1.optionalAuth, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        const search = await flightSearchModel.getSearch(searchId);
        if (!search) {
            res.status(404).json({ error: 'Flight search not found' });
            return;
        }
        if (search.userId && search.userId !== req.user?.id) {
            res.status(403).json({ error: 'Access denied to this search' });
            return;
        }
        res.json({
            search: {
                id: search.id,
                userId: search.userId,
                searchCriteria: search.searchCriteria,
                results: search.results,
                status: search.status,
                createdAt: search.createdAt,
                expiresAt: search.expiresAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching flight search:', error);
        res.status(500).json({
            error: 'Internal server error while fetching flight search'
        });
    }
});
router.get('/searches', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { error, value } = getSearchesSchema.validate(req.query);
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
        const searches = await flightSearchModel.getUserSearches(req.user.id, value.limit, value.offset);
        const filteredSearches = value.status
            ? searches.filter(search => search.status === value.status)
            : searches;
        res.json({
            searches: filteredSearches.map(search => ({
                id: search.id,
                searchCriteria: search.searchCriteria,
                status: search.status,
                resultsCount: search.results?.length || 0,
                createdAt: search.createdAt,
                expiresAt: search.expiresAt
            })),
            pagination: {
                limit: value.limit,
                offset: value.offset,
                total: filteredSearches.length
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching user flight searches:', error);
        res.status(500).json({
            error: 'Internal server error while fetching flight searches'
        });
    }
});
router.put('/searches/:searchId', auth_1.optionalAuth, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        const { error, value } = updateSearchSchema.validate(req.body);
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
        const existingSearch = await flightSearchModel.getSearch(searchId);
        if (!existingSearch) {
            res.status(404).json({ error: 'Flight search not found' });
            return;
        }
        if (existingSearch.userId && existingSearch.userId !== req.user?.id) {
            res.status(403).json({ error: 'Access denied to this search' });
            return;
        }
        const updateData = value;
        const updatedSearch = await flightSearchModel.updateSearch(searchId, updateData);
        if (!updatedSearch) {
            res.status(404).json({ error: 'Flight search not found' });
            return;
        }
        logger_1.logger.info(`Flight search updated: ${searchId} by user: ${req.user?.id || 'anonymous'}`);
        res.json({
            message: 'Flight search updated successfully',
            search: {
                id: updatedSearch.id,
                userId: updatedSearch.userId,
                searchCriteria: updatedSearch.searchCriteria,
                results: updatedSearch.results,
                status: updatedSearch.status,
                createdAt: updatedSearch.createdAt,
                expiresAt: updatedSearch.expiresAt
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating flight search:', error);
        res.status(500).json({
            error: 'Internal server error while updating flight search'
        });
    }
});
router.delete('/searches/:searchId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const search = await flightSearchModel.getSearch(searchId);
        if (!search) {
            res.status(404).json({ error: 'Flight search not found' });
            return;
        }
        if (search.userId !== req.user.id) {
            res.status(403).json({ error: 'Access denied to this search' });
            return;
        }
        const deleted = await flightSearchModel.deleteSearch(searchId);
        if (!deleted) {
            res.status(404).json({ error: 'Flight search not found' });
            return;
        }
        logger_1.logger.info(`Flight search deleted: ${searchId} by user: ${req.user.id}`);
        res.json({ message: 'Flight search deleted successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error deleting flight search:', error);
        res.status(500).json({
            error: 'Internal server error while deleting flight search'
        });
    }
});
router.post('/searches/:searchId/filter', auth_1.optionalAuth, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        const { error, value } = filterResultsSchema.validate(req.body);
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
        const search = await flightSearchModel.getSearch(searchId);
        if (!search) {
            res.status(404).json({ error: 'Flight search not found' });
            return;
        }
        if (search.userId && search.userId !== req.user?.id) {
            res.status(403).json({ error: 'Access denied to this search' });
            return;
        }
        if (!search.results || search.results.length === 0) {
            res.status(400).json({ error: 'No results available to filter' });
            return;
        }
        const filteredResults = searchService.filterFlightResults(search.results, value);
        res.json({
            searchId: search.id,
            originalResultsCount: search.results.length,
            filteredResultsCount: filteredResults.length,
            filters: value,
            results: filteredResults
        });
    }
    catch (error) {
        logger_1.logger.error('Error filtering flight results:', error);
        res.status(500).json({
            error: 'Internal server error while filtering results'
        });
    }
});
router.post('/searches/:searchId/sort', auth_1.optionalAuth, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        const { error, value } = sortResultsSchema.validate(req.body);
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
        const search = await flightSearchModel.getSearch(searchId);
        if (!search) {
            res.status(404).json({ error: 'Flight search not found' });
            return;
        }
        if (search.userId && search.userId !== req.user?.id) {
            res.status(403).json({ error: 'Access denied to this search' });
            return;
        }
        if (!search.results || search.results.length === 0) {
            res.status(400).json({ error: 'No results available to sort' });
            return;
        }
        const sortedResults = searchService.sortFlightResults(search.results, value.sortBy, value.sortOrder);
        res.json({
            searchId: search.id,
            resultsCount: sortedResults.length,
            sortBy: value.sortBy,
            sortOrder: value.sortOrder,
            results: sortedResults
        });
    }
    catch (error) {
        logger_1.logger.error('Error sorting flight results:', error);
        res.status(500).json({
            error: 'Internal server error while sorting results'
        });
    }
});
router.post('/validate', async (req, res) => {
    try {
        const { searchCriteria } = req.body;
        if (!searchCriteria) {
            res.status(400).json({ error: 'Search criteria is required' });
            return;
        }
        const validation = searchService.validateAndSuggestCorrections(searchCriteria);
        res.json({
            isValid: validation.isValid,
            errors: validation.errors,
            suggestions: validation.suggestions
        });
    }
    catch (error) {
        logger_1.logger.error('Error validating search criteria:', error);
        res.status(500).json({
            error: 'Internal server error while validating search criteria'
        });
    }
});
router.delete('/expired', async (_req, res) => {
    try {
        const deletedCount = await flightSearchModel.deleteExpiredSearches();
        logger_1.logger.info(`Cleaned up ${deletedCount} expired flight searches`);
        res.json({
            message: 'Expired searches cleaned up successfully',
            deletedCount
        });
    }
    catch (error) {
        logger_1.logger.error('Error cleaning up expired searches:', error);
        res.status(500).json({
            error: 'Internal server error while cleaning up expired searches'
        });
    }
});
router.post('/searches/orchestrated', auth_1.optionalAuth, async (req, res) => {
    try {
        const { error, value } = createSearchSchema.validate(req.body);
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
        const { airlines = ['american-airlines', 'delta-airlines'], searchOptions = {} } = req.body;
        const searchData = {
            userId: req.user?.id || value.userId,
            searchCriteria: value.searchCriteria
        };
        const validation = searchService.validateAndSuggestCorrections(searchData.searchCriteria);
        if (!validation.isValid) {
            res.status(400).json({
                error: 'Invalid search criteria',
                validationErrors: validation.errors,
                suggestions: validation.suggestions
            });
            return;
        }
        const result = await searchOrchestrator.searchFlights(searchData, airlines, searchOptions);
        logger_1.logger.info(`Orchestrated flight search completed: ${result.searchId} for user: ${req.user?.id || 'anonymous'}`);
        res.status(201).json({
            message: 'Flight search completed successfully',
            searchId: result.searchId,
            results: result.results,
            totalResults: result.totalResults,
            searchTime: result.searchTime,
            sources: result.sources,
            cached: result.cached,
            filters: result.filters,
            sortBy: result.sortBy,
            sortOrder: result.sortOrder
        });
    }
    catch (error) {
        logger_1.logger.error('Error in orchestrated flight search:', error);
        res.status(500).json({
            error: 'Internal server error during flight search',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/searches/:searchId/progress', auth_1.optionalAuth, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        const progress = searchOrchestrator.getSearchProgress(searchId);
        if (!progress) {
            res.status(404).json({ error: 'Search progress not found or search completed' });
            return;
        }
        res.json({
            searchId: progress.searchId,
            status: progress.status,
            progress: progress.progress,
            completedSources: progress.completedSources,
            totalSources: progress.totalSources,
            resultsCount: progress.results.length,
            errors: progress.errors,
            startTime: progress.startTime,
            estimatedCompletion: progress.estimatedCompletion
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting search progress:', error);
        res.status(500).json({
            error: 'Internal server error while getting search progress'
        });
    }
});
router.delete('/searches/:searchId/cancel', auth_1.authenticateToken, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const search = await flightSearchModel.getSearch(searchId);
        if (search && search.userId && search.userId !== req.user.id) {
            res.status(403).json({ error: 'Access denied to this search' });
            return;
        }
        const cancelled = await searchOrchestrator.cancelSearch(searchId);
        if (!cancelled) {
            res.status(404).json({ error: 'Search not found or already completed' });
            return;
        }
        logger_1.logger.info(`Search cancelled: ${searchId} by user: ${req.user.id}`);
        res.json({ message: 'Search cancelled successfully' });
    }
    catch (error) {
        logger_1.logger.error('Error cancelling search:', error);
        res.status(500).json({
            error: 'Internal server error while cancelling search'
        });
    }
});
router.get('/searches/active', async (_req, res) => {
    try {
        const activeSearches = searchOrchestrator.getActiveSearches();
        res.json({
            activeSearches: activeSearches.map(search => ({
                searchId: search.searchId,
                status: search.status,
                progress: search.progress,
                completedSources: search.completedSources,
                totalSources: search.totalSources,
                resultsCount: search.results.length,
                startTime: search.startTime,
                estimatedCompletion: search.estimatedCompletion
            })),
            totalActive: activeSearches.length
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting active searches:', error);
        res.status(500).json({
            error: 'Internal server error while getting active searches'
        });
    }
});
router.post('/searches/:searchId/filter/enhanced', auth_1.optionalAuth, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        const { error, value } = filterResultsSchema.validate(req.body);
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
        const search = await flightSearchModel.getSearch(searchId);
        if (!search) {
            res.status(404).json({ error: 'Flight search not found' });
            return;
        }
        if (search.userId && search.userId !== req.user?.id) {
            res.status(403).json({ error: 'Access denied to this search' });
            return;
        }
        const result = await searchOrchestrator.filterSearchResults(searchId, value);
        res.json({
            searchId: result.searchId,
            results: result.results,
            totalResults: result.totalResults,
            filters: result.filters,
            originalCount: search.results?.length || 0,
            filteredCount: result.totalResults
        });
    }
    catch (error) {
        logger_1.logger.error('Error filtering search results:', error);
        res.status(500).json({
            error: 'Internal server error while filtering results',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/searches/:searchId/sort/enhanced', auth_1.optionalAuth, async (req, res) => {
    try {
        const { searchId } = req.params;
        if (!searchId) {
            res.status(400).json({ error: 'Search ID is required' });
            return;
        }
        const { error, value } = sortResultsSchema.validate(req.body);
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
        const search = await flightSearchModel.getSearch(searchId);
        if (!search) {
            res.status(404).json({ error: 'Flight search not found' });
            return;
        }
        if (search.userId && search.userId !== req.user?.id) {
            res.status(403).json({ error: 'Access denied to this search' });
            return;
        }
        const result = await searchOrchestrator.sortSearchResults(searchId, value.sortBy, value.sortOrder);
        res.json({
            searchId: result.searchId,
            results: result.results,
            totalResults: result.totalResults,
            sortBy: result.sortBy,
            sortOrder: result.sortOrder
        });
    }
    catch (error) {
        logger_1.logger.error('Error sorting search results:', error);
        res.status(500).json({
            error: 'Internal server error while sorting results',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/health', async (_req, res) => {
    try {
        const health = await searchOrchestrator.healthCheck();
        const statusCode = health.status === 'healthy' ? 200 :
            health.status === 'degraded' ? 206 : 503;
        res.status(statusCode).json({
            status: health.status,
            activeSearches: health.activeSearches,
            adapterHealth: health.adapterHealth,
            cacheHealth: health.cacheHealth,
            timestamp: new Date()
        });
    }
    catch (error) {
        logger_1.logger.error('Error checking orchestrator health:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: 'Health check failed',
            timestamp: new Date()
        });
    }
});
exports.default = router;
//# sourceMappingURL=flightSearch.js.map