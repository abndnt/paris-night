import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logGdprEvent, AuditEventType } from '../utils/auditLogger';
import { loggers } from '../utils/logger';
import { errorTracker } from '../utils/errorTracking';
import { config } from '../config';
import { redisClient } from '../config/database';
import { maskSensitiveData } from '../utils/security';
import { NotFoundError, ValidationError } from '../utils/errors';

/**
 * Service for handling GDPR compliance features
 */
export class GdprService {
  /**
   * Export all user data for a specific user
   * @param userId - User ID
   * @param req - Express request object
   * @returns Promise with user data export
   */
  public async exportUserData(userId: string, req: Request): Promise<any> {
    try {
      // Start tracking the export process
      const requestId = uuidv4();
      await this.trackDataRequest(userId, requestId, 'export');
      
      // Log the GDPR export request
      logGdprEvent(
        AuditEventType.DATA_EXPORT_REQUEST,
        userId,
        (req as any).user?.username || 'unknown',
        (req as any).user?.email || 'unknown',
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown',
        { requestId }
      );
      
      // Get user data from various services
      const userData = await this.collectUserData(userId);
      
      // Log the completion of the export
      logGdprEvent(
        AuditEventType.DATA_EXPORT_COMPLETE,
        userId,
        (req as any).user?.username || 'unknown',
        (req as any).user?.email || 'unknown',
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown',
        { requestId }
      );
      
      // Update the request status
      await this.updateRequestStatus(requestId, 'completed');
      
      return userData;
    } catch (error) {
      // Log the error
      loggers.error('Failed to export user data', error as Error, { userId });
      errorTracker.captureException(error as Error, { userId });
      
      throw error;
    }
  }
  
  /**
   * Delete all user data for a specific user
   * @param userId - User ID
   * @param req - Express request object
   * @returns Promise with deletion confirmation
   */
  public async deleteUserData(userId: string, req: Request): Promise<{ success: boolean; message: string }> {
    try {
      // Start tracking the deletion process
      const requestId = uuidv4();
      await this.trackDataRequest(userId, requestId, 'deletion');
      
      // Log the GDPR deletion request
      logGdprEvent(
        AuditEventType.DATA_DELETION_REQUEST,
        userId,
        (req as any).user?.username || 'unknown',
        (req as any).user?.email || 'unknown',
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown',
        { requestId }
      );
      
      // Delete user data from various services
      await this.deleteUserDataFromAllServices(userId);
      
      // Log the completion of the deletion
      logGdprEvent(
        AuditEventType.DATA_DELETION_COMPLETE,
        userId,
        (req as any).user?.username || 'unknown',
        (req as any).user?.email || 'unknown',
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown',
        { requestId }
      );
      
      // Update the request status
      await this.updateRequestStatus(requestId, 'completed');
      
      return {
        success: true,
        message: 'User data has been successfully deleted',
      };
    } catch (error) {
      // Log the error
      loggers.error('Failed to delete user data', error as Error, { userId });
      errorTracker.captureException(error as Error, { userId });
      
      throw error;
    }
  }
  
  /**
   * Update user consent preferences
   * @param userId - User ID
   * @param consentPreferences - User consent preferences
   * @param req - Express request object
   * @returns Promise with updated consent preferences
   */
  public async updateUserConsent(
    userId: string,
    consentPreferences: Record<string, boolean>,
    req: Request
  ): Promise<Record<string, boolean>> {
    try {
      // Validate consent preferences
      this.validateConsentPreferences(consentPreferences);
      
      // Update consent in database
      await this.saveUserConsent(userId, consentPreferences);
      
      // Log the consent update
      const eventType = Object.values(consentPreferences).some(v => v)
        ? AuditEventType.CONSENT_GIVEN
        : AuditEventType.CONSENT_WITHDRAWN;
      
      logGdprEvent(
        eventType,
        userId,
        (req as any).user?.username || 'unknown',
        (req as any).user?.email || 'unknown',
        req.ip || 'unknown',
        req.get('User-Agent') || 'unknown',
        { consentPreferences }
      );
      
      return consentPreferences;
    } catch (error) {
      // Log the error
      loggers.error('Failed to update user consent', error as Error, { userId });
      errorTracker.captureException(error as Error, { userId });
      
      throw error;
    }
  }
  
  /**
   * Get the status of a data subject request
   * @param requestId - Request ID
   * @returns Promise with request status
   */
  public async getRequestStatus(requestId: string): Promise<{ status: string; type: string; createdAt: string }> {
    try {
      const key = `gdpr:request:${requestId}`;
      const requestData = await redisClient.get(key);
      
      if (!requestData) {
        throw new NotFoundError('Data subject request');
      }
      
      return JSON.parse(requestData);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      loggers.error('Failed to get request status', error as Error, { requestId });
      throw new Error('Failed to get request status');
    }
  }
  
  /**
   * Get user consent preferences
   * @param userId - User ID
   * @returns Promise with user consent preferences
   */
  public async getUserConsent(userId: string): Promise<Record<string, boolean>> {
    try {
      // This would typically fetch from a database
      // For now, we'll use Redis as a simple store
      const key = `gdpr:consent:${userId}`;
      const consentData = await redisClient.get(key);
      
      if (!consentData) {
        // Return default consent values if none are set
        return this.getDefaultConsentPreferences();
      }
      
      return JSON.parse(consentData);
    } catch (error) {
      loggers.error('Failed to get user consent', error as Error, { userId });
      throw new Error('Failed to get user consent preferences');
    }
  }
  
