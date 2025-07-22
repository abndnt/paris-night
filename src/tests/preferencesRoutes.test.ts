import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { createPreferencesRouter } from '../routes/preferences';

// Mock dependencies
const mockDb = {
  query: jest.fn(),
} as unknown as Pool;

// Mock middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'user-123', email: 'test@example.com' };
  next();
};

jest.mock('../middleware/auth', () => ({
  authenticateToken: mockAuthMiddleware,
}));

// Mock models and services
const mockPreferencesModel = {
  findByUserId: jest.fn(),
  upsert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockFilterService = {
  filterByPreferences: jest.fn(),
  getSearchRecommendations: jest.fn(),
};

const mockPersonalizationEngine = {
  generateRecommendations: jest.fn(),
  generateInsights: jest.fn(),
};

const mockLearningService = {
  learnAndUpdatePreferences: jest.fn(),
};

jest.mock('../models/TravelPreferences', () => ({
  TravelPreferencesModel: jest.fn().mockImplementation(() => mockPreferencesModel),
}));

jest.mock('../services/PreferenceFilterService', () => ({
  PreferenceFilterService: jest.fn().mockImplementation(() => mockFilterService),
}));

jest.mock('../services/PersonalizationEngine', () => ({
  PersonalizationEngine: jest.fn().mockImplementation(() => mockPersonalizationEngine),
}));

jest.mock('../services/PreferenceLearningService', () => ({
  PreferenceLearningService: jest.fn().mockImplementation(() => mockLearningService),
}));

describe('Preferences Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/preferences', createPreferencesRouter(mockDb));
    jest.clearAllMocks();
  });

  const mockPreferences = {
    id: 'pref-123',
    userId: 'user-123',
    preferredAirlines: ['AA', 'DL'],
    preferredAirports: ['JFK', 'LAX'],
    seatPreference: 'aisle',
    mealPreference: 'vegetarian',
    maxLayovers: 1,
    preferredCabinClass: 'economy',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET /preferences', () => {
    it('should return user preferences', async () => {
      mockPreferencesModel.findByUserId.mockResolvedValue(mockPreferences);

      const response = await request(app)
        .get('/preferences')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPreferences);
      expect(mockPreferencesModel.findByUserId).toHaveBeenCalledWith('user-123');
    });

    it('should return 404 when preferences not found', async () => {
      mockPreferencesModel.findByUserId.mockResolvedValue(null);

      const response = await request(app)
        .get('/preferences')
        .expect(404);

      expect(response.body.error).toBe('Preferences not found');
    });

    it('should handle database errors', async () => {
      mockPreferencesModel.findByUserId.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/preferences')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /preferences', () => {
    const validPreferencesData = {
      preferredAirlines: ['AA', 'DL'],
      preferredAirports: ['JFK', 'LAX'],
      seatPreference: 'aisle',
      mealPreference: 'vegetarian',
      maxLayovers: 1,
      preferredCabinClass: 'economy',
    };

    it('should create/update preferences successfully', async () => {
      mockPreferencesModel.upsert.mockResolvedValue(mockPreferences);

      const response = await request(app)
        .post('/preferences')
        .send(validPreferencesData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockPreferences);
      expect(response.body.message).toBe('Travel preferences saved successfully');
      
      expect(mockPreferencesModel.upsert).toHaveBeenCalledWith({
        userId: 'user-123',
        ...validPreferencesData,
      });
    });

    it('should validate seat preference', async () => {
      const invalidData = {
        ...validPreferencesData,
        seatPreference: 'invalid',
      };

      const response = await request(app)
        .post('/preferences')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Invalid seat preference');
    });

    it('should validate cabin class', async () => {
      const invalidData = {
        ...validPreferencesData,
        preferredCabinClass: 'invalid',
      };

      const response = await request(app)
        .post('/preferences')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Invalid cabin class');
    });

    it('should validate max layovers', async () => {
      const invalidData = {
        ...validPreferencesData,
        maxLayovers: -1,
      };

      const response = await request(app)
        .post('/preferences')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Invalid max layovers');
    });

    it('should handle database errors', async () => {
      mockPreferencesModel.upsert.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/preferences')
        .send(validPreferencesData)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('PATCH /preferences', () => {
    const updateData = {
      seatPreference: 'window',
      maxLayovers: 2,
    };

    it('should update specific preference fields', async () => {
      const updatedPreferences = { ...mockPreferences, ...updateData };
      mockPreferencesModel.update.mockResolvedValue(updatedPreferences);

      const response = await request(app)
        .patch('/preferences')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedPreferences);
      expect(mockPreferencesModel.update).toHaveBeenCalledWith('user-123', updateData);
    });

    it('should return 404 when preferences not found', async () => {
      mockPreferencesModel.update.mockResolvedValue(null);

      const response = await request(app)
        .patch('/preferences')
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Preferences not found');
    });

    it('should validate update data', async () => {
      const invalidData = { seatPreference: 'invalid' };

      const response = await request(app)
        .patch('/preferences')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Invalid seat preference');
    });
  });

  describe('DELETE /preferences', () => {
    it('should delete preferences successfully', async () => {
      mockPreferencesModel.delete.mockResolvedValue(true);

      const response = await request(app)
        .delete('/preferences')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Travel preferences deleted successfully');
      expect(mockPreferencesModel.delete).toHaveBeenCalledWith('user-123');
    });

    it('should return 404 when preferences not found', async () => {
      mockPreferencesModel.delete.mockResolvedValue(false);

      const response = await request(app)
        .delete('/preferences')
        .expect(404);

      expect(response.body.error).toBe('Preferences not found');
    });
  });

  describe('GET /preferences/recommendations', () => {
    it('should return personalized recommendations', async () => {
      const mockRecommendations = [
        {
          type: 'route',
          title: 'JFK to LAX',
          description: 'Popular route based on your searches',
          data: { origin: 'JFK', destination: 'LAX' },
          score: 15,
          reason: 'Frequently searched route',
        },
      ];

      mockPersonalizationEngine.generateRecommendations.mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .get('/preferences/recommendations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRecommendations);
      expect(mockPersonalizationEngine.generateRecommendations).toHaveBeenCalledWith('user-123');
    });

    it('should handle errors', async () => {
      mockPersonalizationEngine.generateRecommendations.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/preferences/recommendations')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /preferences/learn', () => {
    it('should learn preferences from booking history', async () => {
      const mockLearningResult = {
        updatedPreferences: mockPreferences,
        insights: [
          {
            type: 'airline',
            insight: 'You frequently book with AA',
            confidence: 0.8,
            data: { airline: 'AA' },
          },
        ],
        learningConfidence: 0.7,
      };

      mockLearningService.learnAndUpdatePreferences.mockResolvedValue(mockLearningResult);

      const response = await request(app)
        .post('/preferences/learn')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockLearningResult);
      expect(mockLearningService.learnAndUpdatePreferences).toHaveBeenCalledWith('user-123');
    });

    it('should handle errors', async () => {
      mockLearningService.learnAndUpdatePreferences.mockRejectedValue(new Error('Learning error'));

      const response = await request(app)
        .post('/preferences/learn')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /preferences/insights', () => {
    it('should return personalization insights', async () => {
      const mockInsights = {
        travelPatterns: {
          frequentRoutes: ['JFK-LAX', 'LGA-ORD'],
          preferredTravelDays: ['Monday', 'Friday'],
          averageAdvanceBooking: 30,
          seasonalPreferences: ['Summer', 'Winter'],
        },
        spendingPatterns: {
          averageSpend: 400,
          pointsUsageFrequency: 0.6,
          preferredPaymentMethod: 'points',
        },
        recommendations: [],
      };

      mockPersonalizationEngine.generateInsights.mockResolvedValue(mockInsights);

      const response = await request(app)
        .get('/preferences/insights')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockInsights);
      expect(mockPersonalizationEngine.generateInsights).toHaveBeenCalledWith('user-123');
    });
  });

  describe('POST /preferences/filter-results', () => {
    it('should filter search results by preferences', async () => {
      const mockResults = [
        { id: 'flight-1', airline: 'AA', layovers: 0 },
        { id: 'flight-2', airline: 'UA', layovers: 1 },
      ];

      const mockFilteredResults = {
        results: [mockResults[0]], // AA flight ranked higher
        appliedFilters: ['airline_preference'],
        totalResults: 2,
        filteredResults: 2,
      };

      mockPreferencesModel.findByUserId.mockResolvedValue(mockPreferences);
      mockFilterService.filterByPreferences.mockResolvedValue(mockFilteredResults);

      const response = await request(app)
        .post('/preferences/filter-results')
        .send({ results: mockResults, options: {} })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockFilteredResults);
      expect(mockFilterService.filterByPreferences).toHaveBeenCalledWith(
        mockResults,
        mockPreferences,
        {}
      );
    });

    it('should validate input', async () => {
      const response = await request(app)
        .post('/preferences/filter-results')
        .send({ results: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('Invalid input');
    });
  });

  describe('GET /preferences/search-recommendations', () => {
    it('should return search recommendations', async () => {
      const mockRecommendations = {
        recommendedAirlines: ['AA', 'DL'],
        recommendedAirports: ['JFK', 'LAX'],
        recommendedCabinClass: 'economy',
        recommendedMaxLayovers: 1,
      };

      mockPreferencesModel.findByUserId.mockResolvedValue(mockPreferences);
      mockFilterService.getSearchRecommendations.mockResolvedValue(mockRecommendations);

      const response = await request(app)
        .get('/preferences/search-recommendations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockRecommendations);
      expect(mockFilterService.getSearchRecommendations).toHaveBeenCalledWith(mockPreferences);
    });
  });
});