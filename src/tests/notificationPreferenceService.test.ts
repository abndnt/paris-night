import { Pool } from 'pg';
import { NotificationPreferenceService } from '../services/NotificationPreferenceService';
import { NotificationPreferences } from '../models/Notification';

// Mock dependencies
jest.mock('../utils/logger');

describe('NotificationPreferenceService', () => {
  let mockDb: jest.Mocked<Pool>;
  let preferenceService: NotificationPreferenceService;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;

    preferenceService = new NotificationPreferenceService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPreferences', () => {
    it('should return user preferences when they exist', async () => {
      const mockPreferences = {
        id: 'pref-123',
        user_id: 'user-123',
        email_notifications: true,
        push_notifications: false,
        deal_alerts: true,
        price_drop_alerts: false,
        booking_updates: true,
        system_notifications: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockPreferences] });

      const result = await preferenceService.getUserPreferences('user-123');

      expect(result).toEqual({
        id: 'pref-123',
        userId: 'user-123',
        emailNotifications: true,
        pushNotifications: false,
        dealAlerts: true,
        priceDropAlerts: false,
        bookingUpdates: true,
        systemNotifications: true,
        createdAt: mockPreferences.created_at,
        updatedAt: mockPreferences.updated_at
      });
    });

    it('should return null when preferences do not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await preferenceService.getUserPreferences('user-123');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(preferenceService.getUserPreferences('user-123'))
        .rejects.toThrow('Database error');
    });
  });

  describe('createDefaultPreferences', () => {
    it('should create default preferences for a user', async () => {
      const mockCreatedPreferences = {
        id: 'pref-123',
        user_id: 'user-123',
        email_notifications: true,
        push_notifications: true,
        deal_alerts: true,
        price_drop_alerts: true,
        booking_updates: true,
        system_notifications: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockCreatedPreferences] });

      const result = await preferenceService.createDefaultPreferences('user-123');

      expect(result).toEqual({
        id: 'pref-123',
        userId: 'user-123',
        emailNotifications: true,
        pushNotifications: true,
        dealAlerts: true,
        priceDropAlerts: true,
        bookingUpdates: true,
        systemNotifications: true,
        createdAt: mockCreatedPreferences.created_at,
        updatedAt: mockCreatedPreferences.updated_at
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notification_preferences'),
        ['user-123', true, true, true, true, true, true]
      );
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const mockUpdatedPreferences = {
        id: 'pref-123',
        user_id: 'user-123',
        email_notifications: false,
        push_notifications: true,
        deal_alerts: false,
        price_drop_alerts: true,
        booking_updates: true,
        system_notifications: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUpdatedPreferences] });

      const updates = {
        emailNotifications: false,
        dealAlerts: false,
        systemNotifications: false
      };

      const result = await preferenceService.updatePreferences('user-123', updates);

      expect(result).toEqual({
        id: 'pref-123',
        userId: 'user-123',
        emailNotifications: false,
        pushNotifications: true,
        dealAlerts: false,
        priceDropAlerts: true,
        bookingUpdates: true,
        systemNotifications: false,
        createdAt: mockUpdatedPreferences.created_at,
        updatedAt: mockUpdatedPreferences.updated_at
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notification_preferences'),
        expect.arrayContaining([false, false, false, 'user-123'])
      );
    });

    it('should throw error when no fields to update', async () => {
      await expect(preferenceService.updatePreferences('user-123', {}))
        .rejects.toThrow('No fields to update');
    });

    it('should throw error when preferences not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const updates = { emailNotifications: false };

      await expect(preferenceService.updatePreferences('user-123', updates))
        .rejects.toThrow('Notification preferences not found for user user-123');
    });
  });

  describe('getOrCreatePreferences', () => {
    it('should return existing preferences', async () => {
      const mockPreferences = {
        id: 'pref-123',
        user_id: 'user-123',
        email_notifications: true,
        push_notifications: true,
        deal_alerts: true,
        price_drop_alerts: true,
        booking_updates: true,
        system_notifications: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockPreferences] });

      const result = await preferenceService.getOrCreatePreferences('user-123');

      expect(result.id).toBe('pref-123');
      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });

    it('should create preferences when they do not exist', async () => {
      const mockCreatedPreferences = {
        id: 'pref-123',
        user_id: 'user-123',
        email_notifications: true,
        push_notifications: true,
        deal_alerts: true,
        price_drop_alerts: true,
        booking_updates: true,
        system_notifications: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // getUserPreferences returns empty
        .mockResolvedValueOnce({ rows: [mockCreatedPreferences] }); // createDefaultPreferences

      const result = await preferenceService.getOrCreatePreferences('user-123');

      expect(result.id).toBe('pref-123');
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('deleteUserPreferences', () => {
    it('should delete user preferences', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await preferenceService.deleteUserPreferences('user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM notification_preferences WHERE user_id = $1',
        ['user-123']
      );
    });
  });

  describe('isNotificationTypeEnabled', () => {
    it('should return true for enabled deal alerts', async () => {
      const mockPreferences = {
        id: 'pref-123',
        user_id: 'user-123',
        email_notifications: true,
        push_notifications: true,
        deal_alerts: true,
        price_drop_alerts: true,
        booking_updates: true,
        system_notifications: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockPreferences] });

      const result = await preferenceService.isNotificationTypeEnabled('user-123', 'deal_alert');

      expect(result).toBe(true);
    });

    it('should return false for disabled booking updates', async () => {
      const mockPreferences = {
        id: 'pref-123',
        user_id: 'user-123',
        email_notifications: true,
        push_notifications: true,
        deal_alerts: true,
        price_drop_alerts: true,
        booking_updates: false,
        system_notifications: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockPreferences] });

      const result = await preferenceService.isNotificationTypeEnabled('user-123', 'booking_confirmation');

      expect(result).toBe(false);
    });

    it('should return true when no preferences found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await preferenceService.isNotificationTypeEnabled('user-123', 'deal_alert');

      expect(result).toBe(true);
    });

    it('should return true for unknown notification types', async () => {
      const mockPreferences = {
        id: 'pref-123',
        user_id: 'user-123',
        email_notifications: true,
        push_notifications: true,
        deal_alerts: true,
        price_drop_alerts: true,
        booking_updates: true,
        system_notifications: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockPreferences] });

      const result = await preferenceService.isNotificationTypeEnabled('user-123', 'unknown_type');

      expect(result).toBe(true);
    });
  });
});