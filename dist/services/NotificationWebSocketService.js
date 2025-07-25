"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationWebSocketService = void 0;
const NotificationService_1 = require("./NotificationService");
const logger_1 = require("../utils/logger");
class NotificationWebSocketService {
    constructor(io, db) {
        this.io = io;
        this.notificationService = new NotificationService_1.NotificationService(db, io);
        this.setupSocketHandlers();
    }
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger_1.logger.info(`Client connected for notifications: ${socket.id}`);
            socket.on('join_notifications', (data) => {
                if (socket.user?.id === data.userId) {
                    socket.join(`user:${data.userId}`);
                    logger_1.logger.info(`User ${data.userId} joined notification room`);
                }
                else {
                    logger_1.logger.warn(`Unauthorized attempt to join notification room for user ${data.userId}`);
                }
            });
            socket.on('leave_notifications', (data) => {
                socket.leave(`user:${data.userId}`);
                logger_1.logger.info(`User ${data.userId} left notification room`);
            });
            socket.on('mark_notification_read', async (data) => {
                try {
                    if (!socket.user?.id) {
                        socket.emit('error', { message: 'User not authenticated' });
                        return;
                    }
                    await this.notificationService.markAsRead(data.notificationId, socket.user.id);
                    socket.emit('notification_marked_read', {
                        notificationId: data.notificationId,
                        success: true
                    });
                    logger_1.logger.debug(`Notification ${data.notificationId} marked as read via WebSocket`);
                }
                catch (error) {
                    logger_1.logger.error('Error marking notification as read via WebSocket:', error);
                    socket.emit('error', { message: 'Failed to mark notification as read' });
                }
            });
            socket.on('get_unread_count', async () => {
                try {
                    if (!socket.user?.id) {
                        socket.emit('error', { message: 'User not authenticated' });
                        return;
                    }
                    const count = await this.notificationService.getUnreadCount(socket.user.id);
                    socket.emit('unread_count', { count });
                }
                catch (error) {
                    logger_1.logger.error('Error getting unread count via WebSocket:', error);
                    socket.emit('error', { message: 'Failed to get unread count' });
                }
            });
            socket.on('disconnect', () => {
                logger_1.logger.info(`Client disconnected from notifications: ${socket.id}`);
            });
        });
    }
    async sendNotificationToUser(userId, notification) {
        try {
            this.io.to(`user:${userId}`).emit('notification', notification);
            logger_1.logger.debug(`Real-time notification sent to user ${userId}`);
        }
        catch (error) {
            logger_1.logger.error('Error sending real-time notification:', error);
        }
    }
    async sendUnreadCountUpdate(userId, count) {
        try {
            this.io.to(`user:${userId}`).emit('unread_count_update', { count });
            logger_1.logger.debug(`Unread count update sent to user ${userId}: ${count}`);
        }
        catch (error) {
            logger_1.logger.error('Error sending unread count update:', error);
        }
    }
    async broadcastSystemNotification(notification) {
        try {
            this.io.emit('system_notification', notification);
            logger_1.logger.info('System notification broadcasted to all users');
        }
        catch (error) {
            logger_1.logger.error('Error broadcasting system notification:', error);
        }
    }
    async sendNotificationToUsers(userIds, notification) {
        try {
            userIds.forEach(userId => {
                this.io.to(`user:${userId}`).emit('notification', notification);
            });
            logger_1.logger.debug(`Notification sent to ${userIds.length} users`);
        }
        catch (error) {
            logger_1.logger.error('Error sending notification to multiple users:', error);
        }
    }
    getConnectedUsersCount() {
        return this.io.sockets.sockets.size;
    }
    async getUsersInNotificationRooms() {
        const rooms = await this.io.in('/').allRooms();
        const notificationRooms = {};
        for (const room of rooms) {
            if (room.startsWith('user:')) {
                const sockets = await this.io.in(room).allSockets();
                notificationRooms[room] = sockets.size;
            }
        }
        return notificationRooms;
    }
}
exports.NotificationWebSocketService = NotificationWebSocketService;
//# sourceMappingURL=NotificationWebSocketService.js.map