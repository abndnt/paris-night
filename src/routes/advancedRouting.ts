import { Router, Request, Response } from 'express';
import { 
  EnhancedSearchOrchestrator, 
  EnhancedSearchOptions 
} from '../services/EnhancedSearchOrchestrator';
import { 
  RouteOptimizationOptions, 
  MultiCitySearchCriteria 
} from '../services/RouteOptimizationService';
import { PowerUserFilters } from '../services/AdvancedSearchFilters';
import { CreateFlightSearchData } from '../models/FlightSearch';
import { AirlineAdapterFactory } from '../factories/AirlineAdapterFactory';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { database, redisClient } from '../config/database';
import { logger } from '../utils/logger';
import Joi from 'joi';

// Extend Request interface for user property
interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
  };
}

const router = Router();

// Initialize enhanced orchestrator
const adapterFactory = new AirlineAdapterFactory({ redisClient: redisClient as any });
const enhancedOrchestrator = new EnhancedSearchOrchestrator(
  database,
  redisClient as any,
  adapterFactory,
  undefined, // WebSocket will be injected later
  {
    maxConcurrentSearches: 10,
    searchTimeout: 45000, // Longer timeout for complex searches
    enableRealTimeUpdates: true,
    cacheResults: true
  }
);

// Validation schemas
const routeOptimizationSchema = Joi.object({
  considerPositioning: Joi.boolean().default(false),
  maxPositioningDetour: Joi.number().min(50).max(1000).default(500),
  allowStopovers: Joi.boolean().default(false),
  maxStopoverDuration: Joi.number().min(4).max(72).default(24),
  considerOpenJaw: Joi.boolean().default(false),
  maxGroundTransportTime: Joi.number().min(1).max(12).default(6),
  prioritizeTime: Joi.boolean().default(false),
  prioritizeCost: Joi.boolean().default(true),
  prioritizePoints: Joi.boolean().default(false)
});

const powerUserFiltersSchema = Joi.object({
  aircraftTypes: Joi.array().items(Joi.string()).optional(),
  excludeAircraftTypes: Joi.array().items(Joi.string()).optional(),
  alliancePreference: Joi.string().valid('star-alliance', 'oneworld', 'skyteam').optional(),
  departureTimeWindows: Joi.array().items(Joi.object({
    start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    timezone: Joi.string().optional()
  })).optional(),
  arrivalTimeWindows: Joi.array().items(Joi.object({
    start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    timezone: Joi.string().optional()
  })).optional(),
  maxTotalTravelTime: Joi.number().min(60).max(2880).optional(), // 1 hour to 48 hours
  minLayoverTime: Joi.number().min(30).max(480).optional(), // 30 min to 8 hours
  maxLayoverTime: Joi.number().min(60).max(1440).optional(), // 1 hour to 24 hours
  preferredLayoverAirports: Joi.array().items(Joi.string().length(3)).optional(),
  avoidLayoverAirports: Joi.array().items(Joi.string().length(3)).optional(),
  maxSegments: Joi.number().min(1).max(5).optional(),
  directFlightsOnly: Joi.boolean().optional(),
  avoidRedEyes: Joi.boolean().optional(),
  preferDaytimeFlights: Joi.boolean().optional(),
  wifiRequired: Joi.boolean().optional(),
  lieFlat: Joi.boolean().optional(),
  fuelEfficientAircraftOnly: Joi.boolean().optional(),
  awardAvailabilityOnly: Joi.boolean().optional()
});

const multiCitySchema = Joi.object({
  cities: Joi.array().items(Joi.string().length(3)).min(3).max(10).required(),
  departureDate: Joi.date().greater('now').required(),
  returnDate: Joi.date().greater(Joi.ref('departureDate')).optional(),
  passengers: Joi.object({
    adults: Joi.number().integer().min(1).max(9).required(),
    children: Joi.number().integer().min(0).max(8).default(0),
    infants: Joi.number().integer().min(0).max(8).default(0)
  }).required(),
  cabinClass: Joi.string().valid('economy', 'premium', 'business', 'first').default('economy'),
  flexible: Joi.boolean().default(false),
  maxLayoverTime: Joi.number().min(60).max(1440).optional(),
  minLayoverTime: Joi.number().min(30).max(480).optional()
});

const enhancedSearchSchema = Joi.object({
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
  }).required(),
  airlines: Joi.array().items(Joi.string()).optional(),
  includeNearbyAirports: Joi.boolean().default(false),
  flexibleDates: Joi.boolean().default(false),
  routeOptimization: routeOptimizationSchema.optional(),
  powerUserFilters: powerUserFiltersSchema.optional(),
  multiCity: multiCitySchema.optional()
});

