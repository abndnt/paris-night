import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
import { NotificationService } from '../services/NotificationService';
import { NotificationPreferenceService } from '../services/NotificationPreferenceService';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

export const createNotificationRoutes = (db: Pool, io?: SocketIOServer): Router => {
  const router = Router();
  const notificationService = new NotificationService(db, io);
  const preferenceService = new NotificationPreferenceService(db);

  /**
   * Get user notifications
   */
  router.get('/', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const limit = parseInt((req.query as any).limit as string) || 50;
      const offset = parseInt((req.query as any).offset as string) || 0;

      const notifications = await notificationService.getUserNotifications(userId, limit, offset);
      const unreadCount = await notificationService.getUnreadCount(userId);

      res.json({
        notifications,
        unreadCount,
        pagination: {
          limit,
          offset,
          hasMore: notifications.length === limit
        }
      });

    } catch (error) {
      logger.error('Error getting notifications:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  });

  /**
   * Mark notification as read
   */
  router.patch('/:id/read', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const notificationId = (req.params as any).id;

      await notificationService.markAsRead(notificationId, userId);
      
      res.json({ success: true });

    } catch (error) {
      logger.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  /**
   * Mark all notifications as read
   */
  router.patch('/read-all', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;

      await notificationService.markAllAsRead(userId);
      
      res.json({ success: true });

    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  });

  /**
   * Get unread notification count
   */
  router.get('/unread-count', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;

      const count = await notificationService.getUnreadCount(userId);
      
      res.json({ count });

    } catch (error) {
      logger.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Failed to get unread count' });
    }
  });

  /**
   * Get notification preferences
   */
  router.get('/preferences', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;

      const preferences = await preferenceService.getOrCreatePreferences(userId);
      
      res.json(preferences);

    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      res.status(500).json({ error: 'Failed to get notification preferences' });
    }
  });

  /**
   * Update notification preferences
   */
  router.put('/preferences', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;

      const {
        emailNotifications,
        pushNotifications,
        dealAlerts,
        priceDropAlerts,
        bookingUpdates,
        systemNotifications
      } = req.body;

      // Validate input
      const updates: any = {};
      
      if (typeof emailNotifications === 'boolean') {
        updates.emailNotifications = emailNotifications;
      }
      if (typeof pushNotifications === 'boolean') {
        updates.pushNotifications = pushNotifications;
      }
      if (typeof dealAlerts === 'boolean') {
        updates.dealAlerts = dealAlerts;
      }
      if (typeof priceDropAlerts === 'boolean') {
        updates.priceDropAlerts = priceDropAlerts;
      }
      if (typeof bookingUpdates === 'boolean') {
        updates.bookingUpdates = bookingUpdates;
      }
      if (typeof systemNotifications === 'boolean') {
        updates.systemNotifications = systemNotifications;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No valid preferences provided' });
        return;
      }

      const preferences = await preferenceService.updatePreferences(userId, updates);
      
      res.json(preferences);

    } catch (error) {
      logger.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });

  /**
   * Test notification endpoint (for development)
   */
  router.post('/test', authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;

      const { type, title, message, data } = req.body;

      if (!type || !title || !message) {
        res.status(400).json({ error: 'Type, title, and message are required' });
        return;
      }

      const notification = await notificationService.createNotification({
        userId,
        type,
        title,
        message,
        data: data || {}
      }, {
        email: true,
        realTime: true
      });

      res.json({ success: true, notification });

    } catch (error) {
      logger.error('Error sending test notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });

  return router;
};