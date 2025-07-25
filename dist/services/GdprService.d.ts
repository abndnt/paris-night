import { Request } from 'express';
export declare class GdprService {
    exportUserData(userId: string, req: Request): Promise<any>;
    deleteUserData(userId: string, req: Request): Promise<{
        success: boolean;
        message: string;
    }>;
    updateUserConsent(userId: string, consentPreferences: Record<string, boolean>, req: Request): Promise<Record<string, boolean>>;
    getRequestStatus(requestId: string): Promise<{
        status: string;
        type: string;
        createdAt: string;
    }>;
    getUserConsent(userId: string): Promise<Record<string, boolean>>;
    private trackDataRequest;
    private updateRequestStatus;
    private collectUserData;
    private deleteUserDataFromAllServices;
    private saveUserConsent;
    private validateConsentPreferences;
    private getDefaultConsentPreferences;
}
export declare const gdprService: GdprService;
//# sourceMappingURL=GdprService.d.ts.map