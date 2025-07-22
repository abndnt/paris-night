import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
import { NotificationService } from '../services/NotificationService';
import { CreateNotificationRequest, NotificationType } from '../models/Notification';

// Mock dependencies
jest.mock('../utils/logger');
jest.mock('../services/EmailService');

describe('NotificationService', () => {
  let mockDb: jest.Mocked<Pool>;
  let mockIo: jest.Mocked<SocketIOServer>;
  let notificationService: NotificationService;

  beforeEach(() => {
    // Mock database
    mockDb = {
      query: jest.fn(),
    } as any;

    // Mock Socket.IO
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;

    notificationService = new NotificationService(mockDb, mockIo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create and send a notification successfully', async () => {
      const mockNotification = {
        id: 'test-id',
        userId: 'user-123',
        type: 'booking_confirmation' as NotificationType,
        title: 'Test Notification',
        message: 'Test message',
        data: { test: 'data' },
        read: false,
        sentAt: null,
        createdAt: new Date()
      };

      const mockPreferences = {
        emailNotifications: true,
        pushNotifications: true,
        dealAlerts: true,
        priceDropAlerts: true,
        bookingUpdates: true,
        systemNotifications: true
      };

      const mockUser = { email: 'test@example.com' };

      // Mock database queries
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockNotification] }) // saveNotification
        .mockResolvedValueOnce({ rows: [mockPreferences] }) // getUserPreferences
        .mockResolvedValueOnce({ rows: [mockUser] }) // get user email
        .mockResolvedValueOnce({ rows: [] }) // get email template
        .mockResolvedValueOnce({ rows: [] }); // markNotificationAsSent

      const request: CreateNotificationRequest = {
        userId: 'user-123',
        type: 'booking_confirmation',
        title: 'Test Notification',
        message: 'Test message',
        data: { test: 'data' }
      };

      const result = await notificationService.createNotification(request, {
        realTime: true,
        email: true
      });

      expect(result).toEqual(mockNotification);
      expect(mockDb.query).toHaveBeenCalledTimes(5);
      expect(mockIo.to).toHaveBeenCalledWith('user:user-123');
      expect(mockIo.emit).toHaveBeenCalledWith('notification', expect.any(Object));
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const request: CreateNotificationRequest = {
        userId: 'user-123',
        type: 'booking_confirmation',
        title: 'Test Notification',
        message: 'Test message'
      };

      await expect(notificationService.createNotification(request))
        .rejects.toThrow('Database error');
    });
  });

  describe('getUserNotifications', () => {
    it('should retrieve user notifications with pagination', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          user_id: 'user-123',
          type: 'booking_confirmation',
          title: 'Booking Confirmed',
          message: 'Your booking is confirmed',
          data: {},
          read: false,
          sent_at: new Date(),
          created_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockNotifications });

      const result = await notificationService.getUserNotifications('user-123', 10, 0);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-1');
      expect(result[0].userId).toBe('user-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, user_id, type'),
        ['user-123', 10, 0]
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await notificationService.markAsRead('notif-1', 'user-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
        ['notif-1', 'user-123']
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });

      const count = await notificationService.getUnreadCount('user-123');

      expect(count).toBe(5);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
        ['user-123']
      );
    });
  });

  describe('sendBookingConfirmation', () => {
    it('should send booking confirmation notification', async () => {
      const mockNotification = {
        id: 'test-id',
        userId: 'user-123',
        type: 'booking_confirmation' as NotificationType,
        title: 'Booking Confirmed',
        message: 'Your flight booking has been confirmed. Confirmation code: ABC123',
        data: { confirmationCode: 'ABC123' },
        read: false,
        sentAt: null,
        createdAt: new Date()
      };

      const mockPreferences = {
        emailNotifications: true,
        pushNotifications: true,
        dealAlerts: true,
        priceDropAlerts: true,
        bookingUpdates: true,
        systemNotifications: true
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockNotification] })
        .mockResolvedValueOnce({ rows: [mockPreferences] })
        .mockResolvedValueOnce({ rows: [{ email: 'test@example.com' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const bookingData = {
        confirmationCode: 'ABC123',
        origin: 'NYC',
        destination: 'LAX'
      };

      await notificationService.sendBookingConfirmation('user-123', bookingData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining(['user-123', 'booking_confirmation'])
      );
    });
  });

  describe('sendDealAlert', () => {
    it('should send deal alert notification', async () => {
      const mockNotification = {
        id: 'test-id',
        userId: 'user-123',
        type: 'deal_alert' as NotificationType,
        title: 'Great Deal Found!',
        message: 'We found a great deal: NYC to LAX for $299',
        data: { origin: 'NYC', destination: 'LAX', price: '$299' },
        read: false,
        sentAt: null,
        createdAt: new Date()
      };

      const mockPreferences = {
        emailNotifications: true,
        pushNotifications: true,
        dealAlerts: true,
        priceDropAlerts: true,
        bookingUpdates: true,
        systemNotifications: true
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockNotification] })
        .mockResolvedValueOnce({ rows: [mockPreferences] })
        .mockResolvedValueOnce({ rows: [{ email: 'test@example.com' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const dealData = {
        origin: 'NYC',
        destination: 'LAX',
        price: '$299'
      };

      await notificationService.sendDealAlert('user-123', dealData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining(['user-123', 'deal_alert'])
      );
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences', async () => {
      const mockPreferences = {
        email_notifications: true,
        push_notifications: false,
        deal_alerts: true,
        price_drop_alerts: true,
        booking_updates: true,
        system_notifications: false
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockPreferences] });

      const result = await notificationService.getUserPreferences('user-123');

      expect(result).toEqual({
        emailNotifications: true,
        pushNotifications: false,
        dealAlerts: true,
        priceDropAlerts: true,
        bookingUpdates: true,
        systemNotifications: false
      });
    });

    it('should return default preferences when none exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await notificationService.getUserPreferences('user-123');

      expect(result).toEqual({
        emailNotifications: true,
        pushNotifications: true,
        dealAlerts: true,
        priceDropAlerts: true,
        bookingUpdates: true,
        systemNotifications: true
      });
    });
  });
});