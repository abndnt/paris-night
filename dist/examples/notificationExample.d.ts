import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
import { NotificationService } from '../services/NotificationService';
import { NotificationPreferenceService } from '../services/NotificationPreferenceService';
import { NotificationWebSocketService } from '../services/NotificationWebSocketService';
export declare function initializeNotificationServices(db: Pool, io: SocketIOServer): Promise<{
    notificationService: NotificationService;
    preferenceService: NotificationPreferenceService;
    webSocketService: NotificationWebSocketService;
}>;
export declare function sendBookingConfirmationExample(notificationService: NotificationService, userId: string, bookingData: any): Promise<void>;
export declare function sendDealAlertExample(notificationService: NotificationService, userId: string, dealData: any): Promise<void>;
export declare function sendPaymentConfirmationExample(notificationService: NotificationService, userId: string, paymentData: any): Promise<void>;
export declare function sendCustomNotificationExample(notificationService: NotificationService, userId: string): Promise<void>;
export declare function manageNotificationPreferencesExample(preferenceService: NotificationPreferenceService, userId: string): Promise<void>;
export declare function handleRealTimeNotificationsExample(webSocketService: NotificationWebSocketService, userId: string): Promise<void>;
export declare function sendBulkNotificationsExample(notificationService: NotificationService, userIds: string[]): Promise<void>;
export declare function notificationAnalyticsExample(notificationService: NotificationService, webSocketService: NotificationWebSocketService, userId: string): Promise<void>;
export declare function integrateWithBookingServiceExample(notificationService: NotificationService, bookingData: any): Promise<void>;
export declare function integrateWithFlightSearchExample(notificationService: NotificationService, userId: string, searchData: any): Promise<void>;
//# sourceMappingURL=notificationExample.d.ts.map