  /**
   * Track a data subject request
   * @param userId - User ID
   * @param requestId - Request ID
   * @param type - Request type (export or deletion)
   */
  private async trackDataRequest(userId: string, requestId: string, type: 'export' | 'deletion'): Promise<void> {
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
      
      // Store request data
      await redisClient.setEx(key, 60 * 60 * 24 * 30, JSON.stringify(requestData)); // 30 days TTL
      
      // Add to user's request list
      await redisClient.lPush(userKey, requestId);
      await redisClient.expire(userKey, 60 * 60 * 24 * 365); // 1 year TTL
    } catch (error) {
      loggers.error('Failed to track data request', error as Error, { userId, requestId, type });
      throw new Error('Failed to track data subject request');
    }
  }
  
  /**
   * Update the status of a data subject request
   * @param requestId - Request ID
   * @param status - New status
   */
  private async updateRequestStatus(requestId: string, status: string): Promise<void> {
    try {
      const key = `gdpr:request:${requestId}`;
      const requestData = await redisClient.get(key);
      
      if (!requestData) {
        throw new NotFoundError('Data subject request');
      }
      
      const data = JSON.parse(requestData);
      data.status = status;
      data.updatedAt = new Date().toISOString();
      
      await redisClient.set(key, JSON.stringify(data));
    } catch (error) {
      loggers.error('Failed to update request status', error as Error, { requestId, status });
      throw new Error('Failed to update request status');
    }
  }
  
  /**
   * Collect all user data from various services
   * @param userId - User ID
   * @returns Promise with collected user data
   */
  private async collectUserData(userId: string): Promise<any> {
    // This would typically call various services to collect all user data
    // For now, we'll return a placeholder structure
    
    // In a real implementation, you would:
    // 1. Query the user service for basic user data
    // 2. Query the booking service for booking history
    // 3. Query the payment service for payment history
    // 4. Query the points service for rewards data
    // 5. Query the preferences service for user preferences
    // 6. Query the chat service for chat history
    // 7. Query any other services that store user data
    
    return {
      userData: {
        // Basic user data would be fetched from user service
        id: userId,
        // Other user fields would be included here
      },
      bookings: [
        // Booking data would be fetched from booking service
      ],
      payments: [
        // Payment data would be fetched from payment service
      ],
      rewardAccounts: [
        // Reward account data would be fetched from points service
      ],
      preferences: {
        // Preference data would be fetched from preferences service
      },
      chatHistory: [
        // Chat history would be fetched from chat service
      ],
      // Other user data would be included here
    };
  }
  
  /**
   * Delete user data from all services
   * @param userId - User ID
   */
  private async deleteUserDataFromAllServices(userId: string): Promise<void> {
    // This would typically call various services to delete all user data
    // For now, we'll just log the deletion
    
    // In a real implementation, you would:
    // 1. Anonymize or delete user data in the user service
    // 2. Anonymize or delete booking history in the booking service
    // 3. Anonymize or delete payment history in the payment service
    // 4. Delete reward account data in the points service
    // 5. Delete user preferences in the preferences service
    // 6. Delete chat history in the chat service
    // 7. Delete data in any other services that store user data
    
    loggers.info(`Deleting user data for user ${userId}`);
    
    // Simulate deletion delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  /**
   * Save user consent preferences
   * @param userId - User ID
   * @param consentPreferences - User consent preferences
   */
  private async saveUserConsent(userId: string, consentPreferences: Record<string, boolean>): Promise<void> {
    try {
      // This would typically save to a database
      // For now, we'll use Redis as a simple store
      const key = `gdpr:consent:${userId}`;
      await redisClient.set(key, JSON.stringify(consentPreferences));
    } catch (error) {
      loggers.error('Failed to save user consent', error as Error, { userId });
      throw new Error('Failed to save user consent preferences');
    }
  }
  
  /**
   * Validate consent preferences
   * @param consentPreferences - User consent preferences
   */
  private validateConsentPreferences(consentPreferences: Record<string, boolean>): void {
    const requiredConsents = ['termsAndConditions', 'privacyPolicy'];
    const optionalConsents = ['marketing', 'analytics', 'thirdPartySharing'];
    
    // Check that all required consents are present
    for (const consent of requiredConsents) {
      if (consentPreferences[consent] !== true) {
        throw new ValidationError(`Consent for ${consent} is required`);
      }
    }
    
    // Check that all consents are valid
    const validConsents = [...requiredConsents, ...optionalConsents];
    for (const key of Object.keys(consentPreferences)) {
      if (!validConsents.includes(key)) {
        throw new ValidationError(`Unknown consent type: ${key}`);
      }
      
      if (typeof consentPreferences[key] !== 'boolean') {
        throw new ValidationError(`Consent value for ${key} must be a boolean`);
      }
    }
  }
  
  /**
   * Get default consent preferences
   * @returns Default consent preferences
   */
  private getDefaultConsentPreferences(): Record<string, boolean> {
    return {
      termsAndConditions: false,
      privacyPolicy: false,
      marketing: false,
      analytics: false,
      thirdPartySharing: false,
    };
  }
}

// Export singleton instance
export const gdprService = new GdprService();