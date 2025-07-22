import { Pool } from 'pg';
import { NotificationPreferences } from '../models/Notification';
import { logger } from '../utils/logger';

export class NotificationPreferenceService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
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

    } catch (error) {
      logger.error('Error getting user preferences:', error);
      throw error;
    }
  }

  /**
   * Create default notification preferences for a new user
   */
  async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
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

      const preferences: NotificationPreferences = {
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

      logger.info(`Default notification preferences created for user ${userId}`);
      return preferences;

    } catch (error) {
      logger.error('Error creating default preferences:', error);
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string, 
    updates: Partial<Omit<NotificationPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<NotificationPreferences> {
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
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
      const preferences: NotificationPreferences = {
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

      logger.info(`Notification preferences updated for user ${userId}`);
      return preferences;

    } catch (error) {
      logger.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Get or create user preferences
   */
  async getOrCreatePreferences(userId: string): Promise<NotificationPreferences> {
    try {
      let preferences = await this.getUserPreferences(userId);
      
      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }

      return preferences;

    } catch (error) {
      logger.error('Error getting or creating preferences:', error);
      throw error;
    }
  }

  /**
   * Delete user preferences (for user deletion)
   */
  async deleteUserPreferences(userId: string): Promise<void> {
    try {
      const query = 'DELETE FROM notification_preferences WHERE user_id = $1';
      await this.db.query(query, [userId]);
      
      logger.info(`Notification preferences deleted for user ${userId}`);

    } catch (error) {
      logger.error('Error deleting user preferences:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific notification type enabled
   */
  async isNotificationTypeEnabled(userId: string, notificationType: string): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      if (!preferences) {
        return true; // Default to enabled if no preferences found
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

    } catch (error) {
      logger.error('Error checking notification type enabled:', error);
      return true; // Default to enabled on error
    }
  }
}