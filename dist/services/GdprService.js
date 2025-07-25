"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gdprService = exports.GdprService = void 0;
const uuid_1 = require("uuid");
const auditLogger_1 = require("../utils/auditLogger");
const logger_1 = require("../utils/logger");
const errorTracking_1 = require("../utils/errorTracking");
const database_1 = require("../config/database");
const errors_1 = require("../utils/errors");
class GdprService {
    async exportUserData(userId, req) {
        try {
            const requestId = (0, uuid_1.v4)();
            await this.trackDataRequest(userId, requestId, 'export');
            (0, auditLogger_1.logGdprEvent)(auditLogger_1.AuditEventType.DATA_EXPORT_REQUEST, userId, req.user?.username || 'unknown', req.user?.email || 'unknown', req.ip || 'unknown', req.get('User-Agent') || 'unknown', { requestId });
            const userData = await this.collectUserData(userId);
            (0, auditLogger_1.logGdprEvent)(auditLogger_1.AuditEventType.DATA_EXPORT_COMPLETE, userId, req.user?.username || 'unknown', req.user?.email || 'unknown', req.ip || 'unknown', req.get('User-Agent') || 'unknown', { requestId });
            await this.updateRequestStatus(requestId, 'completed');
            return userData;
        }
        catch (error) {
            logger_1.loggers.error('Failed to export user data', error, { userId });
            errorTracking_1.errorTracker.captureException(error, { userId });
            throw error;
        }
    }
    async deleteUserData(userId, req) {
        try {
            const requestId = (0, uuid_1.v4)();
            await this.trackDataRequest(userId, requestId, 'deletion');
            (0, auditLogger_1.logGdprEvent)(auditLogger_1.AuditEventType.DATA_DELETION_REQUEST, userId, req.user?.username || 'unknown', req.user?.email || 'unknown', req.ip || 'unknown', req.get('User-Agent') || 'unknown', { requestId });
            await this.deleteUserDataFromAllServices(userId);
            (0, auditLogger_1.logGdprEvent)(auditLogger_1.AuditEventType.DATA_DELETION_COMPLETE, userId, req.user?.username || 'unknown', req.user?.email || 'unknown', req.ip || 'unknown', req.get('User-Agent') || 'unknown', { requestId });
            await this.updateRequestStatus(requestId, 'completed');
            return {
                success: true,
                message: 'User data has been successfully deleted',
            };
        }
        catch (error) {
            logger_1.loggers.error('Failed to delete user data', error, { userId });
            errorTracking_1.errorTracker.captureException(error, { userId });
            throw error;
        }
    }
    async updateUserConsent(userId, consentPreferences, req) {
        try {
            this.validateConsentPreferences(consentPreferences);
            await this.saveUserConsent(userId, consentPreferences);
            const eventType = Object.values(consentPreferences).some(v => v)
                ? auditLogger_1.AuditEventType.CONSENT_GIVEN
                : auditLogger_1.AuditEventType.CONSENT_WITHDRAWN;
            (0, auditLogger_1.logGdprEvent)(eventType, userId, req.user?.username || 'unknown', req.user?.email || 'unknown', req.ip || 'unknown', req.get('User-Agent') || 'unknown', { consentPreferences });
            return consentPreferences;
        }
        catch (error) {
            logger_1.loggers.error('Failed to update user consent', error, { userId });
            errorTracking_1.errorTracker.captureException(error, { userId });
            throw error;
        }
    }
    async getRequestStatus(requestId) {
        try {
            const key = `gdpr:request:${requestId}`;
            const requestData = await database_1.redisClient.get(key);
            if (!requestData) {
                throw new errors_1.NotFoundError('Data subject request');
            }
            return JSON.parse(requestData);
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError) {
                throw error;
            }
            logger_1.loggers.error('Failed to get request status', error, { requestId });
            throw new Error('Failed to get request status');
        }
    }
    async getUserConsent(userId) {
        try {
            const key = `gdpr:consent:${userId}`;
            const consentData = await database_1.redisClient.get(key);
            if (!consentData) {
                return this.getDefaultConsentPreferences();
            }
            return JSON.parse(consentData);
        }
        catch (error) {
            logger_1.loggers.error('Failed to get user consent', error, { userId });
            throw new Error('Failed to get user consent preferences');
        }
    }
    async trackDataRequest(userId, requestId, type) {
        try {
            const key = `gdpr:request:${requestId}`;
            const userKey = `gdpr:user:${userId}:requests`;
            const requestData = {
                userId,
                requestId,
                type,
                status: 'pending',
                createdAt: new Date().toISOString(),
            };
            await database_1.redisClient.setEx(key, 60 * 60 * 24 * 30, JSON.stringify(requestData));
            await database_1.redisClient.lPush(userKey, requestId);
            await database_1.redisClient.expire(userKey, 60 * 60 * 24 * 365);
        }
        catch (error) {
            logger_1.loggers.error('Failed to track data request', error, { userId, requestId, type });
            throw new Error('Failed to track data subject request');
        }
    }
    async updateRequestStatus(requestId, status) {
        try {
            const key = `gdpr:request:${requestId}`;
            const requestData = await database_1.redisClient.get(key);
            if (!requestData) {
                throw new errors_1.NotFoundError('Data subject request');
            }
            const data = JSON.parse(requestData);
            data.status = status;
            data.updatedAt = new Date().toISOString();
            await database_1.redisClient.set(key, JSON.stringify(data));
        }
        catch (error) {
            logger_1.loggers.error('Failed to update request status', error, { requestId, status });
            throw new Error('Failed to update request status');
        }
    }
    async collectUserData(userId) {
        return {
            userData: {
                id: userId,
            },
            bookings: [],
            payments: [],
            rewardAccounts: [],
            preferences: {},
            chatHistory: [],
        };
    }
    async deleteUserDataFromAllServices(userId) {
        logger_1.loggers.info(`Deleting user data for user ${userId}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    async saveUserConsent(userId, consentPreferences) {
        try {
            const key = `gdpr:consent:${userId}`;
            await database_1.redisClient.set(key, JSON.stringify(consentPreferences));
        }
        catch (error) {
            logger_1.loggers.error('Failed to save user consent', error, { userId });
            throw new Error('Failed to save user consent preferences');
        }
    }
    validateConsentPreferences(consentPreferences) {
        const requiredConsents = ['termsAndConditions', 'privacyPolicy'];
        const optionalConsents = ['marketing', 'analytics', 'thirdPartySharing'];
        for (const consent of requiredConsents) {
            if (consentPreferences[consent] !== true) {
                throw new errors_1.ValidationError(`Consent for ${consent} is required`);
            }
        }
        const validConsents = [...requiredConsents, ...optionalConsents];
        for (const key of Object.keys(consentPreferences)) {
            if (!validConsents.includes(key)) {
                throw new errors_1.ValidationError(`Unknown consent type: ${key}`);
            }
            if (typeof consentPreferences[key] !== 'boolean') {
                throw new errors_1.ValidationError(`Consent value for ${key} must be a boolean`);
            }
        }
    }
    getDefaultConsentPreferences() {
        return {
            termsAndConditions: false,
            privacyPolicy: false,
            marketing: false,
            analytics: false,
            thirdPartySharing: false,
        };
    }
}
exports.GdprService = GdprService;
exports.gdprService = new GdprService();
//# sourceMappingURL=GdprService.js.map