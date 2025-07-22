/**
 * Notification System Usage Examples
 * 
 * This file demonstrates how to use the notification system
 * in various scenarios throughout the application.
 */

import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
import { NotificationService } from '../services/NotificationService';
import { NotificationPreferenceService } from '../services/NotificationPreferenceService';
import { NotificationWebSocketService } from '../services/NotificationWebSocketService';

// Example: Initialize notification services
export async function initializeNotificationServices(db: Pool, io: SocketIOServer) {
  const notificationService = new NotificationService(db, io);
  const preferenceService = new NotificationPreferenceService(db);
  const webSocketService = new NotificationWebSocketService(io, db);

  return {
    notificationService,
    preferenceService,
    webSocketService
  };
}

// Example: Send booking confirmation notification
export async function sendBookingConfirmationExample(
  notificationService: NotificationService,
  userId: string,
  bookingData: any
) {
  try {
    await notificationService.sendBookingConfirmation(userId, {
      confirmationCode: bookingData.confirmationCode,
      origin: bookingData.origin,
      destination: bookingData.destination,
      departureDate: bookingData.departureDate,
      passengerCount: bookingData.passengers.length,
      totalCost: bookingData.totalCost
    });

    console.log('✅ Booking confirmation notification sent successfully');
  } catch (error) {
    console.error('❌ Failed to send booking confirmation:', error);
  }
}

// Example: Send deal alert notification
export async function sendDealAlertExample(
  notificationService: NotificationService,
  userId: string,
  dealData: any
) {
  try {
    await notificationService.sendDealAlert(userId, {
      origin: dealData.origin,
      destination: dealData.destination,
      price: dealData.price,
      departureDate: dealData.departureDate,
      bookingUrl: `https://app.example.com/book/${dealData.searchId}`
    });

    console.log('✅ Deal alert notification sent successfully');
  } catch (error) {
    console.error('❌ Failed to send deal alert:', error);
  }
}

// Example: Send payment confirmation notification
export async function sendPaymentConfirmationExample(
  notificationService: NotificationService,
  userId: string,
  paymentData: any
) {
  try {
    await notificationService.sendPaymentConfirmation(userId, {
      amount: paymentData.amount,
      transactionId: paymentData.transactionId,
      paymentDate: new Date().toISOString()
    });

    console.log('✅ Payment confirmation notification sent successfully');
  } catch (error) {
    console.error('❌ Failed to send payment confirmation:', error);
  }
}

