import { Pool } from 'pg';
import { NotificationPreferences } from '../models/Notification';
export declare class NotificationPreferenceService {
    private db;
    constructor(db: Pool);
    getUserPreferences(userId: string): Promise<NotificationPreferences | null>;
    createDefaultPreferences(userId: string): Promise<NotificationPreferences>;
    updatePreferences(userId: string, updates: Partial<Omit<NotificationPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<NotificationPreferences>;
    getOrCreatePreferences(userId: string): Promise<NotificationPreferences>;
    deleteUserPreferences(userId: string): Promise<void>;
    isNotificationTypeEnabled(userId: string, notificationType: string): Promise<boolean>;
}
//# sourceMappingURL=NotificationPreferenceService.d.ts.map