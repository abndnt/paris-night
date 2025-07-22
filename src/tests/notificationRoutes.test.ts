import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
import { createNotificationRoutes } from '../routes/notifications';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Mock dependencies
jest.mock('../services/NotificationService');
jest.mock('../services/NotificationPreferenceService');
jest.mock('../utils/logger');

describe('Notification Routes', () => {
  let app: express.Application;
  let mockDb: jest.Mocked<Pool>;
  let mockIo: jest.Mocked<SocketIOServer>;
  let validToken: string;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    } as any;

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    app = express();
    app.use(express.json());
    app.use('/notifications', createNotificationRoutes(mockDb, mockIo));

    // Create valid JWT token for testing
    validToken = jwt.sign(
      { id: 'user-123', email: 'test@example.com' },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /notifications', () => {
    it('should return user notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: 'user-123',
          type: 'booking_confirmation',
          title: 'Booking Confirmed',
          message: 'Your booking is confirmed',
          data: {},
          read: false,
          sentAt: new Date(),
          createdAt: new Date()
        }
      ];

      // Mock NotificationService methods
      const { NotificationService } = require('../services/NotificationService');
      NotificationService.prototype.getUserNotifications = jest.fn().mockResolvedValue(mockNotifications);
      NotificationService.prototype.getUnreadCount = jest.fn().mockResolvedValue(1);

      const response = await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        notifications: mockNotifications,
        unreadCount: 1,
        pagination: {
          limit: 50,
          offset: 0,
          hasMore: false
        }
      });
    });

    it('should return 401 without valid token', async () => {
      await request(app)
        .get('/notifications')
        .expect(401);
    });

    it('should handle pagination parameters', async () => {
      const { NotificationService } = require('../services/NotificationService');
      NotificationService.prototype.getUserNotifications = jest.fn().mockResolvedValue([]);
      NotificationService.prototype.getUnreadCount = jest.fn().mockResolvedValue(0);

      await request(app)
        .get('/notifications?limit=10&offset=20')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(NotificationService.prototype.getUserNotifications)
        .toHaveBeenCalledWith('user-123', 10, 20);
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const { NotificationService } = require('../services/NotificationService');
      NotificationService.prototype.markAsRead = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .patch('/notifications/notif-123/read')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(NotificationService.prototype.markAsRead)
        .toHaveBeenCalledWith('notif-123', 'user-123');
    });

    it('should return 401 without valid token', async () => {
      await request(app)
        .patch('/notifications/notif-123/read')
        .expect(401);
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const { NotificationService } = require('../services/NotificationService');
      NotificationService.prototype.markAllAsRead = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .patch('/notifications/read-all')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(NotificationService.prototype.markAllAsRead)
        .toHaveBeenCalledWith('user-123');
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('should return unread notification count', async () => {
      const { NotificationService } = require('../services/NotificationService');
      NotificationService.prototype.getUnreadCount = jest.fn().mockResolvedValue(5);

      const response = await request(app)
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({ count: 5 });
    });
  });

  describe('GET /notifications/preferences', () => {
    it('should return user notification preferences', async () => {
      const mockPreferences = {
        id: 'pref-123',
        userId: 'user-123',
        emailNotifications: true,
        pushNotifications: false,
        dealAlerts: true,
        priceDropAlerts: true,
        bookingUpdates: true,
        systemNotifications: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { NotificationPreferenceService } = require('../services/NotificationPreferenceService');
      NotificationPreferenceService.prototype.getOrCreatePreferences = jest.fn().mockResolvedValue(mockPreferences);

      const response = await request(app)
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual(mockPreferences);
    });
  });

  describe('PUT /notifications/preferences', () => {
    it('should update notification preferences', async () => {
      const mockUpdatedPreferences = {
        id: 'pref-123',
        userId: 'user-123',
        emailNotifications: false,
        pushNotifications: true,
        dealAlerts: false,
        priceDropAlerts: true,
        bookingUpdates: true,
        systemNotifications: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { NotificationPreferenceService } = require('../services/NotificationPreferenceService');
      NotificationPreferenceService.prototype.updatePreferences = jest.fn().mockResolvedValue(mockUpdatedPreferences);

      const updateData = {
        emailNotifications: false,
        pushNotifications: true,
        dealAlerts: false
      };

      const response = await request(app)
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(mockUpdatedPreferences);
      expect(NotificationPreferenceService.prototype.updatePreferences)
        .toHaveBeenCalledWith('user-123', {
          emailNotifications: false,
          pushNotifications: true,
          dealAlerts: false
        });
    });

    it('should return 400 for invalid preferences', async () => {
      const updateData = {
        invalidField: 'invalid'
      };

      await request(app)
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData)
        .expect(400);
    });

    it('should ignore non-boolean values', async () => {
      const { NotificationPreferenceService } = require('../services/NotificationPreferenceService');
      NotificationPreferenceService.prototype.updatePreferences = jest.fn().mockResolvedValue({});

      const updateData = {
        emailNotifications: 'not-boolean',
        pushNotifications: true,
        dealAlerts: 123
      };

      await request(app)
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData)
        .expect(200);

      expect(NotificationPreferenceService.prototype.updatePreferences)
        .toHaveBeenCalledWith('user-123', {
          pushNotifications: true
        });
    });
  });

  describe('POST /notifications/test', () => {
    it('should send test notification', async () => {
      const mockNotification = {
        id: 'notif-123',
        userId: 'user-123',
        type: 'system_notification',
        title: 'Test Notification',
        message: 'This is a test',
        data: { test: true },
        read: false,
        sentAt: null,
        createdAt: new Date()
      };

      const { NotificationService } = require('../services/NotificationService');
      NotificationService.prototype.createNotification = jest.fn().mockResolvedValue(mockNotification);

      const testData = {
        type: 'system_notification',
        title: 'Test Notification',
        message: 'This is a test',
        data: { test: true }
      };

      const response = await request(app)
        .post('/notifications/test')
        .set('Authorization', `Bearer ${validToken}`)
        .send(testData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        notification: mockNotification
      });

      expect(NotificationService.prototype.createNotification)
        .toHaveBeenCalledWith({
          userId: 'user-123',
          type: 'system_notification',
          title: 'Test Notification',
          message: 'This is a test',
          data: { test: true }
        }, {
          email: true,
          realTime: true
        });
    });

    it('should return 400 for missing required fields', async () => {
      const testData = {
        title: 'Test Notification'
        // missing type and message
      };

      await request(app)
        .post('/notifications/test')
        .set('Authorization', `Bearer ${validToken}`)
        .send(testData)
        .expect(400);
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      const { NotificationService } = require('../services/NotificationService');
      NotificationService.prototype.getUserNotifications = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/notifications')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(500);
    });

    it('should handle preference service errors gracefully', async () => {
      const { NotificationPreferenceService } = require('../services/NotificationPreferenceService');
      NotificationPreferenceService.prototype.getOrCreatePreferences = jest.fn().mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(500);
    });
  });
});