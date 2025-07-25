import { Server as SocketIOServer, Socket } from 'socket.io';
import { Pool } from 'pg';
export interface AuthenticatedSocket extends Socket {
    user?: {
        id: string;
        email: string;
    };
}
export declare class NotificationWebSocketService {
    private io;
    private notificationService;
    constructor(io: SocketIOServer, db: Pool);
    private setupSocketHandlers;
    sendNotificationToUser(userId: string, notification: any): Promise<void>;
    sendUnreadCountUpdate(userId: string, count: number): Promise<void>;
    broadcastSystemNotification(notification: any): Promise<void>;
    sendNotificationToUsers(userIds: string[], notification: any): Promise<void>;
    getConnectedUsersCount(): number;
    getUsersInNotificationRooms(): Promise<{
        [roomName: string]: number;
    }>;
}
//# sourceMappingURL=NotificationWebSocketService.d.ts.map