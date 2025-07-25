"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const EmailService_1 = require("./EmailService");
const logger_1 = require("../utils/logger");
class NotificationService {
    constructor(db, io) {
        this.db = db;
        this.io = io;
        this.emailService = new EmailService_1.EmailService();
    }
    async createNotification(request, deliveryOptions = { realTime: true }) {
        try {
            const notification = await this.saveNotification(request);
            const preferences = await this.getUserPreferences(request.userId);
            if (deliveryOptions.realTime && this.io) {
                await this.sendRealTimeNotification(notification);
            }
            if (deliveryOptions.email && preferences.emailNotifications) {
                await this.sendEmailNotification(notification);
            }
            if (deliveryOptions.push && preferences.pushNotifications) {
                await this.sendPushNotification(notification);
            }
            await this.markNotificationAsSent(notification.id);
            logger_1.logger.info(`Notification created and sent: ${notification.id}`);
            return notification;
        }
        catch (error) {
            logger_1.logger.error('Error creating notification:', error);
            throw error;
        }
    }
    async saveNotification(request) {
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
            type: row.type,
            title: row.title,
            message: row.message,
            data: row.data,
            read: row.read,
            sentAt: row.sent_at,
            createdAt: row.created_at
        };
    }
    async sendRealTimeNotification(notification) {
        if (!this.io) {
            logger_1.logger.warn('Socket.IO not available for real-time notifications');
            return;
        }
        try {
            this.io.to(`user:${notification.userId}`).emit('notification', {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                createdAt: notification.createdAt
            });
            logger_1.logger.debug(`Real-time notification sent to user ${notification.userId}`);
        }
        catch (error) {
            logger_1.logger.error('Error sending real-time notification:', error);
        }
    }
    async sendEmailNotification(notification) {
        try {
            const userQuery = 'SELECT email FROM users WHERE id = $1';
            const userResult = await this.db.query(userQuery, [notification.userId]);
            if (userResult.rows.length === 0) {
                throw new Error(`User not found: ${notification.userId}`);
            }
            const userEmail = userResult.rows[0].email;
            const template = await this.getEmailTemplate(notification.type);
            if (template) {
                const emailData = {
                    to: userEmail,
                    subject: this.replaceTemplateVariables(template.subject, notification.data || {}),
                    template: template.name,
                    data: notification.data || {}
                };
                await this.emailService.sendTemplatedEmail(emailData);
                logger_1.logger.debug(`Email notification sent to ${userEmail}`);
            }
            else {
                await this.emailService.sendBasicEmail({
                    to: userEmail,
                    subject: notification.title,
                    text: notification.message,
                    html: `<p>${notification.message}</p>`
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error sending email notification:', error);
        }
    }
    async sendPushNotification(notification) {
        try {
            logger_1.logger.debug(`Push notification would be sent: ${notification.title}`);
            const pushData = {
                userId: notification.userId,
                title: notification.title,
                body: notification.message,
                data: notification.data
            };
            logger_1.logger.debug('Push notification data:', pushData);
        }
        catch (error) {
            logger_1.logger.error('Error sending push notification:', error);
        }
    }
    async getUserPreferences(userId) {
        const query = `
      SELECT email_notifications, push_notifications, deal_alerts, 
             price_drop_alerts, booking_updates, system_notifications
      FROM notification_preferences 
      WHERE user_id = $1
    `;
        const result = await this.db.query(query, [userId]);
        if (result.rows.length === 0) {
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
    async getEmailTemplate(type) {
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
    replaceTemplateVariables(template, data) {
        let result = template;
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, String(data[key] || ''));
        });
        return result;
    }
    async markNotificationAsSent(notificationId) {
        const query = 'UPDATE notifications SET sent_at = CURRENT_TIMESTAMP WHERE id = $1';
        await this.db.query(query, [notificationId]);
    }
    async getUserNotifications(userId, limit = 50, offset = 0) {
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
            type: row.type,
            title: row.title,
            message: row.message,
            data: row.data,
            read: row.read,
            sentAt: row.sent_at,
            createdAt: row.created_at
        }));
    }
    async markAsRead(notificationId, userId) {
        const query = 'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2';
        await this.db.query(query, [notificationId, userId]);
    }
    async markAllAsRead(userId) {
        const query = 'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false';
        await this.db.query(query, [userId]);
    }
    async getUnreadCount(userId) {
        const query = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false';
        const result = await this.db.query(query, [userId]);
        return parseInt(result.rows[0].count);
    }
    async sendBookingConfirmation(userId, bookingData) {
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
    async sendDealAlert(userId, dealData) {
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
    async sendPaymentConfirmation(userId, paymentData) {
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
exports.NotificationService = NotificationService;
//# sourceMappingURL=NotificationService.js.map