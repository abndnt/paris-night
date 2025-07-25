"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRouter = createRouter;
const express_1 = require("express");
const health_1 = __importDefault(require("./health"));
const auth_1 = __importDefault(require("./auth"));
const chat_1 = __importDefault(require("./chat"));
const flightSearch_1 = __importDefault(require("./flightSearch"));
const advancedRouting_1 = __importDefault(require("./advancedRouting"));
const payment_1 = require("./payment");
const preferences_1 = require("./preferences");
const notifications_1 = require("./notifications");
const admin_1 = __importDefault(require("./admin"));
const gdpr_1 = __importDefault(require("./gdpr"));
function createRouter(db, io) {
    const router = (0, express_1.Router)();
    router.use(health_1.default);
    router.use('/auth', auth_1.default);
    router.use('/chat', chat_1.default);
    router.use('/flights', flightSearch_1.default);
    router.use('/advanced-routing', advancedRouting_1.default);
    router.use('/payment', payment_1.paymentRouter);
    router.use('/preferences', (0, preferences_1.createPreferencesRouter)(db));
    router.use('/notifications', (0, notifications_1.createNotificationRoutes)(db, io));
    router.use('/admin', admin_1.default);
    router.use('/gdpr', gdpr_1.default);
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
const router = createRouter({});
exports.default = router;
//# sourceMappingURL=index.js.map