// Enhanced flight search with optimization and advanced filtering
router.post('/enhanced-search', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

    // Use authenticated user ID if available
    const searchData: CreateFlightSearchData = {
      userId: req.user?.id || value.userId,
      searchCriteria: value.searchCriteria
    };

    const options: EnhancedSearchOptions = {
      airlines: value.airlines,
      includeNearbyAirports: value.includeNearbyAirports,
      flexibleDates: value.flexibleDates,
      routeOptimization: value.routeOptimization,
      powerUserFilters: value.powerUserFilters,
      multiCity: value.multiCity
    };

    const result = await enhancedOrchestrator.enhancedSearchFlights(searchData, options);

    logger.info(`Enhanced search completed: ${result.searchId} for user: ${req.user?.id || 'anonymous'}`);

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
  } catch (error) {
    logger.error('Error in enhanced flight search:', error);
    res.status(500).json({
      error: 'Internal server error during enhanced flight search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get positioning flight suggestions for existing search
router.get('/searches/:searchId/positioning', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    const { searchId } = req.params;
    const { maxDetourMiles = 500 } = req.query;

    if (!searchId) {
      res.status(400).json({ error: 'Search ID is required' });
      return;
    }

    const maxDetour = parseInt(maxDetourMiles as string) || 500;
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
  } catch (error) {
    logger.error('Error getting positioning flight suggestions:', error);
    res.status(500).json({
      error: 'Internal server error while getting positioning suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Apply route optimization to existing search
router.post('/searches/:searchId/optimize', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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
  } catch (error) {
    logger.error('Error optimizing existing search:', error);
    res.status(500).json({
      error: 'Internal server error while optimizing route',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Apply advanced filters to existing search
router.post('/searches/:searchId/advanced-filter', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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
  } catch (error) {
    logger.error('Error applying advanced filters:', error);
    res.status(500).json({
      error: 'Internal server error while applying filters',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Multi-city flight search optimization
router.post('/multi-city-search', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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

    // Create a basic search criteria for the first segment to initialize the search
    const searchData: CreateFlightSearchData = {
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

    const options: EnhancedSearchOptions = {
      multiCity: value
    };

    const result = await enhancedOrchestrator.enhancedSearchFlights(searchData, options);

    logger.info(`Multi-city search completed: ${result.searchId} for ${value.cities.length} cities`);

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
  } catch (error) {
    logger.error('Error in multi-city search:', error);
    res.status(500).json({
      error: 'Internal server error during multi-city search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get search analytics and insights
router.get('/searches/:searchId/analytics', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
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
  } catch (error) {
    logger.error('Error getting search analytics:', error);
    res.status(500).json({
      error: 'Internal server error while getting analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all search analytics (admin endpoint)
router.get('/analytics/all', authenticateToken, async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // In a real implementation, you'd check for admin privileges here
    const allAnalytics = enhancedOrchestrator.getAllSearchAnalytics();

    // Aggregate statistics
    const totalSearches = allAnalytics.length;
    const optimizedSearches = allAnalytics.filter(a => a.optimizationUsed).length;
    const totalSavings = allAnalytics.reduce((sum, a) => sum + a.userSavings, 0);
    const avgSearchDuration = allAnalytics.reduce((sum, a) => sum + a.searchDuration, 0) / totalSearches;

    const routeTypeDistribution = allAnalytics.reduce((acc, a) => {
      acc[a.routeType] = (acc[a.routeType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

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
  } catch (error) {
    logger.error('Error getting all analytics:', error);
    res.status(500).json({
      error: 'Internal server error while getting analytics'
    });
  }
});

// Health check for enhanced routing services
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
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
  } catch (error) {
    logger.error('Error checking enhanced routing health:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date()
    });
  }
});

// Get available filter options for a search
router.get('/searches/:searchId/filter-options', optionalAuth, async (req: RequestWithUser, res: Response): Promise<void> => {
  try {
    const { searchId } = req.params;

    if (!searchId) {
      res.status(400).json({ error: 'Search ID is required' });
      return;
    }

    // Get the search results
    const search = await enhancedOrchestrator.searchService.getFlightSearch(searchId);
    if (!search || !search.results || search.results.length === 0) {
      res.status(404).json({ error: 'Search not found or has no results' });
      return;
    }

    const advancedFilters = new (await import('../services/AdvancedSearchFilters')).AdvancedSearchFilters();
    const availableOptions = advancedFilters.getAvailableFilterOptions(search.results);
    const recommendations = advancedFilters.generateFilterRecommendations(search.searchCriteria, search.results);

    res.json({
      searchId,
      availableOptions,
      recommendations,
      totalResults: search.results.length
    });
  } catch (error) {
    logger.error('Error getting filter options:', error);
    res.status(500).json({
      error: 'Internal server error while getting filter options',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;