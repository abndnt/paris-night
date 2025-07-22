import { Router } from 'express';
import { Pool } from 'pg';
import { Server as SocketIOServer } from 'socket.io';
import healthRoutes from './health';
import authRoutes from './auth';
import chatRoutes from './chat';
import flightSearchRoutes from './flightSearch';
import advancedRoutingRoutes from './advancedRouting';
import { paymentRouter } from './payment';
import { createPreferencesRouter } from './preferences';
import { createNotificationRoutes } from './notifications';
import adminRoutes from './admin';
import gdprRoutes from './gdpr';

export function createRouter(db: Pool, io?: SocketIOServer): Router {
  const router = Router();

  // Mount health routes
  router.use(healthRoutes);

  // Mount auth routes
  router.use('/auth', authRoutes);

  // Mount chat routes
  router.use('/chat', chatRoutes);

  // Mount flight search routes
  router.use('/flights', flightSearchRoutes);

  // Mount advanced routing routes
  router.use('/advanced-routing', advancedRoutingRoutes);

  // Mount payment routes
  router.use('/payment', paymentRouter);

  // Mount preferences routes
  router.use('/preferences', createPreferencesRouter(db));

  // Mount notification routes
  router.use('/notifications', createNotificationRoutes(db, io));
  
  // Mount admin routes
  router.use('/admin', adminRoutes);
  
  // Mount GDPR routes
  router.use('/gdpr', gdprRoutes);

  // API version info
  router.get('/', (_req, res) => {
    res.json({
      name: 'Flight Search SaaS API',
      version: '1.0.0',
      description: 'AI-powered flight search platform with points optimization',
      endpoints: {
        health: '/health',
        ready: '/ready',
        live: '/live',
        auth: {
          register: '/auth/register',
          login: '/auth/login',
          profile: '/auth/profile',
          verify: '/auth/verify',
        },
        chat: {
          sessions: '/chat/sessions',
          messages: '/chat/sessions/:sessionId/messages',
          analyze: '/chat/analyze',
        },
        flights: {
          searches: '/flights/searches',
          search: '/flights/searches/:searchId',
          filter: '/flights/searches/:searchId/filter',
          sort: '/flights/searches/:searchId/sort',
          validate: '/flights/validate',
          cleanup: '/flights/expired',
        },
        advancedRouting: {
          enhancedSearch: '/advanced-routing/enhanced-search',
          positioning: '/advanced-routing/searches/:searchId/positioning',
          optimize: '/advanced-routing/searches/:searchId/optimize',
          advancedFilter: '/advanced-routing/searches/:searchId/advanced-filter',
          multiCity: '/advanced-routing/multi-city-search',
          analytics: '/advanced-routing/searches/:searchId/analytics',
          allAnalytics: '/advanced-routing/analytics/all',
          filterOptions: '/advanced-routing/searches/:searchId/filter-options',
          health: '/advanced-routing/health',
        },
        payment: {
          intents: '/payment/intents',
          confirm: '/payment/intents/:id/confirm',
          refund: '/payment/intents/:id/refund',
          transactions: '/payment/bookings/:bookingId/transactions',
          webhooks: '/payment/webhooks/stripe',
          health: '/payment/health',
        },
        preferences: {
          get: '/preferences',
          create: '/preferences',
          update: '/preferences',
          delete: '/preferences',
          recommendations: '/preferences/recommendations',
          learn: '/preferences/learn',
          insights: '/preferences/insights',
          filter: '/preferences/filter-results',
          searchRecommendations: '/preferences/search-recommendations',
        },
        notifications: {
          list: '/notifications',
          markRead: '/notifications/:id/read',
          markAllRead: '/notifications/read-all',
          unreadCount: '/notifications/unread-count',
          preferences: '/notifications/preferences',
          test: '/notifications/test',
        },
        admin: {
          dashboard: '/admin/analytics/dashboard',
          userActivity: '/admin/analytics/user-activity/:userId',
          errors: '/admin/analytics/errors',
          errorUpdate: '/admin/analytics/errors/:errorId',
          performance: '/admin/analytics/performance',
          systemHealth: '/admin/system/health',
        },
        gdpr: {
          data: '/gdpr/data',
          deleteData: '/gdpr/data',
          consent: '/gdpr/consent',
          requestStatus: '/gdpr/request/:requestId',
        },
      },
    });
  });

  return router;
}

const router = createRouter({} as Pool); // Default export for backward compatibility
export default router;