import { Server as SocketIOServer, Socket } from 'socket.io';
import { Pool } from 'pg';
import { NotificationService } from './NotificationService';
import { logger } from '../utils/logger';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
  };
}

export class NotificationWebSocketService {
  private io: SocketIOServer;
  private notificationService: NotificationService;

  constructor(io: SocketIOServer, db: Pool) {
    this.io = io;
    this.notificationService = new NotificationService(db, io);
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Client connected for notifications: ${socket.id}`);

      // Join user-specific room for notifications
      socket.on('join_notifications', (data: { userId: string }) => {
        if (socket.user?.id === data.userId) {
          socket.join(`user:${data.userId}`);
          logger.info(`User ${data.userId} joined notification room`);
        } else {
          logger.warn(`Unauthorized attempt to join notification room for user ${data.userId}`);
        }
      });

      // Leave user-specific room
      socket.on('leave_notifications', (data: { userId: string }) => {
        socket.leave(`user:${data.userId}`);
        logger.info(`User ${data.userId} left notification room`);
      });

      // Mark notification as read via WebSocket
      socket.on('mark_notification_read', async (data: { notificationId: string }) => {
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

          logger.debug(`Notification ${data.notificationId} marked as read via WebSocket`);

        } catch (error) {
          logger.error('Error marking notification as read via WebSocket:', error);
          socket.emit('error', { message: 'Failed to mark notification as read' });
        }
      });

      // Get unread count via WebSocket
      socket.on('get_unread_count', async () => {
        try {
          if (!socket.user?.id) {
            socket.emit('error', { message: 'User not authenticated' });
            return;
          }

          const count = await this.notificationService.getUnreadCount(socket.user.id);
          
          socket.emit('unread_count', { count });

        } catch (error) {
          logger.error('Error getting unread count via WebSocket:', error);
          socket.emit('error', { message: 'Failed to get unread count' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`Client disconnected from notifications: ${socket.id}`);
      });
    });
  }

  /**
   * Send real-time notification to specific user
   */
  async sendNotificationToUser(userId: string, notification: any): Promise<void> {
    try {
      this.io.to(`user:${userId}`).emit('notification', notification);
      logger.debug(`Real-time notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending real-time notification:', error);
    }
  }

  /**
   * Send notification count update to user
   */
  async sendUnreadCountUpdate(userId: string, count: number): Promise<void> {
    try {
      this.io.to(`user:${userId}`).emit('unread_count_update', { count });
      logger.debug(`Unread count update sent to user ${userId}: ${count}`);
    } catch (error) {
      logger.error('Error sending unread count update:', error);
    }
  }

  /**
   * Broadcast system notification to all connected users
   */
  async broadcastSystemNotification(notification: any): Promise<void> {
    try {
      this.io.emit('system_notification', notification);
      logger.info('System notification broadcasted to all users');
    } catch (error) {
      logger.error('Error broadcasting system notification:', error);
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendNotificationToUsers(userIds: string[], notification: any): Promise<void> {
    try {
      userIds.forEach(userId => {
        this.io.to(`user:${userId}`).emit('notification', notification);
      });
      logger.debug(`Notification sent to ${userIds.length} users`);
    } catch (error) {
      logger.error('Error sending notification to multiple users:', error);
    }
  }

  /**
   * Get connected users count (for monitoring)
   */
  getConnectedUsersCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get users in notification rooms (for monitoring)
   */
  async getUsersInNotificationRooms(): Promise<{ [roomName: string]: number }> {
    const rooms = await this.io.in('/').allRooms();
    const notificationRooms: { [roomName: string]: number } = {};

    for (const room of rooms) {
      if (room.startsWith('user:')) {
        const sockets = await this.io.in(room).allSockets();
        notificationRooms[room] = sockets.size;
      }
    }

    return notificationRooms;
  }
}