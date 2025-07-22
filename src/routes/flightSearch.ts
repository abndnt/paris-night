import { Router, Request, Response } from 'express';
import { FlightSearchModel, CreateFlightSearchData, UpdateFlightSearchData } from '../models/FlightSearch';
import { SearchService } from '../services/SearchService';
import { FlightSearchOrchestrator } from '../services/FlightSearchOrchestrator';
import { AirlineAdapterFactory } from '../factories/AirlineAdapterFactory';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { database, redisClient } from '../config/database';
import { logger } from '../utils/logger';
import * as Joi from 'joi';

// Extend Request interface for user property
interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const router = Router();
const flightSearchModel = new FlightSearchModel(database);
const searchService = new SearchService(database);

// Initialize orchestrator components
const adapterFactory = new AirlineAdapterFactory({ redisClient: redisClient as any });
const searchOrchestrator = new FlightSearchOrchestrator(
    database,
    redisClient as any,
    adapterFactory,
    undefined, // WebSocket will be injected later
    {
        maxConcurrentSearches: 10,
        searchTimeout: 30000,
        enableRealTimeUpdates: true,
        cacheResults: true,
        cacheTtl: 300
    }
);

// Validation schemas
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

// Create a new flight search
router.post('/searches', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

        // Use authenticated user ID if available, otherwise use provided userId or null
        const searchData: CreateFlightSearchData = {
            userId: req.user?.id || value.userId,
            searchCriteria: value.searchCriteria
        };

        // Validate and suggest corrections
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

        logger.info(`Flight search created: ${search.id} for user: ${req.user?.id || 'anonymous'}`);

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
    } catch (error) {
        logger.error('Error creating flight search:', error);
        res.status(500).json({
            error: 'Internal server error while creating flight search'
        });
    }
});

// Get a specific flight search by ID
router.get('/searches/:searchId', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

        // Check if user has access to this search
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
    } catch (error) {
        logger.error('Error fetching flight search:', error);
        res.status(500).json({
            error: 'Internal server error while fetching flight search'
        });
    }
});

// Get user's flight searches (authenticated only)
router.get('/searches', authenticateToken, async (req: RequestWithUser, res: Response): Promise<void> => {
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

        // Filter by status if provided
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
    } catch (error) {
        logger.error('Error fetching user flight searches:', error);
        res.status(500).json({
            error: 'Internal server error while fetching flight searches'
        });
    }
});

// Update a flight search (typically used to add results)
router.put('/searches/:searchId', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

        // Check if search exists
        const existingSearch = await flightSearchModel.getSearch(searchId);
        if (!existingSearch) {
            res.status(404).json({ error: 'Flight search not found' });
            return;
        }

        // Check access permissions
        if (existingSearch.userId && existingSearch.userId !== req.user?.id) {
            res.status(403).json({ error: 'Access denied to this search' });
            return;
        }

        const updateData: UpdateFlightSearchData = value;
        const updatedSearch = await flightSearchModel.updateSearch(searchId, updateData);

        if (!updatedSearch) {
            res.status(404).json({ error: 'Flight search not found' });
            return;
        }

        logger.info(`Flight search updated: ${searchId} by user: ${req.user?.id || 'anonymous'}`);

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
    } catch (error) {
        logger.error('Error updating flight search:', error);
        res.status(500).json({
            error: 'Internal server error while updating flight search'
        });
    }
});

// Delete a flight search (authenticated users only)
router.delete('/searches/:searchId', authenticateToken, async (req: RequestWithUser, res: Response): Promise<void> => {
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

        // Check if search exists and belongs to user
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

        logger.info(`Flight search deleted: ${searchId} by user: ${req.user.id}`);

        res.json({ message: 'Flight search deleted successfully' });
    } catch (error) {
        logger.error('Error deleting flight search:', error);
        res.status(500).json({
            error: 'Internal server error while deleting flight search'
        });
    }
});

// Filter flight results
router.post('/searches/:searchId/filter', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

        // Get the search and check permissions
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
    } catch (error) {
        logger.error('Error filtering flight results:', error);
        res.status(500).json({
            error: 'Internal server error while filtering results'
        });
    }
});

