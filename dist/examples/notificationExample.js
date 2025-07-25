"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeNotificationServices = initializeNotificationServices;
exports.sendBookingConfirmationExample = sendBookingConfirmationExample;
exports.sendDealAlertExample = sendDealAlertExample;
exports.sendPaymentConfirmationExample = sendPaymentConfirmationExample;
exports.sendCustomNotificationExample = sendCustomNotificationExample;
exports.manageNotificationPreferencesExample = manageNotificationPreferencesExample;
exports.handleRealTimeNotificationsExample = handleRealTimeNotificationsExample;
exports.sendBulkNotificationsExample = sendBulkNotificationsExample;
exports.notificationAnalyticsExample = notificationAnalyticsExample;
exports.integrateWithBookingServiceExample = integrateWithBookingServiceExample;
exports.integrateWithFlightSearchExample = integrateWithFlightSearchExample;
const NotificationService_1 = require("../services/NotificationService");
const NotificationPreferenceService_1 = require("../services/NotificationPreferenceService");
const NotificationWebSocketService_1 = require("../services/NotificationWebSocketService");
async function initializeNotificationServices(db, io) {
    const notificationService = new NotificationService_1.NotificationService(db, io);
    const preferenceService = new NotificationPreferenceService_1.NotificationPreferenceService(db);
    const webSocketService = new NotificationWebSocketService_1.NotificationWebSocketService(io, db);
    return {
        notificationService,
        preferenceService,
        webSocketService
    };
}
async function sendBookingConfirmationExample(notificationService, userId, bookingData) {
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
    }
    catch (error) {
        console.error('❌ Failed to send booking confirmation:', error);
    }
}
async function sendDealAlertExample(notificationService, userId, dealData) {
    try {
        await notificationService.sendDealAlert(userId, {
            origin: dealData.origin,
            destination: dealData.destination,
            price: dealData.price,
            departureDate: dealData.departureDate,
            bookingUrl: `https://app.example.com/book/${dealData.searchId}`
        });
        console.log('✅ Deal alert notification sent successfully');
    }
    catch (error) {
        console.error('❌ Failed to send deal alert:', error);
    }
}
async function sendPaymentConfirmationExample(notificationService, userId, paymentData) {
    try {
        await notificationService.sendPaymentConfirmation(userId, {
            amount: paymentData.amount,
            transactionId: paymentData.transactionId,
            paymentDate: new Date().toISOString()
        });
        console.log('✅ Payment confirmation notification sent successfully');
    }
    catch (error) {
        console.error('❌ Failed to send payment confirmation:', error);
    }
}
async function sendCustomNotificationExample(notificationService, userId) {
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
    }
    catch (error) {
        console.error('❌ Failed to create custom notification:', error);
    }
}
async function manageNotificationPreferencesExample(preferenceService, userId) {
    try {
        let preferences = await preferenceService.getOrCreatePreferences(userId);
        console.log('📋 Current preferences:', preferences);
        const updatedPreferences = await preferenceService.updatePreferences(userId, {
            emailNotifications: true,
            pushNotifications: false,
            dealAlerts: true,
            priceDropAlerts: true,
            bookingUpdates: true,
            systemNotifications: false
        });
        console.log('✅ Preferences updated:', updatedPreferences);
        const isDealAlertEnabled = await preferenceService.isNotificationTypeEnabled(userId, 'deal_alert');
        console.log('🔔 Deal alerts enabled:', isDealAlertEnabled);
    }
    catch (error) {
        console.error('❌ Failed to manage preferences:', error);
    }
}
async function handleRealTimeNotificationsExample(webSocketService, userId) {
    try {
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
        await webSocketService.sendUnreadCountUpdate(userId, 3);
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
    }
    catch (error) {
        console.error('❌ Failed to send real-time notifications:', error);
    }
}
async function sendBulkNotificationsExample(notificationService, userIds) {
    try {
        const notifications = await Promise.all(userIds.map(userId => notificationService.createNotification({
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
        })));
        console.log(`✅ Sent ${notifications.length} bulk notifications`);
    }
    catch (error) {
        console.error('❌ Failed to send bulk notifications:', error);
    }
}
async function notificationAnalyticsExample(notificationService, webSocketService, userId) {
    try {
        const notifications = await notificationService.getUserNotifications(userId, 10, 0);
        console.log(`📊 User has ${notifications.length} recent notifications`);
        const unreadCount = await notificationService.getUnreadCount(userId);
        console.log(`📬 Unread notifications: ${unreadCount}`);
        const connectedUsers = webSocketService.getConnectedUsersCount();
        console.log(`🔗 Connected users: ${connectedUsers}`);
        const notificationRooms = await webSocketService.getUsersInNotificationRooms();
        console.log('🏠 Users in notification rooms:', notificationRooms);
    }
    catch (error) {
        console.error('❌ Failed to get notification analytics:', error);
    }
}
async function integrateWithBookingServiceExample(notificationService, bookingData) {
    try {
        switch (bookingData.status) {
            case 'confirmed':
                await notificationService.sendBookingConfirmation(bookingData.userId, bookingData);
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
    }
    catch (error) {
        console.error('❌ Failed to send booking notification:', error);
    }
}
async function integrateWithFlightSearchExample(notificationService, userId, searchData) {
    try {
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
    }
    catch (error) {
        console.error('❌ Failed to process flight search notifications:', error);
    }
}
//# sourceMappingURL=notificationExample.js.map