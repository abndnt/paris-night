"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationPreferenceService = void 0;
const logger_1 = require("../utils/logger");
class NotificationPreferenceService {
    constructor(db) {
        this.db = db;
    }
    async getUserPreferences(userId) {
        try {
            const query = `
        SELECT id, user_id, email_notifications, push_notifications, 
               deal_alerts, price_drop_alerts, booking_updates, 
               system_notifications, created_at, updated_at
        FROM notification_preferences 
        WHERE user_id = $1
      `;
            const result = await this.db.query(query, [userId]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                id: row.id,
                userId: row.user_id,
                emailNotifications: row.email_notifications,
                pushNotifications: row.push_notifications,
                dealAlerts: row.deal_alerts,
                priceDropAlerts: row.price_drop_alerts,
                bookingUpdates: row.booking_updates,
                systemNotifications: row.system_notifications,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting user preferences:', error);
            throw error;
        }
    }
    async createDefaultPreferences(userId) {
        try {
            const query = `
        INSERT INTO notification_preferences (
          user_id, email_notifications, push_notifications, 
          deal_alerts, price_drop_alerts, booking_updates, system_notifications
        )
        VALUES ($1, true, true, true, true, true, true)
        RETURNING id, user_id, email_notifications, push_notifications, 
                  deal_alerts, price_drop_alerts, booking_updates, 
                  system_notifications, created_at, updated_at
      `;
            const result = await this.db.query(query, [userId]);
            const row = result.rows[0];
            const preferences = {
                id: row.id,
                userId: row.user_id,
                emailNotifications: row.email_notifications,
                pushNotifications: row.push_notifications,
                dealAlerts: row.deal_alerts,
                priceDropAlerts: row.price_drop_alerts,
                bookingUpdates: row.booking_updates,
                systemNotifications: row.system_notifications,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
            logger_1.logger.info(`Default notification preferences created for user ${userId}`);
            return preferences;
        }
        catch (error) {
            logger_1.logger.error('Error creating default preferences:', error);
            throw error;
        }
    }
    async updatePreferences(userId, updates) {
        try {
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            if (updates.emailNotifications !== undefined) {
                updateFields.push(`email_notifications = $${paramIndex++}`);
                values.push(updates.emailNotifications);
            }
            if (updates.pushNotifications !== undefined) {
                updateFields.push(`push_notifications = $${paramIndex++}`);
                values.push(updates.pushNotifications);
            }
            if (updates.dealAlerts !== undefined) {
                updateFields.push(`deal_alerts = $${paramIndex++}`);
                values.push(updates.dealAlerts);
            }
            if (updates.priceDropAlerts !== undefined) {
                updateFields.push(`price_drop_alerts = $${paramIndex++}`);
                values.push(updates.priceDropAlerts);
            }
            if (updates.bookingUpdates !== undefined) {
                updateFields.push(`booking_updates = $${paramIndex++}`);
                values.push(updates.bookingUpdates);
            }
            if (updates.systemNotifications !== undefined) {
                updateFields.push(`system_notifications = $${paramIndex++}`);
                values.push(updates.systemNotifications);
            }
            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }
            values.push(userId);
            const query = `
        UPDATE notification_preferences 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $${paramIndex}
        RETURNING id, user_id, email_notifications, push_notifications, 
                  deal_alerts, price_drop_alerts, booking_updates, 
                  system_notifications, created_at, updated_at
      `;
            const result = await this.db.query(query, values);
            if (result.rows.length === 0) {
                throw new Error(`Notification preferences not found for user ${userId}`);
            }
            const row = result.rows[0];
            const preferences = {
                id: row.id,
                userId: row.user_id,
                emailNotifications: row.email_notifications,
                pushNotifications: row.push_notifications,
                dealAlerts: row.deal_alerts,
                priceDropAlerts: row.price_drop_alerts,
                bookingUpdates: row.booking_updates,
                systemNotifications: row.system_notifications,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
            logger_1.logger.info(`Notification preferences updated for user ${userId}`);
            return preferences;
        }
        catch (error) {
            logger_1.logger.error('Error updating preferences:', error);
            throw error;
        }
    }
    async getOrCreatePreferences(userId) {
        try {
            let preferences = await this.getUserPreferences(userId);
            if (!preferences) {
                preferences = await this.createDefaultPreferences(userId);
            }
            return preferences;
        }
        catch (error) {
            logger_1.logger.error('Error getting or creating preferences:', error);
            throw error;
        }
    }
    async deleteUserPreferences(userId) {
        try {
            const query = 'DELETE FROM notification_preferences WHERE user_id = $1';
            await this.db.query(query, [userId]);
            logger_1.logger.info(`Notification preferences deleted for user ${userId}`);
        }
        catch (error) {
            logger_1.logger.error('Error deleting user preferences:', error);
            throw error;
        }
    }
    async isNotificationTypeEnabled(userId, notificationType) {
        try {
            const preferences = await this.getUserPreferences(userId);
            if (!preferences) {
                return true;
            }
            switch (notificationType) {
                case 'deal_alert':
                case 'price_drop':
                    return preferences.dealAlerts && preferences.priceDropAlerts;
                case 'booking_confirmation':
                case 'booking_cancelled':
                case 'booking_modified':
                    return preferences.bookingUpdates;
                case 'system_notification':
                    return preferences.systemNotifications;
                default:
                    return true;
            }
        }
        catch (error) {
            logger_1.logger.error('Error checking notification type enabled:', error);
            return true;
        }
    }
}
exports.NotificationPreferenceService = NotificationPreferenceService;
//# sourceMappingURL=NotificationPreferenceService.js.map