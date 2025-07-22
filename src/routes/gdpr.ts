import { Router, Request, Response, NextFunction } from 'express';
import { gdprService } from '../services/GdprService';
import { validateRequest, commonValidationSchemas } from '../middleware/enhancedValidation';
import { authMiddleware } from '../middleware/authMiddleware';
import { asyncHandler } from '../middleware/errorHandler';
import { auditMiddleware } from '../utils/auditLogger';
import { AuditEventType, AuditEventSeverity } from '../utils/auditLogger';
import { sensitiveOperationRateLimit } from '../middleware/advancedRateLimit';
import Joi from 'joi';

const router = Router();

// Validation schemas
const consentSchema = Joi.object({
  termsAndConditions: Joi.boolean().required(),
  privacyPolicy: Joi.boolean().required(),
  marketing: Joi.boolean().optional(),
  analytics: Joi.boolean().optional(),
  thirdPartySharing: Joi.boolean().optional(),
});

const requestStatusSchema = Joi.object({
  requestId: Joi.string().uuid().required(),
});

/**
 * @route GET /api/gdpr/data
 * @desc Export all user data (GDPR data portability)
 * @access Private
 */
router.get(
  '/data',
  authMiddleware,
  sensitiveOperationRateLimit,
  auditMiddleware(AuditEventType.DATA_EXPORT_REQUEST, AuditEventSeverity.HIGH),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const userData = await gdprService.exportUserData(userId, req);
    
    res.json({
      success: true,
      data: userData,
    });
  })
);

/**
 * @route DELETE /api/gdpr/data
 * @desc Delete all user data (GDPR right to be forgotten)
 * @access Private
 */
router.delete(
  '/data',
  authMiddleware,
  sensitiveOperationRateLimit,
  auditMiddleware(AuditEventType.DATA_DELETION_REQUEST, AuditEventSeverity.HIGH),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const result = await gdprService.deleteUserData(userId, req);
    
    res.json(result);
  })
);

/**
 * @route GET /api/gdpr/consent
 * @desc Get user consent preferences
 * @access Private
 */
router.get(
  '/consent',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const consentPreferences = await gdprService.getUserConsent(userId);
    
    res.json({
      success: true,
      data: consentPreferences,
    });
  })
);

/**
 * @route PUT /api/gdpr/consent
 * @desc Update user consent preferences
 * @access Private
 */
router.put(
  '/consent',
  authMiddleware,
  validateRequest({ body: consentSchema }),
  auditMiddleware(AuditEventType.CONSENT_GIVEN, AuditEventSeverity.MEDIUM),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const consentPreferences = await gdprService.updateUserConsent(userId, req.body, req);
    
    res.json({
      success: true,
      data: consentPreferences,
    });
  })
);

/**
 * @route GET /api/gdpr/request/:requestId
 * @desc Get status of a data subject request
 * @access Private
 */
router.get(
  '/request/:requestId',
  authMiddleware,
  validateRequest({ params: requestStatusSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { requestId } = req.params;
    const requestStatus = await gdprService.getRequestStatus(requestId);
    
    res.json({
      success: true,
      data: requestStatus,
    });
  })
);

export default router;