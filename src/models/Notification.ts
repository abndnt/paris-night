export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  sentAt?: Date;
  createdAt: Date;
}

export type NotificationType = 
  | 'booking_confirmation'
  | 'booking_cancelled'
  | 'booking_modified'
  | 'deal_alert'
  | 'price_drop'
  | 'award_space_available'
  | 'payment_confirmation'
  | 'payment_failed'
  | 'system_notification';

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  dealAlerts: boolean;
  priceDropAlerts: boolean;
  bookingUpdates: boolean;
  systemNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

export interface NotificationDeliveryOptions {
  email?: boolean;
  push?: boolean;
  realTime?: boolean;
}

export interface EmailNotificationData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface PushNotificationData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}