// Sort flight results
router.post('/searches/:searchId/sort', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

        // Get the search and check permissions
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
    } catch (error) {
        logger.error('Error sorting flight results:', error);
        res.status(500).json({
            error: 'Internal server error while sorting results'
        });
    }
});

// Validate search criteria (utility endpoint)
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
        logger.error('Error validating search criteria:', error);
        res.status(500).json({
            error: 'Internal server error while validating search criteria'
        });
    }
});

// Clean up expired searches (admin/system endpoint)
router.delete('/expired', async (_req: Request, res: Response): Promise<void> => {
    try {
        const deletedCount = await flightSearchModel.deleteExpiredSearches();

        logger.info(`Cleaned up ${deletedCount} expired flight searches`);

        res.json({
            message: 'Expired searches cleaned up successfully',
            deletedCount
        });
    } catch (error) {
        logger.error('Error cleaning up expired searches:', error);
        res.status(500).json({
            error: 'Internal server error while cleaning up expired searches'
        });
    }
});

// Orchestrated flight search across multiple sources
router.post('/searches/orchestrated', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

        // Use authenticated user ID if available
        const searchData: CreateFlightSearchData = {
            userId: req.user?.id || value.userId,
            searchCriteria: value.searchCriteria
        };

        // Validate search criteria
        const validation = searchService.validateAndSuggestCorrections(searchData.searchCriteria);
        if (!validation.isValid) {
            res.status(400).json({
                error: 'Invalid search criteria',
                validationErrors: validation.errors,
                suggestions: validation.suggestions
            });
            return;
        }

        // Start orchestrated search
        const result = await searchOrchestrator.searchFlights(searchData, airlines, searchOptions);

        logger.info(`Orchestrated flight search completed: ${result.searchId} for user: ${req.user?.id || 'anonymous'}`);

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
    } catch (error) {
        logger.error('Error in orchestrated flight search:', error);
        res.status(500).json({
            error: 'Internal server error during flight search',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get search progress for active searches
router.get('/searches/:searchId/progress', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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
    } catch (error) {
        logger.error('Error getting search progress:', error);
        res.status(500).json({
            error: 'Internal server error while getting search progress'
        });
    }
});

// Cancel an active search
router.delete('/searches/:searchId/cancel', authenticateToken, async (req: RequestWithUser, res: Response): Promise<void> => {
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

        // Check if search belongs to user
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

        logger.info(`Search cancelled: ${searchId} by user: ${req.user.id}`);

        res.json({ message: 'Search cancelled successfully' });
    } catch (error) {
        logger.error('Error cancelling search:', error);
        res.status(500).json({
            error: 'Internal server error while cancelling search'
        });
    }
});

// Get all active searches (admin endpoint)
router.get('/searches/active', async (_req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
        logger.error('Error getting active searches:', error);
        res.status(500).json({
            error: 'Internal server error while getting active searches'
        });
    }
});

// Enhanced filter with orchestrator
router.post('/searches/:searchId/filter/enhanced', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

        // Check permissions
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
    } catch (error) {
        logger.error('Error filtering search results:', error);
        res.status(500).json({
            error: 'Internal server error while filtering results',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Enhanced sort with orchestrator
router.post('/searches/:searchId/sort/enhanced', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

        // Check permissions
        const search = await flightSearchModel.getSearch(searchId);
        if (!search) {
            res.status(404).json({ error: 'Flight search not found' });
            return;
        }

        if (search.userId && search.userId !== req.user?.id) {
            res.status(403).json({ error: 'Access denied to this search' });
            return;
        }

        const result = await searchOrchestrator.sortSearchResults(
            searchId,
            value.sortBy,
            value.sortOrder
        );

        res.json({
            searchId: result.searchId,
            results: result.results,
            totalResults: result.totalResults,
            sortBy: result.sortBy,
            sortOrder: result.sortOrder
        });
    } catch (error) {
        logger.error('Error sorting search results:', error);
        res.status(500).json({
            error: 'Internal server error while sorting results',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Health check endpoint for search orchestrator
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
        logger.error('Error checking orchestrator health:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: 'Health check failed',
            timestamp: new Date()
        });
    }
});

export default router;