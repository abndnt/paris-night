import { Router, Response } from 'express';
import { Pool } from 'pg';
import { TravelPreferencesModel, CreateTravelPreferencesData, UpdateTravelPreferencesData } from '../models/TravelPreferences';
import { PreferenceFilterService } from '../services/PreferenceFilterService';
import { PersonalizationEngine } from '../services/PersonalizationEngine';
import { PreferenceLearningService } from '../services/PreferenceLearningService';
import { authenticateToken, AuthenticatedRequest, withAuth } from '../middleware/auth';

export function createPreferencesRouter(db: Pool): Router {
  const router = Router();
  const preferencesModel = new TravelPreferencesModel(db);
  const filterService = new PreferenceFilterService();
  const personalizationEngine = new PersonalizationEngine(db);
  const learningService = new PreferenceLearningService(db);

  // Get user preferences
  router.get('/', authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const preferences = await preferencesModel.findByUserId(userId);
      
      if (!preferences) {
        return res.status(404).json({
          error: 'Preferences not found',
          message: 'No travel preferences found for this user'
        });
      }

      return res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch travel preferences'
      });
    }
  }));

  // Create or update user preferences
  router.post('/', authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const preferencesData: CreateTravelPreferencesData = {
        userId,
        ...req.body
      };

      // Validate input
      if (preferencesData.seatPreference && 
          !['aisle', 'window', 'middle'].includes(preferencesData.seatPreference)) {
        return res.status(400).json({
          error: 'Invalid seat preference',
          message: 'Seat preference must be aisle, window, or middle'
        });
      }

      if (preferencesData.preferredCabinClass && 
          !['economy', 'premium', 'business', 'first'].includes(preferencesData.preferredCabinClass)) {
        return res.status(400).json({
          error: 'Invalid cabin class',
          message: 'Cabin class must be economy, premium, business, or first'
        });
      }

      if (preferencesData.maxLayovers !== undefined && 
          (preferencesData.maxLayovers < 0 || preferencesData.maxLayovers > 5)) {
        return res.status(400).json({
          error: 'Invalid max layovers',
          message: 'Max layovers must be between 0 and 5'
        });
      }

      const preferences = await preferencesModel.upsert(preferencesData);

      return res.json({
        success: true,
        data: preferences,
        message: 'Travel preferences saved successfully'
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to save travel preferences'
      });
    }
  }));

  // Update specific preference fields
  router.patch('/', authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const updateData: UpdateTravelPreferencesData = req.body;

      // Validate input
      if (updateData.seatPreference && 
          !['aisle', 'window', 'middle'].includes(updateData.seatPreference)) {
        return res.status(400).json({
          error: 'Invalid seat preference',
          message: 'Seat preference must be aisle, window, or middle'
        });
      }

      if (updateData.preferredCabinClass && 
          !['economy', 'premium', 'business', 'first'].includes(updateData.preferredCabinClass)) {
        return res.status(400).json({
          error: 'Invalid cabin class',
          message: 'Cabin class must be economy, premium, business, or first'
        });
      }

      const preferences = await preferencesModel.update(userId, updateData);

      if (!preferences) {
        return res.status(404).json({
          error: 'Preferences not found',
          message: 'No travel preferences found to update'
        });
      }

      return res.json({
        success: true,
        data: preferences,
        message: 'Travel preferences updated successfully'
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update travel preferences'
      });
    }
  }));

  // Delete user preferences
  router.delete('/', authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const deleted = await preferencesModel.delete(userId);

      if (!deleted) {
        return res.status(404).json({
          error: 'Preferences not found',
          message: 'No travel preferences found to delete'
        });
      }

      return res.json({
        success: true,
        message: 'Travel preferences deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting preferences:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete travel preferences'
      });
    }
  }));

  // Get personalized recommendations
  router.get('/recommendations', authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const recommendations = await personalizationEngine.generateRecommendations(userId);

      return res.json({
        success: true,
        data: recommendations,
        message: 'Personalized recommendations generated successfully'
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate personalized recommendations'
      });
    }
  }));

  // Learn preferences from booking history
  router.post('/learn', authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const learningResult = await learningService.learnAndUpdatePreferences(userId);

      return res.json({
        success: true,
        data: learningResult,
        message: 'Preferences learned from booking history'
      });
    } catch (error) {
      console.error('Error learning preferences:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to learn preferences from booking history'
      });
    }
  }));

  // Get personalization insights
  router.get('/insights', authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const insights = await personalizationEngine.generateInsights(userId);

      return res.json({
        success: true,
        data: insights,
        message: 'Personalization insights generated successfully'
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate personalization insights'
      });
    }
  }));

  // Filter search results by preferences
  router.post('/filter-results', authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { results, options } = req.body;

      if (!results || !Array.isArray(results)) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Results array is required'
        });
      }

      const preferences = await preferencesModel.findByUserId(userId);
      const filteredResults = await filterService.filterByPreferences(results, preferences, options);

      return res.json({
        success: true,
        data: filteredResults,
        message: 'Search results filtered by preferences'
      });
    } catch (error) {
      console.error('Error filtering results:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to filter search results'
      });
    }
  }));

  // Get search recommendations based on preferences
  router.get('/search-recommendations', authenticateToken, withAuth(async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const preferences = await preferencesModel.findByUserId(userId);
      const recommendations = await filterService.getSearchRecommendations(preferences);

      return res.json({
        success: true,
        data: recommendations,
        message: 'Search recommendations generated successfully'
      });
    } catch (error) {
      console.error('Error generating search recommendations:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate search recommendations'
      });
    }
  }));

  return router;
}