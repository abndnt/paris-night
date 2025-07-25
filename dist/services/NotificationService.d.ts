import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
import { Notification, CreateNotificationRequest, NotificationDeliveryOptions } from '../models/Notification';
export declare class NotificationService {
    private db;
    private io?;
    private emailService;
    constructor(db: Pool, io?: SocketIOServer);
    createNotification(request: CreateNotificationRequest, deliveryOptions?: NotificationDeliveryOptions): Promise<Notification>;
    private saveNotification;
    private sendRealTimeNotification;
    private sendEmailNotification;
    private sendPushNotification;
    getUserPreferences(userId: string): Promise<{
        emailNotifications: any;
        pushNotifications: any;
        dealAlerts: any;
        priceDropAlerts: any;
        bookingUpdates: any;
        systemNotifications: any;
    }>;
    private getEmailTemplate;
    private replaceTemplateVariables;
    private markNotificationAsSent;
    getUserNotifications(userId: string, limit?: number, offset?: number): Promise<Notification[]>;
    markAsRead(notificationId: string, userId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    getUnreadCount(userId: string): Promise<number>;
    sendBookingConfirmation(userId: string, bookingData: any): Promise<void>;
    sendDealAlert(userId: string, dealData: any): Promise<void>;
    sendPaymentConfirmation(userId: string, paymentData: any): Promise<void>;
}
//# sourceMappingURL=NotificationService.d.ts.map