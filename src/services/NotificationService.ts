import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
import { 
  Notification, 
  NotificationType, 
  CreateNotificationRequest,
  NotificationDeliveryOptions,
  EmailNotificationData,
  PushNotificationData
} from '../models/Notification';
import { EmailService } from './EmailService';
import { logger } from '../utils/logger';

export class NotificationService {
  private db: Pool;
  private io?: SocketIOServer;
  private emailService: EmailService;

  constructor(db: Pool, io?: SocketIOServer) {
    this.db = db;
    this.io = io;
    this.emailService = new EmailService();
  }

  /**
   * Create and send a notification
   */
  async createNotification(
    request: CreateNotificationRequest,
    deliveryOptions: NotificationDeliveryOptions = { realTime: true }
  ): Promise<Notification> {
    try {
      // Create notification in database
      const notification = await this.saveNotification(request);

      // Get user preferences
      const preferences = await this.getUserPreferences(request.userId);

      // Send via different channels based on preferences and options
      if (deliveryOptions.realTime && this.io) {
        await this.sendRealTimeNotification(notification);
      }

      if (deliveryOptions.email && preferences.emailNotifications) {
        await this.sendEmailNotification(notification);
      }

      if (deliveryOptions.push && preferences.pushNotifications) {
        await this.sendPushNotification(notification);
      }

      // Mark as sent
      await this.markNotificationAsSent(notification.id);

      logger.info(`Notification created and sent: ${notification.id}`);
      return notification;

    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Save notification to database
   */
  private async saveNotification(request: CreateNotificationRequest): Promise<Notification> {
    const query = `
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, type, title, message, data, read, sent_at, created_at
    `;

    const values = [
      request.userId,
      request.type,
      request.title,
      request.message,
      JSON.stringify(request.data || {})
    ];

    const result = await this.db.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      title: row.title,
      message: row.message,
      data: row.data,
      read: row.read,
      sentAt: row.sent_at,
      createdAt: row.created_at
    };
  }

  /**
   * Send real-time notification via WebSocket
   */
  private async sendRealTimeNotification(notification: Notification): Promise<void> {
    if (!this.io) {
      logger.warn('Socket.IO not available for real-time notifications');
      return;
    }

    try {
      // Send to specific user room
      this.io.to(`user:${notification.userId}`).emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        createdAt: notification.createdAt
      });

      logger.debug(`Real-time notification sent to user ${notification.userId}`);
    } catch (error) {
      logger.error('Error sending real-time notification:', error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      // Get user email
      const userQuery = 'SELECT email FROM users WHERE id = $1';
      const userResult = await this.db.query(userQuery, [notification.userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error(`User not found: ${notification.userId}`);
      }

      const userEmail = userResult.rows[0].email;

      // Get email template
      const template = await this.getEmailTemplate(notification.type);
      
      if (template) {
        const emailData: EmailNotificationData = {
          to: userEmail,
          subject: this.replaceTemplateVariables(template.subject, notification.data || {}),
          template: template.name,
          data: notification.data || {}
        };

        await this.emailService.sendTemplatedEmail(emailData);
        logger.debug(`Email notification sent to ${userEmail}`);
      } else {
        // Send basic email if no template found
        await this.emailService.sendBasicEmail({
          to: userEmail,
          subject: notification.title,
          text: notification.message,
          html: `<p>${notification.message}</p>`
        });
      }

    } catch (error) {
      logger.error('Error sending email notification:', error);
    }
  }

  /**
   * Send push notification (placeholder for future implementation)
   */
  private async sendPushNotification(notification: Notification): Promise<void> {
    try {
      // This would integrate with a push notification service like FCM, APNs, etc.
      logger.debug(`Push notification would be sent: ${notification.title}`);
      
      // For now, just log the push notification data
      const pushData: PushNotificationData = {
        userId: notification.userId,
        title: notification.title,
        body: notification.message,
        data: notification.data
      };

      logger.debug('Push notification data:', pushData);
    } catch (error) {
      logger.error('Error sending push notification:', error);
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string) {
    const query = `
      SELECT email_notifications, push_notifications, deal_alerts, 
             price_drop_alerts, booking_updates, system_notifications
      FROM notification_preferences 
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      // Return default preferences if none exist
      return {
        emailNotifications: true,
        pushNotifications: true,
        dealAlerts: true,
        priceDropAlerts: true,
        bookingUpdates: true,
        systemNotifications: true
      };
    }

    const row = result.rows[0];
    return {
      emailNotifications: row.email_notifications,
      pushNotifications: row.push_notifications,
      dealAlerts: row.deal_alerts,
      priceDropAlerts: row.price_drop_alerts,
      bookingUpdates: row.booking_updates,
      systemNotifications: row.system_notifications
    };
  }

  /**
   * Get email template by notification type
   */
  private async getEmailTemplate(type: NotificationType) {
    const query = `
      SELECT name, subject, html_content, text_content, variables
      FROM email_templates 
      WHERE name = $1 AND is_active = true
    `;

    const result = await this.db.query(query, [type]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Replace template variables with actual values
   */
  private replaceTemplateVariables(template: string, data: Record<string, any>): string {
    let result = template;
    
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(data[key] || ''));
    });

    return result;
  }

  /**
   * Mark notification as sent
   */
  private async markNotificationAsSent(notificationId: string): Promise<void> {
    const query = 'UPDATE notifications SET sent_at = CURRENT_TIMESTAMP WHERE id = $1';
    await this.db.query(query, [notificationId]);
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    const query = `
      SELECT id, user_id, type, title, message, data, read, sent_at, created_at
      FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(query, [userId, limit, offset]);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      title: row.title,
      message: row.message,
      data: row.data,
      read: row.read,
      sentAt: row.sent_at,
      createdAt: row.created_at
    }));
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const query = 'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2';
    await this.db.query(query, [notificationId, userId]);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const query = 'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false';
    await this.db.query(query, [userId]);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false';
    const result = await this.db.query(query, [userId]);
    return parseInt(result.rows[0].count);
  }

  /**
   * Send booking confirmation notification
   */
  async sendBookingConfirmation(userId: string, bookingData: any): Promise<void> {
    await this.createNotification({
      userId,
      type: 'booking_confirmation',
      title: 'Booking Confirmed',
      message: `Your flight booking has been confirmed. Confirmation code: ${bookingData.confirmationCode}`,
      data: bookingData
    }, {
      email: true,
      realTime: true
    });
  }

  /**
   * Send deal alert notification
   */
  async sendDealAlert(userId: string, dealData: any): Promise<void> {
    await this.createNotification({
      userId,
      type: 'deal_alert',
      title: 'Great Deal Found!',
      message: `We found a great deal: ${dealData.origin} to ${dealData.destination} for ${dealData.price}`,
      data: dealData
    }, {
      email: true,
      push: true,
      realTime: true
    });
  }

  /**
   * Send payment confirmation notification
   */
  async sendPaymentConfirmation(userId: string, paymentData: any): Promise<void> {
    await this.createNotification({
      userId,
      type: 'payment_confirmation',
      title: 'Payment Confirmed',
      message: `Your payment of ${paymentData.amount} has been processed successfully.`,
      data: paymentData
    }, {
      email: true,
      realTime: true
    });
  }
}