// Example: Create custom notification
export async function sendCustomNotificationExample(
  notificationService: NotificationService,
  userId: string
) {
  try {
    const notification = await notificationService.createNotification({
      userId,
      type: 'system_notification',
      title: 'Welcome to Flight Search SaaS!',
      message: 'Thank you for joining our platform. Start searching for your next adventure!',
      data: {
        welcomeBonus: 1000,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    }, {
      email: true,
      realTime: true,
      push: false
    });

    console.log('✅ Custom notification created:', notification.id);
  } catch (error) {
    console.error('❌ Failed to create custom notification:', error);
  }
}

// Example: Manage user notification preferences
export async function manageNotificationPreferencesExample(
  preferenceService: NotificationPreferenceService,
  userId: string
) {
  try {
    // Get or create default preferences
    let preferences = await preferenceService.getOrCreatePreferences(userId);
    console.log('📋 Current preferences:', preferences);

    // Update preferences
    const updatedPreferences = await preferenceService.updatePreferences(userId, {
      emailNotifications: true,
      pushNotifications: false,
      dealAlerts: true,
      priceDropAlerts: true,
      bookingUpdates: true,
      systemNotifications: false
    });

    console.log('✅ Preferences updated:', updatedPreferences);

    // Check if specific notification type is enabled
    const isDealAlertEnabled = await preferenceService.isNotificationTypeEnabled(userId, 'deal_alert');
    console.log('🔔 Deal alerts enabled:', isDealAlertEnabled);

  } catch (error) {
    console.error('❌ Failed to manage preferences:', error);
  }
}

// Example: Handle real-time notifications via WebSocket
export async function handleRealTimeNotificationsExample(
  webSocketService: NotificationWebSocketService,
  userId: string
) {
  try {
    // Send real-time notification to specific user
    await webSocketService.sendNotificationToUser(userId, {
      id: 'notif-123',
      type: 'price_drop',
      title: 'Price Drop Alert!',
      message: 'The price for your saved search has dropped by 20%',
      data: {
        originalPrice: '$500',
        newPrice: '$400',
        savings: '$100'
      },
      createdAt: new Date()
    });

    // Send unread count update
    await webSocketService.sendUnreadCountUpdate(userId, 3);

    // Broadcast system notification
    await webSocketService.broadcastSystemNotification({
      type: 'system_notification',
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur tonight from 2-4 AM EST',
      data: {
        maintenanceStart: '2024-01-15T07:00:00Z',
        maintenanceEnd: '2024-01-15T09:00:00Z'
      }
    });

    console.log('✅ Real-time notifications sent successfully');
  } catch (error) {
    console.error('❌ Failed to send real-time notifications:', error);
  }
}

// Example: Bulk notification sending
export async function sendBulkNotificationsExample(
  notificationService: NotificationService,
  userIds: string[]
) {
  try {
    const notifications = await Promise.all(
      userIds.map(userId => 
        notificationService.createNotification({
          userId,
          type: 'system_notification',
          title: 'New Feature Available!',
          message: 'Check out our new route optimization feature for better deals.',
          data: {
            featureName: 'Route Optimization',
            learnMoreUrl: 'https://app.example.com/features/route-optimization'
          }
        }, {
          email: false,
          realTime: true,
          push: true
        })
      )
    );

    console.log(`✅ Sent ${notifications.length} bulk notifications`);
  } catch (error) {
    console.error('❌ Failed to send bulk notifications:', error);
  }
}

// Example: Notification analytics and monitoring
export async function notificationAnalyticsExample(
  notificationService: NotificationService,
  webSocketService: NotificationWebSocketService,
  userId: string
) {
  try {
    // Get user notifications with pagination
    const notifications = await notificationService.getUserNotifications(userId, 10, 0);
    console.log(`📊 User has ${notifications.length} recent notifications`);

    // Get unread count
    const unreadCount = await notificationService.getUnreadCount(userId);
    console.log(`📬 Unread notifications: ${unreadCount}`);

    // Get WebSocket connection stats
    const connectedUsers = webSocketService.getConnectedUsersCount();
    console.log(`🔗 Connected users: ${connectedUsers}`);

    const notificationRooms = await webSocketService.getUsersInNotificationRooms();
    console.log('🏠 Users in notification rooms:', notificationRooms);

  } catch (error) {
    console.error('❌ Failed to get notification analytics:', error);
  }
}

// Example: Integration with booking service
export async function integrateWithBookingServiceExample(
  notificationService: NotificationService,
  bookingData: any
) {
  try {
    // This would typically be called from the BookingService
    // when a booking status changes

    switch (bookingData.status) {
      case 'confirmed':
        await notificationService.sendBookingConfirmation(
          bookingData.userId,
          bookingData
        );
        break;

      case 'cancelled':
        await notificationService.createNotification({
          userId: bookingData.userId,
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          message: `Your booking ${bookingData.confirmationCode} has been cancelled.`,
          data: bookingData
        }, {
          email: true,
          realTime: true
        });
        break;

      case 'modified':
        await notificationService.createNotification({
          userId: bookingData.userId,
          type: 'booking_modified',
          title: 'Booking Modified',
          message: `Your booking ${bookingData.confirmationCode} has been updated.`,
          data: bookingData
        }, {
          email: true,
          realTime: true
        });
        break;
    }

    console.log(`✅ Booking notification sent for status: ${bookingData.status}`);
  } catch (error) {
    console.error('❌ Failed to send booking notification:', error);
  }
}

// Example: Integration with flight search service
export async function integrateWithFlightSearchExample(
  notificationService: NotificationService,
  userId: string,
  searchData: any
) {
  try {
    // This would be called when a saved search finds new deals
    if (searchData.priceDropDetected) {
      await notificationService.createNotification({
        userId,
        type: 'price_drop',
        title: 'Price Drop Alert!',
        message: `Price dropped for ${searchData.origin} to ${searchData.destination}`,
        data: {
          ...searchData,
          savings: searchData.originalPrice - searchData.newPrice
        }
      }, {
        email: true,
        realTime: true,
        push: true
      });
    }

    if (searchData.newAwardSpaceAvailable) {
      await notificationService.createNotification({
        userId,
        type: 'award_space_available',
        title: 'Award Space Available!',
        message: `Award seats now available for your saved search`,
        data: searchData
      }, {
        email: true,
        realTime: true,
        push: true
      });
    }

    console.log('✅ Flight search notifications processed');
  } catch (error) {
    console.error('❌ Failed to process flight search notifications:', error);
  }
}