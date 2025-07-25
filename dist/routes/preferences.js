"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPreferencesRouter = createPreferencesRouter;
const express_1 = require("express");
const TravelPreferences_1 = require("../models/TravelPreferences");
const PreferenceFilterService_1 = require("../services/PreferenceFilterService");
const PersonalizationEngine_1 = require("../services/PersonalizationEngine");
const PreferenceLearningService_1 = require("../services/PreferenceLearningService");
const auth_1 = require("../middleware/auth");
function createPreferencesRouter(db) {
    const router = (0, express_1.Router)();
    const preferencesModel = new TravelPreferences_1.TravelPreferencesModel(db);
    const filterService = new PreferenceFilterService_1.PreferenceFilterService();
    const personalizationEngine = new PersonalizationEngine_1.PersonalizationEngine(db);
    const learningService = new PreferenceLearningService_1.PreferenceLearningService(db);
    router.get('/', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const preferences = await preferencesModel.findByUserId(userId);
            if (!preferences) {
                return res.status(404).json({
                    error: 'Preferences not found',
                    message: 'No travel preferences found for this user'
                });
            }
            res.json({
                success: true,
                data: preferences
            });
        }
        catch (error) {
            console.error('Error fetching preferences:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to fetch travel preferences'
            });
        }
    });
    router.post('/', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const preferencesData = {
                userId,
                ...req.body
            };
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
            res.json({
                success: true,
                data: preferences,
                message: 'Travel preferences saved successfully'
            });
        }
        catch (error) {
            console.error('Error saving preferences:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to save travel preferences'
            });
        }
    });
    router.patch('/', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const updateData = req.body;
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
            res.json({
                success: true,
                data: preferences,
                message: 'Travel preferences updated successfully'
            });
        }
        catch (error) {
            console.error('Error updating preferences:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to update travel preferences'
            });
        }
    });
    router.delete('/', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const deleted = await preferencesModel.delete(userId);
            if (!deleted) {
                return res.status(404).json({
                    error: 'Preferences not found',
                    message: 'No travel preferences found to delete'
                });
            }
            res.json({
                success: true,
                message: 'Travel preferences deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting preferences:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to delete travel preferences'
            });
        }
    });
    router.get('/recommendations', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const recommendations = await personalizationEngine.generateRecommendations(userId);
            res.json({
                success: true,
                data: recommendations,
                message: 'Personalized recommendations generated successfully'
            });
        }
        catch (error) {
            console.error('Error generating recommendations:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to generate personalized recommendations'
            });
        }
    });
    router.post('/learn', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const learningResult = await learningService.learnAndUpdatePreferences(userId);
            res.json({
                success: true,
                data: learningResult,
                message: 'Preferences learned from booking history'
            });
        }
        catch (error) {
            console.error('Error learning preferences:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to learn preferences from booking history'
            });
        }
    });
    router.get('/insights', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const insights = await personalizationEngine.generateInsights(userId);
            res.json({
                success: true,
                data: insights,
                message: 'Personalization insights generated successfully'
            });
        }
        catch (error) {
            console.error('Error generating insights:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to generate personalization insights'
            });
        }
    });
    router.post('/filter-results', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const { results, options } = req.body;
            if (!results || !Array.isArray(results)) {
                return res.status(400).json({
                    error: 'Invalid input',
                    message: 'Results array is required'
                });
            }
            const preferences = await preferencesModel.findByUserId(userId);
            const filteredResults = await filterService.filterByPreferences(results, preferences, options);
            res.json({
                success: true,
                data: filteredResults,
                message: 'Search results filtered by preferences'
            });
        }
        catch (error) {
            console.error('Error filtering results:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to filter search results'
            });
        }
    });
    router.get('/search-recommendations', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const preferences = await preferencesModel.findByUserId(userId);
            const recommendations = await filterService.getSearchRecommendations(preferences);
            res.json({
                success: true,
                data: recommendations,
                message: 'Search recommendations generated successfully'
            });
        }
        catch (error) {
            console.error('Error generating search recommendations:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to generate search recommendations'
            });
        }
    });
    return router;
}
//# sourceMappingURL=preferences.js.map