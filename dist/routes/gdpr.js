"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GdprService_1 = require("../services/GdprService");
const enhancedValidation_1 = require("../middleware/enhancedValidation");
const authMiddleware_1 = require("../middleware/authMiddleware");
const errorHandler_1 = require("../middleware/errorHandler");
const auditLogger_1 = require("../utils/auditLogger");
const auditLogger_2 = require("../utils/auditLogger");
const advancedRateLimit_1 = require("../middleware/advancedRateLimit");
const joi_1 = __importDefault(require("joi"));
const router = (0, express_1.Router)();
const consentSchema = joi_1.default.object({
    termsAndConditions: joi_1.default.boolean().required(),
    privacyPolicy: joi_1.default.boolean().required(),
    marketing: joi_1.default.boolean().optional(),
    analytics: joi_1.default.boolean().optional(),
    thirdPartySharing: joi_1.default.boolean().optional(),
});
const requestStatusSchema = joi_1.default.object({
    requestId: joi_1.default.string().uuid().required(),
});
router.get('/data', authMiddleware_1.authMiddleware, advancedRateLimit_1.sensitiveOperationRateLimit, (0, auditLogger_1.auditMiddleware)(auditLogger_2.AuditEventType.DATA_EXPORT_REQUEST, auditLogger_2.AuditEventSeverity.HIGH), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const userData = await GdprService_1.gdprService.exportUserData(userId, req);
    res.json({
        success: true,
        data: userData,
    });
}));
router.delete('/data', authMiddleware_1.authMiddleware, advancedRateLimit_1.sensitiveOperationRateLimit, (0, auditLogger_1.auditMiddleware)(auditLogger_2.AuditEventType.DATA_DELETION_REQUEST, auditLogger_2.AuditEventSeverity.HIGH), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const result = await GdprService_1.gdprService.deleteUserData(userId, req);
    res.json(result);
}));
router.get('/consent', authMiddleware_1.authMiddleware, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const consentPreferences = await GdprService_1.gdprService.getUserConsent(userId);
    res.json({
        success: true,
        data: consentPreferences,
    });
}));
router.put('/consent', authMiddleware_1.authMiddleware, (0, enhancedValidation_1.validateRequest)({ body: consentSchema }), (0, auditLogger_1.auditMiddleware)(auditLogger_2.AuditEventType.CONSENT_GIVEN, auditLogger_2.AuditEventSeverity.MEDIUM), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const consentPreferences = await GdprService_1.gdprService.updateUserConsent(userId, req.body, req);
    res.json({
        success: true,
        data: consentPreferences,
    });
}));
router.get('/request/:requestId', authMiddleware_1.authMiddleware, (0, enhancedValidation_1.validateRequest)({ params: requestStatusSchema }), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { requestId } = req.params;
    const requestStatus = await GdprService_1.gdprService.getRequestStatus(requestId);
    res.json({
        success: true,
        data: requestStatus,
    });
}));
exports.default = router;
//# sourceMappingURL=gdpr.js.map