"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupErrorTrackingForUser = exports.sentryTracingHandler = exports.sentryRequestHandler = exports.sentryErrorHandler = exports.testErrorTracking = exports.withErrorTracking = exports.startTransaction = exports.setContext = exports.setTag = exports.setUser = exports.addBreadcrumb = exports.captureMessage = exports.captureException = exports.initializeErrorTracking = void 0;
const initializeErrorTracking = () => {
    console.log('📊 Error tracking initialized (simplified mode)');
};
exports.initializeErrorTracking = initializeErrorTracking;
const captureException = (error, context) => {
    console.error('🚨 Exception captured:', error.message, context);
};
exports.captureException = captureException;
const captureMessage = (message, level = 'info') => {
    console.log(`📝 [${level.toUpperCase()}] ${message}`);
};
exports.captureMessage = captureMessage;
const addBreadcrumb = (message, category = 'general', data) => {
    console.log(`🍞 Breadcrumb: [${category}] ${message}`, data);
};
exports.addBreadcrumb = addBreadcrumb;
const setUser = (user) => {
    console.log('👤 User set:', user);
};
exports.setUser = setUser;
const setTag = (key, value) => {
    console.log(`🏷️  Tag set: ${key} = ${value}`);
};
exports.setTag = setTag;
const setContext = (key, context) => {
    console.log(`📋 Context set: ${key}`, context);
};
exports.setContext = setContext;
const startTransaction = (name, operation = 'http') => {
    console.log(`🚀 Transaction started: ${name} (${operation})`);
    return {
        setStatus: (status) => console.log(`📊 Transaction status: ${status}`),
        finish: () => console.log(`✅ Transaction finished: ${name}`)
    };
};
exports.startTransaction = startTransaction;
const withErrorTracking = async (operation, fn) => {
    console.log(`🔄 Starting operation: ${operation}`);
    try {
        const result = await fn();
        console.log(`✅ Operation completed: ${operation}`);
        return result;
    }
    catch (error) {
        console.error(`❌ Operation failed: ${operation}`, error);
        throw error;
    }
};
exports.withErrorTracking = withErrorTracking;
const testErrorTracking = async () => {
    console.log('🧪 Error tracking test completed (simplified mode)');
    return { status: 'ok', message: 'Simplified error tracking is working' };
};
exports.testErrorTracking = testErrorTracking;
const sentryErrorHandler = (error, req, res, next) => {
    console.error('🚨 Error handler:', error.message);
    next(error);
};
exports.sentryErrorHandler = sentryErrorHandler;
const sentryRequestHandler = (req, res, next) => {
    next();
};
exports.sentryRequestHandler = sentryRequestHandler;
const sentryTracingHandler = () => (req, res, next) => {
    next();
};
exports.sentryTracingHandler = sentryTracingHandler;
const setupErrorTrackingForUser = (user) => {
    console.log('👤 Error tracking setup for user:', user);
};
exports.setupErrorTrackingForUser = setupErrorTrackingForUser;
//# sourceMappingURL=errorTracking.simple.js.map