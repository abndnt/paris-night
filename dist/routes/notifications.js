"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotificationRoutes = void 0;
const express_1 = require("express");
const NotificationService_1 = require("../services/NotificationService");
const NotificationPreferenceService_1 = require("../services/NotificationPreferenceService");
const auth_1 = require("../middleware/auth");
const logger_1 = require("../utils/logger");
const createNotificationRoutes = (db, io) => {
    const router = (0, express_1.Router)();
    const notificationService = new NotificationService_1.NotificationService(db, io);
    const preferenceService = new NotificationPreferenceService_1.NotificationPreferenceService(db);
    router.get('/', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
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
        }
        catch (error) {
            logger_1.logger.error('Error getting notifications:', error);
            res.status(500).json({ error: 'Failed to get notifications' });
        }
    });
    router.patch('/:id/read', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const notificationId = req.params.id;
            await notificationService.markAsRead(notificationId, userId);
            res.json({ success: true });
        }
        catch (error) {
            logger_1.logger.error('Error marking notification as read:', error);
            res.status(500).json({ error: 'Failed to mark notification as read' });
        }
    });
    router.patch('/read-all', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            await notificationService.markAllAsRead(userId);
            res.json({ success: true });
        }
        catch (error) {
            logger_1.logger.error('Error marking all notifications as read:', error);
            res.status(500).json({ error: 'Failed to mark all notifications as read' });
        }
    });
    router.get('/unread-count', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const count = await notificationService.getUnreadCount(userId);
            res.json({ count });
        }
        catch (error) {
            logger_1.logger.error('Error getting unread count:', error);
            res.status(500).json({ error: 'Failed to get unread count' });
        }
    });
    router.get('/preferences', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const preferences = await preferenceService.getOrCreatePreferences(userId);
            res.json(preferences);
        }
        catch (error) {
            logger_1.logger.error('Error getting notification preferences:', error);
            res.status(500).json({ error: 'Failed to get notification preferences' });
        }
    });
    router.put('/preferences', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
            const { emailNotifications, pushNotifications, dealAlerts, priceDropAlerts, bookingUpdates, systemNotifications } = req.body;
            const updates = {};
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
        }
        catch (error) {
            logger_1.logger.error('Error updating notification preferences:', error);
            res.status(500).json({ error: 'Failed to update notification preferences' });
        }
    });
    router.post('/test', auth_1.authenticateToken, async (req, res) => {
        try {
            const userId = req.user.id;
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
        }
        catch (error) {
            logger_1.logger.error('Error sending test notification:', error);
            res.status(500).json({ error: 'Failed to send test notification' });
        }
    });
    return router;
};
exports.createNotificationRoutes = createNotificationRoutes;
//# sourceMappingURL=notifications.js.map