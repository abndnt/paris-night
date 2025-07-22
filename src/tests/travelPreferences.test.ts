import { Pool } from 'pg';
import { TravelPreferencesModel, CreateTravelPreferencesData, UpdateTravelPreferencesData } from '../models/TravelPreferences';

// Mock database
const mockDb = {
  query: jest.fn(),
} as unknown as Pool;

describe('TravelPreferencesModel', () => {
  let model: TravelPreferencesModel;

  beforeEach(() => {
    model = new TravelPreferencesModel(mockDb);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create travel preferences with default values', async () => {
      const mockResult = {
        rows: [{
          id: 'pref-123',
          user_id: 'user-123',
          preferred_airlines: ['AA', 'DL'],
          preferred_airports: ['JFK', 'LAX'],
          seat_preference: 'aisle',
          meal_preference: 'vegetarian',
          max_layovers: 1,
          preferred_cabin_class: 'economy',
          created_at: new Date(),
          updated_at: new Date(),
        }]
      };

      (mockDb.query as jest.Mock).mockResolvedValue(mockResult);

      const preferencesData: CreateTravelPreferencesData = {
        userId: 'user-123',
        preferredAirlines: ['AA', 'DL'],
        preferredAirports: ['JFK', 'LAX'],
        seatPreference: 'aisle',
        mealPreference: 'vegetarian',
        maxLayovers: 1,
        preferredCabinClass: 'economy',
      };

      const result = await model.create(preferencesData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO travel_preferences'),
        ['user-123', ['AA', 'DL'], ['JFK', 'LAX'], 'aisle', 'vegetarian', 1, 'economy']
      );

      expect(result).toEqual({
        id: 'pref-123',
        userId: 'user-123',
        preferredAirlines: ['AA', 'DL'],
        preferredAirports: ['JFK', 'LAX'],
        seatPreference: 'aisle',
        mealPreference: 'vegetarian',
        maxLayovers: 1,
        preferredCabinClass: 'economy',
        createdAt: mockResult.rows[0].created_at,
        updatedAt: mockResult.rows[0].updated_at,
      });
    });

    it('should create preferences with minimal data and defaults', async () => {
      const mockResult = {
        rows: [{
          id: 'pref-123',
          user_id: 'user-123',
          preferred_airlines: [],
          preferred_airports: [],
          seat_preference: null,
          meal_preference: null,
          max_layovers: 2,
          preferred_cabin_class: 'economy',
          created_at: new Date(),
          updated_at: new Date(),
        }]
      };

      (mockDb.query as jest.Mock).mockResolvedValue(mockResult);

      const preferencesData: CreateTravelPreferencesData = {
        userId: 'user-123',
      };

      const result = await model.create(preferencesData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO travel_preferences'),
        ['user-123', [], [], undefined, undefined, 2, 'economy']
      );

      expect(result.maxLayovers).toBe(2);
      expect(result.preferredCabinClass).toBe('economy');
    });
  });

  describe('findByUserId', () => {
    it('should return preferences for existing user', async () => {
      const mockResult = {
        rows: [{
          id: 'pref-123',
          user_id: 'user-123',
          preferred_airlines: ['AA', 'DL'],
          preferred_airports: ['JFK', 'LAX'],
          seat_preference: 'window',
          meal_preference: 'kosher',
          max_layovers: 1,
          preferred_cabin_class: 'business',
          created_at: new Date(),
          updated_at: new Date(),
        }]
      };

      (mockDb.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await model.findByUserId('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['user-123']
      );

      expect(result).toEqual({
        id: 'pref-123',
        userId: 'user-123',
        preferredAirlines: ['AA', 'DL'],
        preferredAirports: ['JFK', 'LAX'],
        seatPreference: 'window',
        mealPreference: 'kosher',
        maxLayovers: 1,
        preferredCabinClass: 'business',
        createdAt: mockResult.rows[0].created_at,
        updatedAt: mockResult.rows[0].updated_at,
      });
    });

    it('should return null for non-existing user', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await model.findByUserId('non-existing-user');

      expect(result).toBeNull();
    });

    it('should handle null arrays from database', async () => {
      const mockResult = {
        rows: [{
          id: 'pref-123',
          user_id: 'user-123',
          preferred_airlines: null,
          preferred_airports: null,
          seat_preference: null,
          meal_preference: null,
          max_layovers: 2,
          preferred_cabin_class: 'economy',
          created_at: new Date(),
          updated_at: new Date(),
        }]
      };

      (mockDb.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await model.findByUserId('user-123');

      expect(result?.preferredAirlines).toEqual([]);
      expect(result?.preferredAirports).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update specific preference fields', async () => {
      const mockResult = {
        rows: [{
          id: 'pref-123',
          user_id: 'user-123',
          preferred_airlines: ['UA', 'SW'],
          preferred_airports: ['ORD', 'MDW'],
          seat_preference: 'middle',
          meal_preference: 'vegan',
          max_layovers: 0,
          preferred_cabin_class: 'first',
          created_at: new Date(),
          updated_at: new Date(),
        }]
      };

      (mockDb.query as jest.Mock).mockResolvedValue(mockResult);

      const updateData: UpdateTravelPreferencesData = {
        preferredAirlines: ['UA', 'SW'],
        seatPreference: 'middle',
        preferredCabinClass: 'first',
      };

      const result = await model.update('user-123', updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE travel_preferences'),
        ['user-123', ['UA', 'SW'], undefined, 'middle', undefined, undefined, 'first']
      );

      expect(result?.preferredAirlines).toEqual(['UA', 'SW']);
      expect(result?.seatPreference).toBe('middle');
      expect(result?.preferredCabinClass).toBe('first');
    });

    it('should return null for non-existing user', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await model.update('non-existing-user', {});

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete preferences successfully', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      const result = await model.delete('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM travel_preferences WHERE user_id = $1',
        ['user-123']
      );
      expect(result).toBe(true);
    });

    it('should return false when no preferences to delete', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      const result = await model.delete('non-existing-user');

      expect(result).toBe(false);
    });
  });

  describe('upsert', () => {
    it('should create preferences when none exist', async () => {
      // Mock findByUserId to return null (no existing preferences)
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // findByUserId
        .mockResolvedValueOnce({ // create
          rows: [{
            id: 'pref-123',
            user_id: 'user-123',
            preferred_airlines: ['AA'],
            preferred_airports: ['JFK'],
            seat_preference: 'aisle',
            meal_preference: null,
            max_layovers: 2,
            preferred_cabin_class: 'economy',
            created_at: new Date(),
            updated_at: new Date(),
          }]
        });

      const preferencesData: CreateTravelPreferencesData = {
        userId: 'user-123',
        preferredAirlines: ['AA'],
        preferredAirports: ['JFK'],
        seatPreference: 'aisle',
      };

      const result = await model.upsert(preferencesData);

      expect(result.id).toBe('pref-123');
      expect(result.preferredAirlines).toEqual(['AA']);
    });

    it('should update preferences when they exist', async () => {
      // Mock findByUserId to return existing preferences
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ // findByUserId
          rows: [{
            id: 'pref-123',
            user_id: 'user-123',
            preferred_airlines: ['DL'],
            preferred_airports: ['ATL'],
            seat_preference: 'window',
            meal_preference: null,
            max_layovers: 1,
            preferred_cabin_class: 'economy',
            created_at: new Date(),
            updated_at: new Date(),
          }]
        })
        .mockResolvedValueOnce({ // update
          rows: [{
            id: 'pref-123',
            user_id: 'user-123',
            preferred_airlines: ['AA'],
            preferred_airports: ['JFK'],
            seat_preference: 'aisle',
            meal_preference: null,
            max_layovers: 1,
            preferred_cabin_class: 'economy',
            created_at: new Date(),
            updated_at: new Date(),
          }]
        });

      const preferencesData: CreateTravelPreferencesData = {
        userId: 'user-123',
        preferredAirlines: ['AA'],
        preferredAirports: ['JFK'],
        seatPreference: 'aisle',
      };

      const result = await model.upsert(preferencesData);

      expect(result.preferredAirlines).toEqual(['AA']);
      expect(result.preferredAirports).toEqual(['JFK']);
      expect(result.seatPreference).toBe('aisle');
    });
  });
});